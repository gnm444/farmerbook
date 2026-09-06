"""Bounded, fail-closed smoke proof for the approved Memory Bank.

The default action is a local dry run. ``--apply`` requires Application Default
Credentials, generates one non-personal synthetic memory under a unique scope,
proves similarity retrieval, and always deletes every exact-scope memory before
returning. It does not create an Agent Engine session.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import uuid
from collections.abc import Callable, Mapping, Sequence
from typing import Any

from .memory_bank import (
    API_VERSION,
    APPROVED_RESOURCE_NAME,
    MAX_OPERATION_POLLS,
    OPERATION_POLL_SECONDS,
    _authorized_session,
    api_url,
    approved_memory_bank_config,
    assert_optional_capture_off,
    canonical_resource_name,
    endpoint,
    operation_url,
)

SCOPE_PREFIX = "memory-smoke-"
MAX_RETRIEVAL_POLLS = 12
RETRIEVAL_POLL_SECONDS = 1.0
MAX_CLEANUP_ROUNDS = 8
EMPTY_CONFIRMATIONS_REQUIRED = 2
MAX_MEMORY_PAGES = 8
PAGE_SIZE = 100
SYNTHETIC_USER_TEXT = (
    "For this disposable test only, remember that the test crop label is amber millet."
)
SYNTHETIC_MODEL_TEXT = "The disposable test crop label is amber millet."
SYNTHETIC_QUERY = "What is the disposable test crop label?"


def memory_collection_url() -> str:
    return f"{api_url(APPROVED_RESOURCE_NAME)}/memories"


def memory_action_url(action: str) -> str:
    if action not in {"generate", "retrieve"}:
        raise ValueError("unsupported Memory Bank action")
    return f"{memory_collection_url()}:{action}"


def scope(scope_id: str) -> dict[str, str]:
    if not scope_id.startswith(SCOPE_PREFIX) or len(scope_id) > 96:
        raise ValueError("smoke scope is not a bounded disposable scope")
    suffix = scope_id[len(SCOPE_PREFIX):]
    if re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", suffix) is None:
        raise ValueError("smoke scope contains unsupported characters")
    # The value remains a disposable opaque identifier. Only the key name is
    # aligned with the exact Memory Bank customization scope configured on the
    # approved Agent Engine.
    return {"user_id": scope_id}


def generate_body(scope_id: str) -> dict[str, Any]:
    return {
        "scope": scope(scope_id),
        "directContentsSource": {
            "events": [
                {
                    "content": {
                        "role": "user",
                        "parts": [{"text": SYNTHETIC_USER_TEXT}],
                    }
                },
                {
                    "content": {
                        "role": "model",
                        "parts": [{"text": SYNTHETIC_MODEL_TEXT}],
                    }
                },
            ]
        },
        "disableConsolidation": True,
    }


def similarity_retrieve_body(scope_id: str) -> dict[str, Any]:
    return {
        "scope": scope(scope_id),
        "similaritySearchParams": {
            "searchQuery": SYNTHETIC_QUERY,
            "topK": 3,
        },
    }


def simple_retrieve_body(
    scope_id: str,
    page_token: str | None = None,
) -> dict[str, Any]:
    return {
        "scope": scope(scope_id),
        "simpleRetrievalParams": {
            "pageSize": PAGE_SIZE,
            **({"pageToken": page_token} if page_token else {}),
        },
    }


def _request(
    session: Any,
    method: str,
    url: str,
    *,
    allow_not_found: bool = False,
    **kwargs: Any,
) -> dict[str, Any] | None:
    response = session.request(method, url, timeout=30, **kwargs)
    if allow_not_found and response.status_code == 404:
        return None
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
    expected_parent: str,
    sleep_fn: Callable[[float], None],
) -> dict[str, Any]:
    current = dict(operation)
    name = current.get("name")
    if not isinstance(name, str):
        raise RuntimeError("Memory operation did not return a valid LRO")
    operation_poll_url = operation_url(name, expected_parent=expected_parent)
    for _ in range(MAX_OPERATION_POLLS):
        if current.get("done") is True or current.get("error") is not None:
            return current
        sleep_fn(OPERATION_POLL_SECONDS)
        next_operation = _request(session, "GET", operation_poll_url)
        if next_operation is None:
            raise RuntimeError("Memory operation disappeared before completion")
        if next_operation.get("name") != name:
            raise RuntimeError("Memory operation identity changed while polling")
        current = next_operation
    if current.get("done") is True or current.get("error") is not None:
        return current
    raise RuntimeError("Memory operation timed out")


def _assert_operation_success(operation: Mapping[str, Any]) -> None:
    if operation.get("error") is not None:
        raise RuntimeError("Memory operation failed")
    if operation.get("done") is not True:
        raise RuntimeError("Memory operation did not reach a terminal state")


def _validated_memory_name(value: Any) -> str:
    prefix = f"{APPROVED_RESOURCE_NAME}/memories/"
    if not isinstance(value, str) or not value.startswith(prefix):
        raise RuntimeError("Memory response contained an out-of-scope resource name")
    memory_id = value[len(prefix):]
    if (
        memory_id in {".", ".."}
        or len(memory_id) > 256
        or re.fullmatch(r"[A-Za-z0-9._~-]+", memory_id) is None
    ):
        raise RuntimeError("Memory response contained an invalid memory ID")
    return value


def _memory_api_url(memory_name: Any) -> str:
    validated_name = _validated_memory_name(memory_name)
    return f"{endpoint()}/{API_VERSION}/{validated_name}"


def _names_from_retrieval(
    response: Mapping[str, Any],
    scope_id: str,
) -> list[str]:
    entries = response.get("retrievedMemories", [])
    if not isinstance(entries, list):
        raise RuntimeError("Memory retrieval returned an invalid result list")
    names: list[str] = []
    expected_scope = scope(scope_id)
    for entry in entries:
        if not isinstance(entry, Mapping) or not isinstance(entry.get("memory"), Mapping):
            raise RuntimeError("Memory retrieval returned an invalid entry")
        memory = entry["memory"]
        if memory.get("scope") != expected_scope:
            raise RuntimeError("Memory retrieval returned a mismatched exact scope")
        names.append(_validated_memory_name(memory.get("name")))
    return names


def _similarity_memory_names(session: Any, scope_id: str) -> list[str]:
    response = _request(
        session,
        "POST",
        memory_action_url("retrieve"),
        json=similarity_retrieve_body(scope_id),
    )
    if response is None:
        raise RuntimeError("Memory retrieval returned no response")
    return sorted(set(_names_from_retrieval(response, scope_id)))


def _all_memory_names(session: Any, scope_id: str) -> list[str]:
    names: set[str] = set()
    page_token: str | None = None
    seen_tokens: set[str] = set()
    for _ in range(MAX_MEMORY_PAGES):
        response = _request(
            session,
            "POST",
            memory_action_url("retrieve"),
            json=simple_retrieve_body(scope_id, page_token),
        )
        if response is None:
            raise RuntimeError("Memory retrieval returned no response")
        names.update(_names_from_retrieval(response, scope_id))
        next_page_token = response.get("nextPageToken")
        if next_page_token is None or next_page_token == "":
            return sorted(names)
        if not isinstance(next_page_token, str) or next_page_token in seen_tokens:
            raise RuntimeError("Memory retrieval returned an invalid page token")
        seen_tokens.add(next_page_token)
        page_token = next_page_token
    raise RuntimeError("Disposable scope exceeds the cleanup page bound")


def _cleanup_memories(
    session: Any,
    scope_id: str,
    *,
    sleep_fn: Callable[[float], None],
) -> int:
    deleted: set[str] = set()
    empty_confirmations = 0
    for _ in range(MAX_CLEANUP_ROUNDS):
        names = _all_memory_names(session, scope_id)
        if not names:
            empty_confirmations += 1
            if empty_confirmations >= EMPTY_CONFIRMATIONS_REQUIRED:
                return len(deleted)
            sleep_fn(RETRIEVAL_POLL_SECONDS)
            continue

        empty_confirmations = 0
        for name in names:
            operation = _request(
                session,
                "DELETE",
                _memory_api_url(name),
                allow_not_found=True,
            )
            if operation is not None:
                completed = _wait_operation(
                    session,
                    operation,
                    expected_parent=name,
                    sleep_fn=sleep_fn,
                )
                _assert_operation_success(completed)
            deleted.add(name)
        sleep_fn(RETRIEVAL_POLL_SECONDS)
    raise RuntimeError("Disposable Memory Bank cleanup could not be confirmed")


def run_live_smoke(
    *,
    session: Any | None = None,
    sleep_fn: Callable[[float], None] = time.sleep,
    scope_id: str | None = None,
) -> dict[str, Any]:
    http = session if session is not None else _authorized_session()
    disposable_scope = scope_id or f"{SCOPE_PREFIX}{uuid.uuid4()}"
    scope(disposable_scope)
    generation_operation: dict[str, Any] | None = None
    generation_attempted = False
    generation_terminal = False
    retrieved_count = 0
    deleted_count = 0
    primary_error: BaseException | None = None

    try:
        resource = _request(http, "GET", api_url(APPROVED_RESOURCE_NAME))
        if resource is None:
            raise RuntimeError("Smoke preflight returned no Agent Engine")
        try:
            resource_name = canonical_resource_name(resource.get("name"))
        except (TypeError, ValueError) as error:
            raise RuntimeError("Smoke preflight returned an unexpected Agent Engine") from error
        if resource_name != APPROVED_RESOURCE_NAME:
            raise RuntimeError("Smoke preflight returned an unexpected Agent Engine")
        assert_optional_capture_off(resource)
        if (
            resource.get("contextSpec", {}).get("memoryBankConfig")
            != approved_memory_bank_config()
        ):
            raise RuntimeError("Approved Memory Bank config is not active; refusing smoke")

        generation_attempted = True
        created = _request(
            http,
            "POST",
            memory_action_url("generate"),
            json=generate_body(disposable_scope),
        )
        if created is None:
            raise RuntimeError("Memory generation returned no operation")
        generation_operation = created
        completed = _wait_operation(
            http,
            created,
            expected_parent=APPROVED_RESOURCE_NAME,
            sleep_fn=sleep_fn,
        )
        generation_terminal = True
        _assert_operation_success(completed)

        for _ in range(MAX_RETRIEVAL_POLLS):
            names = _similarity_memory_names(http, disposable_scope)
            if names:
                retrieved_count = len(names)
                break
            sleep_fn(RETRIEVAL_POLL_SECONDS)
        if retrieved_count == 0:
            raise RuntimeError("Synthetic memory was not retrievable within the bound")
    except BaseException as error:
        primary_error = error
    finally:
        settle_error: BaseException | None = None
        if generation_operation is not None and not generation_terminal:
            try:
                completed = _wait_operation(
                    http,
                    generation_operation,
                    expected_parent=APPROVED_RESOURCE_NAME,
                    sleep_fn=sleep_fn,
                )
                generation_terminal = True
                _assert_operation_success(completed)
            except BaseException as error:
                settle_error = error

        cleanup_error: BaseException | None = None
        try:
            deleted_count = _cleanup_memories(
                http,
                disposable_scope,
                sleep_fn=sleep_fn,
            )
        except BaseException as error:
            cleanup_error = error

        unsettled_generation = generation_attempted and not generation_terminal
        if unsettled_generation or cleanup_error is not None:
            cause = cleanup_error or settle_error
            raise RuntimeError(
                f"Live smoke cleanup is unconfirmed for scope {disposable_scope}"
            ) from cause

    if primary_error is not None:
        raise primary_error
    return {
        "apiVersion": API_VERSION,
        "resourceName": APPROVED_RESOURCE_NAME,
        "scope": disposable_scope,
        "retrieved": retrieved_count,
        "deleted": deleted_count,
        "remaining": 0,
        "sessionCreated": False,
        "sessionDeleted": False,
    }


def dry_run() -> dict[str, Any]:
    example_scope = f"{SCOPE_PREFIX}00000000-0000-0000-0000-000000000000"
    return {
        "action": "dry-run",
        "apiVersion": API_VERSION,
        "resourceName": APPROVED_RESOURCE_NAME,
        "generateUrl": memory_action_url("generate"),
        "retrieveUrl": memory_action_url("retrieve"),
        "scope": f"{SCOPE_PREFIX}<unique-uuid>",
        "generateBody": generate_body(example_scope),
        "similarityRetrieveBody": similarity_retrieve_body(example_scope),
        "cleanup": "wait generation, exact-scope delete, wait deletes, confirm empty twice",
        "createsAgentEngineSession": False,
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Run the live smoke with ADC. Without this flag, print a dry run.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    result = run_live_smoke() if args.apply else dry_run()
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
