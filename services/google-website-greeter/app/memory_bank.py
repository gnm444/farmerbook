"""Configure Memory Bank on the one approved FarmerBook canary.

The update is deliberately a narrow REST PATCH with the update mask
``contextSpec.memoryBankConfig``. It never uploads agent code or supplies
deployment, scaling, identity, environment, telemetry, IAM, billing, or
traffic fields.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import time
from collections.abc import Callable, Mapping, Sequence
from typing import Any

APPROVED_PROJECT_NUMBER = "659765383594"
APPROVED_PROJECT_ID_ALIAS = "core-song-507701-f6"
APPROVED_LOCATION = "us-central1"
APPROVED_REASONING_ENGINE_ID = "2785816668377448448"
APPROVED_RESOURCE_NAME = (
    f"projects/{APPROVED_PROJECT_NUMBER}/locations/{APPROVED_LOCATION}/"
    f"reasoningEngines/{APPROVED_REASONING_ENGINE_ID}"
)
VERIFIED_RESOURCE_ALIAS = (
    f"projects/{APPROVED_PROJECT_ID_ALIAS}/locations/{APPROVED_LOCATION}/"
    f"reasoningEngines/{APPROVED_REASONING_ENGINE_ID}"
)
API_VERSION = "v1beta1"
UPDATE_MASK = "contextSpec.memoryBankConfig"
MEMORY_TTL = "86400s"
GENERATION_MODEL_ID = "gemini-3.5-flash"
EMBEDDING_MODEL_ID = "text-multilingual-embedding-002"
GOOGLE_ACCESS_SCOPE = "https://www.googleapis.com/auth/cloud-platform"
MAX_OPERATION_POLLS = 120
OPERATION_POLL_SECONDS = 5.0

_OPTIONAL_ENV_CONTROLS = frozenset({
    "googlecloudagentengineenabletelemetry",
    "googlecloudagentengineenablecontentcapture",
    "googlecloudagentengineenablecontentlogging",
    "googlecloudagentengineenablepromptcapture",
    "googlecloudagentengineenablepromptlogging",
})
_OPTIONAL_DIRECT_CONTROLS = frozenset({
    "enabletelemetry",
    "telemetryenabled",
    "enablecontentcapture",
    "contentcaptureenabled",
    "enablecontentlogging",
    "contentloggingenabled",
    "enablepromptcapture",
    "promptcaptureenabled",
    "enablepromptlogging",
    "promptloggingenabled",
})
_ENV_CONTAINER_KEYS = frozenset({
    "env",
    "envvars",
    "environmentvariables",
})
_OFF_VALUES = frozenset({"0", "false", "no", "off", "disabled"})


def canonical_resource_name(resource_name: Any) -> str:
    """Accept only the canonical resource or its one verified project-ID alias."""
    if isinstance(resource_name, str) and resource_name in {
        APPROVED_RESOURCE_NAME,
        VERIFIED_RESOURCE_ALIAS,
    }:
        return APPROVED_RESOURCE_NAME
    raise ValueError("resource name is not the approved FarmerBook canary")


def endpoint() -> str:
    return f"https://{APPROVED_LOCATION}-aiplatform.googleapis.com"


def api_url(resource_name: str) -> str:
    return f"{endpoint()}/{API_VERSION}/{canonical_resource_name(resource_name)}"


def operation_url(
    operation_name: str,
    *,
    expected_parent: str | None = None,
) -> str:
    """Validate a location-, engine-, memory-, or session-scoped LRO name."""
    parts = operation_name.split("/")
    if len(parts) < 6 or parts[:1] != ["projects"]:
        raise RuntimeError("Google API returned an operation outside the approved canary")
    if parts[1] not in {APPROVED_PROJECT_NUMBER, APPROVED_PROJECT_ID_ALIAS}:
        raise RuntimeError("Google API returned an operation outside the approved canary")
    if parts[2:4] != ["locations", APPROVED_LOCATION]:
        raise RuntimeError("Google API returned an operation outside the approved canary")

    def safe_id(value: str) -> bool:
        return (
            0 < len(value) <= 256
            and value not in {".", ".."}
            and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._~-]*", value) is not None
        )

    valid = len(parts) == 6 and parts[4] == "operations" and safe_id(parts[5])
    if len(parts) >= 8 and parts[4:6] == [
        "reasoningEngines",
        APPROVED_REASONING_ENGINE_ID,
    ]:
        valid = valid or (
            len(parts) == 8 and parts[6] == "operations" and safe_id(parts[7])
        )
        valid = valid or (
            len(parts) == 10
            and parts[6] in {"memories", "sessions"}
            and safe_id(parts[7])
            and parts[8] == "operations"
            and safe_id(parts[9])
        )
    if valid and expected_parent is not None:
        operation_parent = "/".join(parts[:-2])
        if operation_parent != expected_parent:
            raise RuntimeError(
                "Google API returned an operation for an unexpected resource"
            )
    if valid:
        return f"{endpoint()}/{API_VERSION}/{operation_name}"
    raise RuntimeError("Google API returned an operation outside the approved canary")


def approved_memory_bank_config() -> dict[str, Any]:
    model_root = (
        f"projects/{APPROVED_PROJECT_ID_ALIAS}/locations/{APPROVED_LOCATION}/"
        "publishers/google/models"
    )
    return {
        "customizationConfigs": [
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
        "generationConfig": {
            "model": f"{model_root}/{GENERATION_MODEL_ID}",
        },
        "similaritySearchConfig": {
            "embeddingModel": f"{model_root}/{EMBEDDING_MODEL_ID}",
        },
        "ttlConfig": {
            "defaultTtl": MEMORY_TTL,
            "memoryRevisionDefaultTtl": MEMORY_TTL,
        },
    }


def patch_body(
    etag: str | None = None,
    *,
    resource_name: str = APPROVED_RESOURCE_NAME,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "name": canonical_resource_name(resource_name),
        "contextSpec": {"memoryBankConfig": approved_memory_bank_config()},
    }
    if etag:
        body["etag"] = etag
    return body


def protected_fingerprint(resource: Mapping[str, Any]) -> str:
    """Hash all read-back fields except the approved leaf and server metadata."""
    protected = copy.deepcopy(dict(resource))
    name = protected.get("name")
    if isinstance(name, str):
        protected["name"] = canonical_resource_name(name)
    context_spec = protected.get("contextSpec")
    if isinstance(context_spec, dict):
        context_spec.pop("memoryBankConfig", None)
        if not context_spec:
            protected.pop("contextSpec", None)
    protected.pop("updateTime", None)
    protected.pop("etag", None)
    encoded = json.dumps(protected, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _is_explicitly_off(value: Any) -> bool:
    if value is False or value == 0:
        return True
    return isinstance(value, str) and value.strip().lower() in _OFF_VALUES


def _normalized_key(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return "".join(character for character in value.lower() if character.isalnum())


def _configured_optional_controls(value: Any, path: str = "resource") -> list[tuple[str, Any]]:
    found: list[tuple[str, Any]] = []
    if isinstance(value, Mapping):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            normalized_key = _normalized_key(key)
            if normalized_key in _OPTIONAL_DIRECT_CONTROLS:
                found.append((child_path, child))
            if normalized_key in _ENV_CONTAINER_KEYS:
                if isinstance(child, Mapping):
                    for env_name, env_value in child.items():
                        if _normalized_key(env_name) in _OPTIONAL_ENV_CONTROLS:
                            found.append((f"{child_path}.{env_name}", env_value))
                elif isinstance(child, list):
                    for index, entry in enumerate(child):
                        if not isinstance(entry, Mapping):
                            continue
                        env_name = entry.get("name")
                        if _normalized_key(env_name) in _OPTIONAL_ENV_CONTROLS:
                            found.append((f"{child_path}[{index}]", entry.get("value")))
            found.extend(_configured_optional_controls(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(_configured_optional_controls(child, f"{path}[{index}]"))
    return found


def assert_optional_capture_off(resource: Mapping[str, Any]) -> dict[str, Any]:
    """Fail closed if optional telemetry or content capture is enabled/ambiguous."""
    controls = _configured_optional_controls(resource)
    unsafe = [(path, value) for path, value in controls if not _is_explicitly_off(value)]
    if unsafe:
        paths = ", ".join(path for path, _ in unsafe)
        raise RuntimeError(f"optional telemetry/content capture is not off: {paths}")
    return {
        "assertedOff": True,
        "configuredControlCount": len(controls),
    }


def _request_json(session: Any, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
    response = session.request(method, url, timeout=30, **kwargs)
    response.raise_for_status()
    if not response.content:
        return {}
    parsed = response.json()
    if not isinstance(parsed, dict):
        raise RuntimeError("Google API returned a non-object response")
    return parsed


def _wait_operation(
    session: Any,
    operation: Mapping[str, Any],
    *,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> dict[str, Any]:
    current = dict(operation)
    name = current.get("name")
    if not isinstance(name, str):
        raise RuntimeError("Memory Bank PATCH did not return a valid operation")
    operation_poll_url = operation_url(
        name,
        expected_parent=APPROVED_RESOURCE_NAME,
    )
    for _ in range(MAX_OPERATION_POLLS):
        if current.get("name") != name:
            raise RuntimeError("Memory Bank operation identity changed while polling")
        if current.get("error") is not None:
            raise RuntimeError("Memory Bank configuration operation failed")
        if current.get("done") is True:
            return current
        sleep_fn(OPERATION_POLL_SECONDS)
        current = _request_json(session, "GET", operation_poll_url)
    if current.get("name") != name:
        raise RuntimeError("Memory Bank operation identity changed while polling")
    if current.get("error") is not None:
        raise RuntimeError("Memory Bank configuration operation failed")
    if current.get("done") is True:
        return current
    raise RuntimeError("Memory Bank configuration operation timed out")


def _authorized_session() -> Any:
    import google.auth
    from google.auth.transport.requests import AuthorizedSession

    credentials, _ = google.auth.default(scopes=[GOOGLE_ACCESS_SCOPE])
    return AuthorizedSession(credentials)


def apply_approved_memory_bank_config(
    *,
    resource_name: str = APPROVED_RESOURCE_NAME,
    session: Any | None = None,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> dict[str, Any]:
    canonical_name = canonical_resource_name(resource_name)
    http = session if session is not None else _authorized_session()
    resource_url = api_url(canonical_name)

    before = _request_json(http, "GET", resource_url)
    try:
        before_name = canonical_resource_name(before.get("name"))
    except (TypeError, ValueError) as error:
        raise RuntimeError("Refusing to patch an unexpected Agent Engine") from error
    if before_name != canonical_name:
        raise RuntimeError("Refusing to patch an unexpected Agent Engine")
    capture_before = assert_optional_capture_off(before)
    before_hash = protected_fingerprint(before)

    operation = _request_json(
        http,
        "PATCH",
        resource_url,
        params={"updateMask": UPDATE_MASK},
        json=patch_body(
            before.get("etag") if isinstance(before.get("etag"), str) else None,
            resource_name=before_name,
        ),
    )
    _wait_operation(http, operation, sleep_fn=sleep_fn)

    after = _request_json(http, "GET", resource_url)
    try:
        after_name = canonical_resource_name(after.get("name"))
    except (TypeError, ValueError) as error:
        raise RuntimeError(
            "Memory Bank read-back returned an unexpected Agent Engine"
        ) from error
    if after_name != canonical_name:
        raise RuntimeError("Memory Bank read-back returned an unexpected Agent Engine")
    capture_after = assert_optional_capture_off(after)
    if after.get("contextSpec", {}).get("memoryBankConfig") != approved_memory_bank_config():
        raise RuntimeError("Memory Bank read-back does not match the approved config")
    after_hash = protected_fingerprint(after)
    if before_hash != after_hash:
        raise RuntimeError("A non-Memory-Bank canary field changed during the update")
    return {
        "resourceName": canonical_name,
        "apiVersion": API_VERSION,
        "updateMask": UPDATE_MASK,
        "protectedFingerprint": after_hash,
        "optionalCaptureBefore": capture_before,
        "optionalCaptureAfter": capture_after,
        "memoryBankConfig": approved_memory_bank_config(),
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--resource-name",
        default=APPROVED_RESOURCE_NAME,
        help="Exact numeric resource or the one verified project-ID alias.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the exact config. Without this flag, print a dry run.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    canonical_name = canonical_resource_name(args.resource_name)
    result = apply_approved_memory_bank_config(resource_name=canonical_name) if args.apply else {
        "action": "dry-run",
        "apiVersion": API_VERSION,
        "resourceName": canonical_name,
        "resourceUrl": api_url(canonical_name),
        "updateMask": UPDATE_MASK,
        "body": patch_body(),
    }
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
