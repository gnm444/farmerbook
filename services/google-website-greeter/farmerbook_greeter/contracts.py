"""Dependency-free validation for the Worker-to-Agent-Engine boundary."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
import re
import unicodedata
from typing import Any, Literal
from uuid import UUID

CONTRACT_VERSION = "farmerbook.website-greeter.v1"
CONTEXT_CONSENT_VERSION = "anonymous-conversation-context-v1"
SUPPORTED_LOCALES = ("en-IN", "te-IN", "hi-IN")
MAX_HISTORY_TURNS = 8
MAX_HISTORY_CHARACTERS = 2_400
MAX_OUTPUT_TOKENS = 160
MAX_RESPONSE_CHARACTERS = 650

Role = Literal["user", "assistant"]
Locale = Literal["en-IN", "te-IN", "hi-IN"]


class ContractError(ValueError):
    """Bounded error that never includes visitor-supplied content."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class ContextTurn:
    role: Role
    content: str
    locale: Locale


@dataclass(frozen=True)
class SessionContext:
    anonymous_session_id: str
    consent_version: str
    provider_session_id: str | None


@dataclass(frozen=True)
class GreeterRequest:
    request_id: str
    session: SessionContext | None
    locale: Locale
    message: str
    history: tuple[ContextTurn, ...]
    max_output_tokens: int
    temperature: float


@dataclass(frozen=True)
class GreeterResponse:
    request_id: str
    text: str
    provider_session_id: str | None
    input_tokens: int | None = None
    output_tokens: int | None = None

    def as_dict(self) -> dict[str, Any]:
        usage = None
        if self.input_tokens is not None and self.output_tokens is not None:
            usage = {
                "inputTokens": self.input_tokens,
                "outputTokens": self.output_tokens,
            }
        return {
            "contractVersion": CONTRACT_VERSION,
            "requestId": self.request_id,
            "text": self.text,
            "providerSessionId": self.provider_session_id,
            "usage": usage,
        }


def _mapping(value: Any, code: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ContractError(code)
    return value


def _exact_keys(value: Mapping[str, Any], expected: set[str], code: str) -> None:
    if set(value) != expected:
        raise ContractError(code)


def _bounded_string(value: Any, minimum: int, maximum: int, code: str) -> str:
    if not isinstance(value, str):
        raise ContractError(code)
    normalized = " ".join(value.strip().split())
    if not minimum <= len(normalized) <= maximum:
        raise ContractError(code)
    if any(ord(character) < 32 for character in normalized):
        raise ContractError(code)
    return normalized


def _uuid(value: Any, code: str) -> str:
    text = _bounded_string(value, 36, 36, code)
    try:
        parsed = UUID(text)
    except ValueError as caught:
        raise ContractError(code) from caught
    if str(parsed) != text.lower():
        raise ContractError(code)
    return str(parsed)


def _locale(value: Any) -> Locale:
    if value not in SUPPORTED_LOCALES:
        raise ContractError("GOOGLE_GREETER_LOCALE_INVALID")
    return value


def _provider_session_id(value: Any) -> str | None:
    if value is None:
        return None
    text = _bounded_string(value, 1, 256, "GOOGLE_GREETER_SESSION_ID_INVALID")
    if not re.fullmatch(r"[A-Za-z0-9._:/-]+", text):
        raise ContractError("GOOGLE_GREETER_SESSION_ID_INVALID")
    return text


def sanitize_context_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", value)
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", " ", text)
    text = re.sub(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        "[email removed]",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\b(?:https?://|www\.)\S+", "[link removed]", text, flags=re.IGNORECASE)
    text = re.sub(r"(?:\+?\d[\d ().-]{7,}\d)", "[phone removed]", text)
    return " ".join(text.split())[:MAX_RESPONSE_CHARACTERS]


def validate_request(payload: Any) -> GreeterRequest:
    request = _mapping(payload, "GOOGLE_GREETER_REQUEST_INVALID")
    _exact_keys(
        request,
        {
            "contractVersion",
            "requestId",
            "session",
            "locale",
            "message",
            "history",
            "maxOutputTokens",
            "temperature",
        },
        "GOOGLE_GREETER_REQUEST_FIELDS_INVALID",
    )
    if request["contractVersion"] != CONTRACT_VERSION:
        raise ContractError("GOOGLE_GREETER_CONTRACT_VERSION_INVALID")

    request_id = _uuid(request["requestId"], "GOOGLE_GREETER_REQUEST_ID_INVALID")
    locale = _locale(request["locale"])
    message = _bounded_string(request["message"], 1, 300, "GOOGLE_GREETER_MESSAGE_INVALID")

    raw_session = request["session"]
    session = None
    if raw_session is not None:
        session_value = _mapping(raw_session, "GOOGLE_GREETER_SESSION_INVALID")
        _exact_keys(
            session_value,
            {"anonymousSessionId", "consentVersion", "providerSessionId"},
            "GOOGLE_GREETER_SESSION_FIELDS_INVALID",
        )
        if session_value["consentVersion"] != CONTEXT_CONSENT_VERSION:
            raise ContractError("GOOGLE_GREETER_CONSENT_VERSION_INVALID")
        session = SessionContext(
            anonymous_session_id=_uuid(
                session_value["anonymousSessionId"],
                "GOOGLE_GREETER_ANONYMOUS_SESSION_INVALID",
            ),
            consent_version=CONTEXT_CONSENT_VERSION,
            provider_session_id=_provider_session_id(session_value["providerSessionId"]),
        )

    raw_history = request["history"]
    if not isinstance(raw_history, Sequence) or isinstance(raw_history, (str, bytes)):
        raise ContractError("GOOGLE_GREETER_HISTORY_INVALID")
    if len(raw_history) > MAX_HISTORY_TURNS:
        raise ContractError("GOOGLE_GREETER_HISTORY_TOO_LARGE")
    if raw_history and session is None:
        raise ContractError("GOOGLE_GREETER_HISTORY_REQUIRES_SESSION_CONSENT")

    history: list[ContextTurn] = []
    history_characters = 0
    for raw_turn in raw_history:
        turn = _mapping(raw_turn, "GOOGLE_GREETER_HISTORY_TURN_INVALID")
        _exact_keys(turn, {"role", "content", "locale"}, "GOOGLE_GREETER_HISTORY_FIELDS_INVALID")
        if turn["role"] not in ("user", "assistant"):
            raise ContractError("GOOGLE_GREETER_HISTORY_ROLE_INVALID")
        content = sanitize_context_text(
            _bounded_string(turn["content"], 1, 650, "GOOGLE_GREETER_HISTORY_CONTENT_INVALID")
        )
        history_characters += len(content)
        if history_characters > MAX_HISTORY_CHARACTERS:
            raise ContractError("GOOGLE_GREETER_HISTORY_TOO_LARGE")
        history.append(ContextTurn(
            role=turn["role"],
            content=content,
            locale=_locale(turn["locale"]),
        ))

    max_output_tokens = request["maxOutputTokens"]
    if (
        isinstance(max_output_tokens, bool)
        or not isinstance(max_output_tokens, int)
        or not 1 <= max_output_tokens <= MAX_OUTPUT_TOKENS
    ):
        raise ContractError("GOOGLE_GREETER_OUTPUT_LIMIT_INVALID")
    temperature = request["temperature"]
    if (
        isinstance(temperature, bool)
        or not isinstance(temperature, (int, float))
        or not 0 <= float(temperature) <= 0.2
    ):
        raise ContractError("GOOGLE_GREETER_TEMPERATURE_INVALID")

    return GreeterRequest(
        request_id=request_id,
        session=session,
        locale=locale,
        message=message,
        history=tuple(history),
        max_output_tokens=max_output_tokens,
        temperature=float(temperature),
    )


def validate_response(response: GreeterResponse) -> dict[str, Any]:
    text = _bounded_string(response.text, 1, MAX_RESPONSE_CHARACTERS, "GOOGLE_GREETER_RESPONSE_INVALID")
    if re.search(
        r"password|payment credentials|send me your|guaranteed|certified organic status confirmed",
        text,
        flags=re.IGNORECASE,
    ):
        raise ContractError("GOOGLE_GREETER_RESPONSE_UNSAFE")
    if (response.input_tokens is None) != (response.output_tokens is None):
        raise ContractError("GOOGLE_GREETER_USAGE_INVALID")
    if response.input_tokens is not None:
        if response.input_tokens < 0 or response.output_tokens is None or response.output_tokens < 0:
            raise ContractError("GOOGLE_GREETER_USAGE_INVALID")
    return GreeterResponse(
        request_id=_uuid(response.request_id, "GOOGLE_GREETER_REQUEST_ID_INVALID"),
        text=text,
        provider_session_id=_provider_session_id(response.provider_session_id),
        input_tokens=response.input_tokens,
        output_tokens=response.output_tokens,
    ).as_dict()
