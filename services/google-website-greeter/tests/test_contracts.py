from __future__ import annotations

from pathlib import Path
import unittest
from uuid import uuid4

from app.contract_adapter import build_adk_invocation, response_from_events
from app.contracts import (
    CONTRACT_VERSION,
    CONTEXT_CONSENT_VERSION,
    ContractError,
    sanitize_context_text,
    validate_request,
)
from app.settings import SettingsError, load_settings
from app.deployment import (
    DeploymentConfigurationError,
    build_deployment_plan,
    deployment_requirements,
    validate_resource_name,
)


def valid_payload() -> dict[str, object]:
    return {
        "contractVersion": CONTRACT_VERSION,
        "requestId": str(uuid4()),
        "session": {
            "anonymousSessionId": str(uuid4()),
            "consentVersion": CONTEXT_CONSENT_VERSION,
            "providerSessionId": None,
        },
        "locale": "te-IN",
        "message": "FarmerBook లో ఎలా చేరాలి?",
        "history": [
            {"role": "user", "content": "నమస్తే", "locale": "te-IN"},
            {"role": "assistant", "content": "నమస్తే!", "locale": "te-IN"},
        ],
        "maxOutputTokens": 160,
        "temperature": 0.2,
    }


class GreeterContractTests(unittest.TestCase):
    def test_accepts_bounded_telugu_session_request(self) -> None:
        request = validate_request(valid_payload())
        self.assertEqual(request.locale, "te-IN")
        self.assertEqual(len(request.history), 2)
        invocation = build_adk_invocation(request)
        self.assertTrue(invocation.user_id.startswith("request-"))
        self.assertIsNone(invocation.session_id)
        self.assertIn("FarmerBook లో ఎలా చేరాలి?", invocation.message)

    def test_rejects_history_without_explicit_session_consent(self) -> None:
        payload = valid_payload()
        payload["session"] = None
        with self.assertRaisesRegex(
            ContractError,
            "GOOGLE_GREETER_HISTORY_REQUIRES_SESSION_CONSENT",
        ):
            validate_request(payload)

    def test_rejects_unsupported_locale_and_unknown_fields(self) -> None:
        payload = valid_payload()
        payload["locale"] = "fr-FR"
        with self.assertRaisesRegex(ContractError, "GOOGLE_GREETER_LOCALE_INVALID"):
            validate_request(payload)

        payload = valid_payload()
        payload["credential"] = "must-never-be-accepted"
        with self.assertRaisesRegex(
            ContractError,
            "GOOGLE_GREETER_REQUEST_FIELDS_INVALID",
        ):
            validate_request(payload)

    def test_redacts_personal_data_from_reused_history(self) -> None:
        text = sanitize_context_text(
            "Email visitor@example.com, phone +91 98765 43210, "
            "link https://example.com/private"
        )
        self.assertNotIn("visitor@example.com", text)
        self.assertNotIn("98765", text)
        self.assertNotIn("example.com/private", text)
        self.assertIn("[email removed]", text)
        self.assertIn("[phone removed]", text)
        self.assertIn("[link removed]", text)

    def test_extracts_and_validates_text_only_response(self) -> None:
        request = validate_request(valid_payload())
        response = response_from_events(
            request,
            [{"content": {"parts": [{"text": "తెలుగు సమాధానం"}]}}],
            "sessions/123456",
        )
        self.assertEqual(response["text"], "తెలుగు సమాధానం")
        self.assertEqual(response["providerSessionId"], "sessions/123456")

    def test_agent_source_is_tool_free_and_model_configuration_is_required(self) -> None:
        source = (Path(__file__).parents[1] / "app" / "agent.py").read_text()
        with self.assertRaisesRegex(SettingsError, "GOOGLE_VERTEX_MODE_REQUIRED"):
            load_settings({})
        with self.assertRaisesRegex(SettingsError, "GOOGLE_CLOUD_PROJECT_REQUIRED"):
            load_settings({"GOOGLE_GENAI_USE_VERTEXAI": "TRUE"})
        settings = load_settings({
            "GOOGLE_GENAI_USE_VERTEXAI": "TRUE",
            "GOOGLE_CLOUD_PROJECT": "test-project",
            "GOOGLE_CLOUD_LOCATION": "test-location",
            "FARMERBOOK_GOOGLE_MODEL": "gemini-2.5-flash-lite",
        })
        self.assertEqual(settings.project, "test-project")
        self.assertEqual(settings.model, "gemini-2.5-flash-lite")
        self.assertIn("settings = load_settings(os.environ)", source)
        self.assertIn("tools=[]", source)
        self.assertIn("max_output_tokens=160", source)
        self.assertIn("temperature=0.2", source)
        self.assertIn("English (en-IN), Telugu (te-IN), or", source)
        self.assertIn("Hindi (hi-IN)", source)
        self.assertIn("model=settings.model", source)

    def test_agent_survives_cloudpickle_round_trip(self) -> None:
        import cloudpickle
        import importlib
        import os
        import sys
        from unittest.mock import patch

        with patch.dict(os.environ, {
            "GOOGLE_GENAI_USE_VERTEXAI": "TRUE",
            "GOOGLE_CLOUD_PROJECT": "test-project",
            "GOOGLE_CLOUD_LOCATION": "us-central1",
            "FARMERBOOK_GOOGLE_MODEL": "gemini-2.5-flash-lite",
        }):
            sys.modules.pop("app.agent", None)
            agent_module = importlib.import_module("app.agent")
            restored = cloudpickle.loads(cloudpickle.dumps(agent_module.root_agent))
            resolved_model = restored.canonical_model
            self.assertEqual(resolved_model.model, "gemini-2.5-flash-lite")
            self.assertIsNotNone(resolved_model.api_client)

    def test_deployment_plan_is_keyless_bounded_and_reproducible(self) -> None:
        service_root = Path(__file__).parents[1]
        plan = build_deployment_plan(
            project="core-song-507701-f6",
            location="us",
            staging_bucket="gs://farmerbook-agent-staging",
            model="gemini-2.5-flash-lite",
        )
        self.assertEqual(plan.min_instances, 0)
        self.assertEqual(plan.max_instances, 1)
        self.assertEqual(plan.identity_type, "AGENT_IDENTITY")
        self.assertEqual(deployment_requirements(service_root).name, "requirements.lock")
        deploy_source = (service_root / "app" / "deploy.py").read_text()
        self.assertNotIn("service-account-key", deploy_source)
        self.assertNotIn("credentials=", deploy_source)
        runtime_env = deploy_source.split('"env_vars": {', 1)[1].split("},", 1)[0]
        self.assertNotIn('"GOOGLE_CLOUD_PROJECT"', runtime_env)
        self.assertNotIn('"GOOGLE_CLOUD_LOCATION"', runtime_env)
        self.assertIn("client.agent_engines.update(", deploy_source)

    def test_update_resource_name_is_bound_to_project_and_location(self) -> None:
        resource_name = (
            "projects/core-song-507701-f6/locations/us-central1/"
            "reasoningEngines/2785816668377448448"
        )
        self.assertEqual(
            validate_resource_name(
                resource_name,
                project="core-song-507701-f6",
                location="us-central1",
            ),
            resource_name,
        )
        with self.assertRaisesRegex(
            DeploymentConfigurationError,
            "GOOGLE_AGENT_ENGINE_RESOURCE_INVALID",
        ):
            validate_resource_name(
                resource_name,
                project="different-project",
                location="us-central1",
            )

    def test_deployment_plan_rejects_unbounded_or_malformed_inputs(self) -> None:
        with self.assertRaisesRegex(
            DeploymentConfigurationError,
            "GOOGLE_CLOUD_STAGING_BUCKET_INVALID",
        ):
            build_deployment_plan(
                project="core-song-507701-f6",
                location="us",
                staging_bucket="https://not-a-google-bucket.example",
                model="gemini-2.5-flash-lite",
            )

        with self.assertRaisesRegex(
            DeploymentConfigurationError,
            "FARMERBOOK_GOOGLE_MODEL_INVALID",
        ):
            build_deployment_plan(
                project="core-song-507701-f6",
                location="us-central1",
                staging_bucket="gs://farmerbook-agent-staging",
                model="gemini-3.5-flash",
            )


if __name__ == "__main__":
    unittest.main()
