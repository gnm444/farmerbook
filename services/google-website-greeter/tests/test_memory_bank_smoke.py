import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from app.memory_bank import APPROVED_RESOURCE_NAME, api_url, approved_memory_bank_config
from app.memory_bank_smoke import (
    SCOPE_PREFIX,
    _all_memory_names,
    _cleanup_memories,
    _memory_api_url,
    _wait_operation,
    dry_run,
    generate_body,
    memory_action_url,
    main,
    run_live_smoke,
    similarity_retrieve_body,
    simple_retrieve_body,
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
        response = self.responses.pop(0)
        if isinstance(response, BaseException):
            raise response
        return response


SCOPE_ID = f"{SCOPE_PREFIX}00000000-0000-0000-0000-000000000001"
MEMORY_NAME = f"{APPROVED_RESOURCE_NAME}/memories/proof-memory-1"
GENERATION_OPERATION = f"{APPROVED_RESOURCE_NAME}/operations/generate-1"
DELETE_OPERATION = f"{MEMORY_NAME}/operations/delete-memory-1"


def active_resource():
    return {
        "name": APPROVED_RESOURCE_NAME,
        "contextSpec": {"memoryBankConfig": approved_memory_bank_config()},
        "spec": {"deploymentSpec": {"minInstances": 0, "maxInstances": 1}},
    }


def retrieved(name=MEMORY_NAME, scope_id=SCOPE_ID):
    return {
        "retrievedMemories": [
            {
                "memory": {
                    "name": name,
                    "scope": simple_retrieve_body(scope_id)["scope"],
                }
            }
        ]
    }


class MemoryBankSmokeTests(unittest.TestCase):
    def test_dry_run_has_no_http_dependency_and_declares_no_session(self) -> None:
        result = dry_run()
        self.assertEqual(result["action"], "dry-run")
        self.assertIs(result["createsAgentEngineSession"], False)
        self.assertTrue(result["generateUrl"].endswith("/memories:generate"))
        self.assertEqual(result["generateBody"]["disableConsolidation"], True)
        self.assertNotIn("disableMemoryRevisions", result["generateBody"])
        self.assertIn("similaritySearchParams", result["similarityRetrieveBody"])

    def test_default_cli_is_network_free(self) -> None:
        output = io.StringIO()
        with patch(
            "app.memory_bank_smoke.run_live_smoke",
            side_effect=AssertionError("live smoke must not run"),
        ):
            with redirect_stdout(output):
                self.assertEqual(main([]), 0)
        payload = json.loads(output.getvalue())
        self.assertEqual(payload["action"], "dry-run")
        self.assertIs(payload["createsAgentEngineSession"], False)

    def test_request_bodies_are_literal_v1beta1_contracts(self) -> None:
        expected_scope = {"user_id": SCOPE_ID}
        self.assertEqual(
            generate_body(SCOPE_ID),
            {
                "scope": expected_scope,
                "directContentsSource": {
                    "events": [
                        {
                            "content": {
                                "role": "user",
                                "parts": [
                                    {
                                        "text": (
                                            "For this disposable test only, remember "
                                            "that the test crop label is amber millet."
                                        )
                                    }
                                ],
                            }
                        },
                        {
                            "content": {
                                "role": "model",
                                "parts": [
                                    {
                                        "text": (
                                            "The disposable test crop label is amber millet."
                                        )
                                    }
                                ],
                            }
                        },
                    ]
                },
                "disableConsolidation": True,
            },
        )
        self.assertEqual(
            similarity_retrieve_body(SCOPE_ID),
            {
                "scope": expected_scope,
                "similaritySearchParams": {
                    "searchQuery": "What is the disposable test crop label?",
                    "topK": 3,
                },
            },
        )
        self.assertEqual(
            simple_retrieve_body(SCOPE_ID, "next-page"),
            {
                "scope": expected_scope,
                "simpleRetrievalParams": {
                    "pageSize": 100,
                    "pageToken": "next-page",
                },
            },
        )

    def test_success_waits_generation_proves_similarity_and_cleans_exact_scope(self) -> None:
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                FakeResponse({"name": GENERATION_OPERATION}),
                FakeResponse(
                    {"name": GENERATION_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse(retrieved()),
                FakeResponse(retrieved()),
                FakeResponse({"name": DELETE_OPERATION}),
                FakeResponse(
                    {"name": DELETE_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )

        result = run_live_smoke(
            session=session,
            sleep_fn=lambda _seconds: None,
            scope_id=SCOPE_ID,
        )

        self.assertEqual(result["retrieved"], 1)
        self.assertEqual(result["deleted"], 1)
        self.assertEqual(result["remaining"], 0)
        self.assertIs(result["sessionCreated"], False)
        self.assertEqual(session.responses, [])
        calls = session.calls
        self.assertEqual(calls[0]["method"], "GET")
        self.assertEqual(calls[0]["url"], api_url(APPROVED_RESOURCE_NAME))
        self.assertEqual(calls[1]["url"], memory_action_url("generate"))
        self.assertEqual(calls[1]["json"], generate_body(SCOPE_ID))
        self.assertEqual(calls[2]["method"], "GET")
        self.assertEqual(calls[3]["json"], similarity_retrieve_body(SCOPE_ID))
        self.assertEqual(calls[4]["json"], simple_retrieve_body(SCOPE_ID))
        self.assertEqual(calls[5]["method"], "DELETE")
        self.assertEqual(calls[5]["url"], _memory_api_url(MEMORY_NAME))
        self.assertNotIn("json", calls[5])
        self.assertNotIn("data", calls[5])
        self.assertFalse(any("/sessions" in call["url"] for call in calls))

    def test_failed_proof_still_deletes_materialized_memory(self) -> None:
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                FakeResponse(
                    {"name": GENERATION_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse(retrieved()),
                FakeResponse(
                    {"name": DELETE_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )

        with patch("app.memory_bank_smoke.MAX_RETRIEVAL_POLLS", 1):
            with self.assertRaisesRegex(RuntimeError, "not retrievable"):
                run_live_smoke(
                    session=session,
                    sleep_fn=lambda _seconds: None,
                    scope_id=SCOPE_ID,
                )

        self.assertTrue(any(call["method"] == "DELETE" for call in session.calls))
        self.assertEqual(session.responses, [])

    def test_zero_generated_memories_is_a_clean_proof_failure(self) -> None:
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                FakeResponse(
                    {"name": GENERATION_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )

        with patch("app.memory_bank_smoke.MAX_RETRIEVAL_POLLS", 1):
            with self.assertRaisesRegex(RuntimeError, "not retrievable"):
                run_live_smoke(
                    session=session,
                    sleep_fn=lambda _seconds: None,
                    scope_id=SCOPE_ID,
                )
        self.assertEqual(session.responses, [])

    def test_out_of_scope_memory_name_is_never_deleted(self) -> None:
        foreign_name = (
            "projects/999/locations/us-central1/reasoningEngines/999/"
            "memories/foreign"
        )
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                FakeResponse(
                    {"name": GENERATION_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse(retrieved()),
                FakeResponse(retrieved(foreign_name)),
            ]
        )

        with self.assertRaisesRegex(RuntimeError, "cleanup is unconfirmed"):
            run_live_smoke(
                session=session,
                sleep_fn=lambda _seconds: None,
                scope_id=SCOPE_ID,
            )

        self.assertFalse(any(call["method"] == "DELETE" for call in session.calls))

    def test_same_engine_memory_from_different_scope_is_never_deleted(self) -> None:
        foreign_scope = f"{SCOPE_PREFIX}00000000-0000-0000-0000-000000000099"
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                FakeResponse(
                    {"name": GENERATION_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse(retrieved()),
                FakeResponse(retrieved(scope_id=foreign_scope)),
            ]
        )

        with self.assertRaisesRegex(RuntimeError, "cleanup is unconfirmed"):
            run_live_smoke(
                session=session,
                sleep_fn=lambda _seconds: None,
                scope_id=SCOPE_ID,
            )

        self.assertFalse(any(call["method"] == "DELETE" for call in session.calls))

    def test_parent_traversal_memory_id_is_rejected(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "invalid memory ID"):
            _memory_api_url(f"{APPROVED_RESOURCE_NAME}/memories/..")

    def test_memory_id_must_be_one_safe_resource_path_segment(self) -> None:
        for memory_id in ["789", "generated-Memory_1.2~"]:
            self.assertTrue(
                _memory_api_url(
                    f"{APPROVED_RESOURCE_NAME}/memories/{memory_id}"
                )
            )
        invalid_ids = [
            ".",
            "..",
            "memory/child",
            "memory?delete=all",
            "memory#fragment",
            "memory%2Fchild",
            "mémoire",
            "m" * 257,
        ]
        for memory_id in invalid_ids:
            with self.subTest(memory_id=memory_id):
                with self.assertRaisesRegex(RuntimeError, "invalid memory ID"):
                    _memory_api_url(
                        f"{APPROVED_RESOURCE_NAME}/memories/{memory_id}"
                    )

    def test_operation_poll_rejects_a_changed_name(self) -> None:
        changed_operation = f"{APPROVED_RESOURCE_NAME}/operations/generate-other"
        session = ScriptedSession(
            [
                FakeResponse(
                    {"name": changed_operation, "done": True, "response": {}}
                )
            ]
        )

        with self.assertRaisesRegex(RuntimeError, "identity changed"):
            _wait_operation(
                session,
                {"name": GENERATION_OPERATION},
                expected_parent=APPROVED_RESOURCE_NAME,
                sleep_fn=lambda _seconds: None,
            )

    def test_unsettled_generation_fails_closed_even_when_scope_is_empty(self) -> None:
        pending = {"name": GENERATION_OPERATION}
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                FakeResponse(pending),
                FakeResponse(pending),
                FakeResponse(pending),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )

        with patch("app.memory_bank_smoke.MAX_OPERATION_POLLS", 1):
            with self.assertRaisesRegex(RuntimeError, "cleanup is unconfirmed"):
                run_live_smoke(
                    session=session,
                    sleep_fn=lambda _seconds: None,
                    scope_id=SCOPE_ID,
                )

        simple_calls = [
            call
            for call in session.calls
            if call["method"] == "POST"
            and call["url"] == memory_action_url("retrieve")
        ]
        self.assertEqual(len(simple_calls), 2)

    def test_ambiguous_generation_transport_failure_never_claims_cleanup(self) -> None:
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                TimeoutError("synthetic transport timeout"),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )

        with self.assertRaisesRegex(RuntimeError, "cleanup is unconfirmed"):
            run_live_smoke(
                session=session,
                sleep_fn=lambda _seconds: None,
                scope_id=SCOPE_ID,
            )

        self.assertEqual(session.responses, [])

    def test_preflight_failure_reports_primary_error_after_empty_cleanup(self) -> None:
        inactive = active_resource()
        inactive["contextSpec"]["memoryBankConfig"] = {}
        session = ScriptedSession(
            [
                FakeResponse(inactive),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )

        with self.assertRaisesRegex(RuntimeError, "config is not active"):
            run_live_smoke(
                session=session,
                sleep_fn=lambda _seconds: None,
                scope_id=SCOPE_ID,
            )

    def test_cleanup_must_reach_stable_empty_state(self) -> None:
        session = ScriptedSession(
            [
                FakeResponse(active_resource()),
                FakeResponse(
                    {"name": GENERATION_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse(retrieved()),
                FakeResponse(retrieved()),
                FakeResponse(
                    {"name": DELETE_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse(retrieved()),
                FakeResponse(
                    {"name": DELETE_OPERATION, "done": True, "response": {}}
                ),
            ]
        )

        with patch("app.memory_bank_smoke.MAX_CLEANUP_ROUNDS", 2):
            with self.assertRaisesRegex(RuntimeError, "cleanup is unconfirmed"):
                run_live_smoke(
                    session=session,
                    sleep_fn=lambda _seconds: None,
                    scope_id=SCOPE_ID,
                )

        self.assertEqual(
            sum(call["method"] == "DELETE" for call in session.calls),
            2,
        )

    def test_cleanup_retrieval_paginates_and_rejects_repeated_token(self) -> None:
        second_memory = f"{APPROVED_RESOURCE_NAME}/memories/proof-memory-2"
        paged = ScriptedSession(
            [
                FakeResponse({**retrieved(), "nextPageToken": "page-2"}),
                FakeResponse(retrieved(second_memory)),
            ]
        )
        self.assertEqual(
            _all_memory_names(paged, SCOPE_ID),
            [MEMORY_NAME, second_memory],
        )
        self.assertEqual(
            paged.calls[1]["json"],
            simple_retrieve_body(SCOPE_ID, "page-2"),
        )

        repeated = ScriptedSession(
            [
                FakeResponse({"retrievedMemories": [], "nextPageToken": "repeat"}),
                FakeResponse({"retrievedMemories": [], "nextPageToken": "repeat"}),
            ]
        )
        with self.assertRaisesRegex(RuntimeError, "invalid page token"):
            _all_memory_names(repeated, SCOPE_ID)

    def test_cleanup_handles_delete_404_but_not_delete_error(self) -> None:
        already_gone = ScriptedSession(
            [
                FakeResponse(retrieved()),
                FakeResponse(None, status_code=404),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )
        self.assertEqual(
            _cleanup_memories(
                already_gone,
                SCOPE_ID,
                sleep_fn=lambda _seconds: None,
            ),
            1,
        )

        delete_error = ScriptedSession(
            [
                FakeResponse(retrieved()),
                FakeResponse({"error": "synthetic"}, status_code=500),
            ]
        )
        with self.assertRaisesRegex(RuntimeError, "HTTP 500"):
            _cleanup_memories(
                delete_error,
                SCOPE_ID,
                sleep_fn=lambda _seconds: None,
            )

    def test_cleanup_does_not_finish_after_only_one_empty_read(self) -> None:
        session = ScriptedSession(
            [
                FakeResponse({"retrievedMemories": []}),
                FakeResponse(retrieved()),
                FakeResponse(
                    {"name": DELETE_OPERATION, "done": True, "response": {}}
                ),
                FakeResponse({"retrievedMemories": []}),
                FakeResponse({"retrievedMemories": []}),
            ]
        )
        self.assertEqual(
            _cleanup_memories(
                session,
                SCOPE_ID,
                sleep_fn=lambda _seconds: None,
            ),
            1,
        )
        self.assertEqual(session.responses, [])


if __name__ == "__main__":
    unittest.main()
