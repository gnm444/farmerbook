import copy
import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from farmerbook_greeter.memory_bank import (
    API_VERSION,
    APPROVED_RESOURCE_NAME,
    GENERATION_MODEL_ID,
    MEMORY_TTL,
    UPDATE_MASK,
    VERIFIED_RESOURCE_ALIAS,
    api_url,
    apply_approved_memory_bank_config,
    approved_memory_bank_config,
    assert_optional_capture_off,
    canonical_resource_name,
    main,
    operation_url,
    patch_body,
    protected_fingerprint,
)


class FakeResponse:
    def __init__(self, payload=None, status_code=200):
        self.payload = payload
        self.status_code = status_code
        self.content = b"" if payload is None else json.dumps(payload).encode("utf-8")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self.payload


class ScriptedSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def request(self, method, url, **kwargs):
        self.calls.append({"method": method, "url": url, **kwargs})
        if not self.responses:
            raise AssertionError(f"unexpected request: {method} {url}")
        return self.responses.pop(0)


def resource(memory_config=None, **overrides):
    value = {
        "name": APPROVED_RESOURCE_NAME,
        "displayName": "FarmerBook website greeter canary",
        "spec": {
            "deploymentSpec": {
                "minInstances": 0,
                "maxInstances": 1,
                "env": {
                    "GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY": "false",
                },
            }
        },
        "contextSpec": {"memoryBankConfig": memory_config or {}},
        "trafficConfig": None,
        "etag": "etag-before",
        "updateTime": "before",
    }
    value.update(overrides)
    return value


class MemoryBankConfigurationTests(unittest.TestCase):
    def test_memory_bank_patch_is_exact_and_config_only(self) -> None:
        config = approved_memory_bank_config()
        self.assertEqual(API_VERSION, "v1beta1")
        self.assertEqual(UPDATE_MASK, "contextSpec.memoryBankConfig")
        self.assertEqual(
            patch_body(),
            {
                "name": APPROVED_RESOURCE_NAME,
                "contextSpec": {"memoryBankConfig": config},
            },
        )
        self.assertTrue(
            config["generationConfig"]["model"].endswith(f"/{GENERATION_MODEL_ID}")
        )
        self.assertTrue(
            config["similaritySearchConfig"]["embeddingModel"].endswith(
                "/text-multilingual-embedding-002"
            )
        )
        self.assertEqual(
            config["ttlConfig"],
            {
                "defaultTtl": MEMORY_TTL,
                "memoryRevisionDefaultTtl": MEMORY_TTL,
            },
        )
        self.assertNotIn("disableMemoryRevisions", config)
        self.assertEqual(
            config["customizationConfigs"],
            [
                {
                    "scopeKeys": ["user_id"],
                    "memoryTopics": [
                        {
                            "managedMemoryTopic": {
                                "managedTopicEnum": "USER_PREFERENCES",
                            },
                        },
                        {
                            "managedMemoryTopic": {
                                "managedTopicEnum": "EXPLICIT_INSTRUCTIONS",
                            },
                        },
                    ],
                    "consolidationConfig": {"revisionsPerCandidateCount": 1},
                },
            ],
        )
        self.assertEqual(set(patch_body()), {"name", "contextSpec"})

    def test_verified_project_id_alias_normalizes_to_numeric_resource(self) -> None:
        self.assertEqual(api_url(VERIFIED_RESOURCE_ALIAS), api_url(APPROVED_RESOURCE_NAME))
        self.assertEqual(
            patch_body(resource_name=VERIFIED_RESOURCE_ALIAS)["name"],
            APPROVED_RESOURCE_NAME,
        )

    def test_every_other_resource_spelling_is_rejected(self) -> None:
        invalid_names = [
            None,
            659765383594,
            APPROVED_RESOURCE_NAME.replace("659765383594", "999"),
            APPROVED_RESOURCE_NAME.replace("us-central1", "us-east1"),
            APPROVED_RESOURCE_NAME.replace("2785816668377448448", "999"),
            f"{APPROVED_RESOURCE_NAME}/",
            f"{APPROVED_RESOURCE_NAME}?updateMask=spec",
            f"{APPROVED_RESOURCE_NAME}#fragment",
        ]
        for invalid_name in invalid_names:
            with self.subTest(resource_name=invalid_name):
                with self.assertRaisesRegex(ValueError, "not the approved"):
                    canonical_resource_name(invalid_name)

    def test_default_cli_is_network_free(self) -> None:
        output = io.StringIO()
        with patch(
            "farmerbook_greeter.memory_bank.apply_approved_memory_bank_config",
            side_effect=AssertionError("live apply must not run"),
        ):
            with redirect_stdout(output):
                self.assertEqual(main([]), 0)
        payload = json.loads(output.getvalue())
        self.assertEqual(payload["action"], "dry-run")
        self.assertEqual(payload["resourceName"], APPROVED_RESOURCE_NAME)

    def test_protected_fingerprint_ignores_only_approved_leaf_and_metadata(self) -> None:
        before = resource()
        after = resource(
            approved_memory_bank_config(),
            etag="etag-after",
            updateTime="after",
        )
        changed_sibling = copy.deepcopy(after)
        changed_sibling["contextSpec"]["sessionConfig"] = {"sessionTtl": "7200s"}
        changed_scaling = copy.deepcopy(after)
        changed_scaling["spec"]["deploymentSpec"]["minInstances"] = 1

        self.assertEqual(protected_fingerprint(before), protected_fingerprint(after))
        self.assertNotEqual(
            protected_fingerprint(before), protected_fingerprint(changed_sibling)
        )
        self.assertNotEqual(
            protected_fingerprint(before), protected_fingerprint(changed_scaling)
        )

    def test_optional_capture_must_be_absent_or_explicitly_off(self) -> None:
        self.assertEqual(
            assert_optional_capture_off({"spec": {}}),
            {"assertedOff": True, "configuredControlCount": 0},
        )
        off = resource()
        off["spec"]["deploymentSpec"]["enableContentCapture"] = False
        self.assertEqual(
            assert_optional_capture_off(off)["configuredControlCount"],
            2,
        )

        enabled = resource()
        enabled["spec"]["deploymentSpec"]["env"][
            "GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_CONTENT_CAPTURE"
        ] = "true"
        with self.assertRaisesRegex(RuntimeError, "not off"):
            assert_optional_capture_off(enabled)

        ambiguous = resource()
        ambiguous["spec"]["deploymentSpec"]["telemetry_enabled"] = None
        with self.assertRaisesRegex(RuntimeError, "not off"):
            assert_optional_capture_off(ambiguous)

    def test_apply_uses_exact_get_patch_lro_and_readback_contract(self) -> None:
        before = resource()
        after = resource(
            approved_memory_bank_config(),
            etag="etag-after",
            updateTime="after",
        )
        operation_name = f"{APPROVED_RESOURCE_NAME}/operations/configure-1"
        session = ScriptedSession(
            [
                FakeResponse(before),
                FakeResponse({"name": operation_name}),
                FakeResponse({"name": operation_name, "done": True, "response": {}}),
                FakeResponse(after),
            ]
        )

        result = apply_approved_memory_bank_config(
            resource_name=VERIFIED_RESOURCE_ALIAS,
            session=session,
            sleep_fn=lambda _seconds: None,
        )

        self.assertEqual(result["resourceName"], APPROVED_RESOURCE_NAME)
        self.assertEqual(session.responses, [])
        self.assertEqual(
            [(call["method"], call["url"]) for call in session.calls],
            [
                ("GET", api_url(APPROVED_RESOURCE_NAME)),
                ("PATCH", api_url(APPROVED_RESOURCE_NAME)),
                ("GET", operation_url(operation_name)),
                ("GET", api_url(APPROVED_RESOURCE_NAME)),
            ],
        )
        patch_call = session.calls[1]
        self.assertEqual(patch_call["params"], {"updateMask": UPDATE_MASK})
        self.assertEqual(
            patch_call["json"],
            patch_body("etag-before", resource_name=APPROVED_RESOURCE_NAME),
        )
        self.assertNotIn("trafficConfig", patch_call["json"])
        self.assertNotIn("spec", patch_call["json"])

    def test_apply_rejects_non_memory_readback_change(self) -> None:
        before = resource()
        after = resource(
            approved_memory_bank_config(),
            displayName="unexpected rename",
            etag="etag-after",
            updateTime="after",
        )
        operation_name = f"{APPROVED_RESOURCE_NAME}/operations/configure-2"
        session = ScriptedSession(
            [
                FakeResponse(before),
                FakeResponse({"name": operation_name, "done": True, "response": {}}),
                FakeResponse(after),
            ]
        )

        with self.assertRaisesRegex(RuntimeError, "non-Memory-Bank"):
            apply_approved_memory_bank_config(
                session=session,
                sleep_fn=lambda _seconds: None,
            )

    def test_apply_accepts_completion_on_final_bounded_lro_poll(self) -> None:
        before = resource()
        after = resource(
            approved_memory_bank_config(),
            etag="etag-after",
            updateTime="after",
        )
        operation_name = f"{APPROVED_RESOURCE_NAME}/operations/configure-final"
        session = ScriptedSession(
            [
                FakeResponse(before),
                FakeResponse({"name": operation_name}),
                FakeResponse({"name": operation_name, "done": True, "response": {}}),
                FakeResponse(after),
            ]
        )

        with patch("farmerbook_greeter.memory_bank.MAX_OPERATION_POLLS", 1):
            result = apply_approved_memory_bank_config(
                session=session,
                sleep_fn=lambda _seconds: None,
            )

        self.assertEqual(result["resourceName"], APPROVED_RESOURCE_NAME)
        self.assertEqual(session.responses, [])

    def test_apply_without_optional_etag_stays_leaf_only(self) -> None:
        before = resource()
        before.pop("etag")
        after = resource(
            approved_memory_bank_config(),
            updateTime="after",
        )
        after.pop("etag")
        operation_name = f"{APPROVED_RESOURCE_NAME}/operations/configure-no-etag"
        session = ScriptedSession(
            [
                FakeResponse(before),
                FakeResponse({"name": operation_name, "done": True, "response": {}}),
                FakeResponse(after),
            ]
        )

        apply_approved_memory_bank_config(
            session=session,
            sleep_fn=lambda _seconds: None,
        )

        self.assertNotIn("etag", session.calls[1]["json"])
        self.assertEqual(session.calls[1]["params"], {"updateMask": UPDATE_MASK})
        self.assertEqual(set(session.calls[1]["json"]), {"name", "contextSpec"})

    def test_operation_url_rejects_other_project_or_engine(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "outside the approved canary"):
            operation_url(
                "projects/999/locations/us-central1/operations/not-approved"
            )
        with self.assertRaisesRegex(RuntimeError, "outside the approved canary"):
            operation_url(
                "projects/659765383594/locations/us-central1/"
                "reasoningEngines/999/operations/not-approved"
            )

    def test_apply_rejects_immediate_done_operation_for_wrong_parent(self) -> None:
        before = resource()
        wrong_parent_operation = (
            "projects/659765383594/locations/us-central1/operations/wrong-parent"
        )
        session = ScriptedSession(
            [
                FakeResponse(before),
                FakeResponse(
                    {
                        "name": wrong_parent_operation,
                        "done": True,
                        "response": {},
                    }
                ),
            ]
        )

        with self.assertRaisesRegex(RuntimeError, "unexpected resource"):
            apply_approved_memory_bank_config(
                session=session,
                sleep_fn=lambda _seconds: None,
            )
        self.assertEqual(len(session.calls), 2)

    def test_apply_rejects_changed_or_empty_error_lro_payload(self) -> None:
        before = resource()
        operation_name = f"{APPROVED_RESOURCE_NAME}/operations/configure-stable"
        changed_name = f"{APPROVED_RESOURCE_NAME}/operations/configure-other"
        changed_session = ScriptedSession(
            [
                FakeResponse(before),
                FakeResponse({"name": operation_name}),
                FakeResponse({"name": changed_name, "done": True, "response": {}}),
            ]
        )
        with self.assertRaisesRegex(RuntimeError, "identity changed"):
            apply_approved_memory_bank_config(
                session=changed_session,
                sleep_fn=lambda _seconds: None,
            )

        error_session = ScriptedSession(
            [
                FakeResponse(before),
                FakeResponse({"name": operation_name, "done": True, "error": {}}),
            ]
        )
        with self.assertRaisesRegex(RuntimeError, "operation failed"):
            apply_approved_memory_bank_config(
                session=error_session,
                sleep_fn=lambda _seconds: None,
            )


if __name__ == "__main__":
    unittest.main()
