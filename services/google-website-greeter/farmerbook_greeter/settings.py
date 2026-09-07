"""Non-secret runtime metadata validation for the Google greeter."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import re


class SettingsError(RuntimeError):
    pass


@dataclass(frozen=True)
class RuntimeSettings:
    project: str
    location: str
    model: str


ALLOWED_MODELS = frozenset({"gemini-2.5-flash-lite", "gemini-2.5-flash"})


def load_settings(environment: Mapping[str, str]) -> RuntimeSettings:
    if environment.get("GOOGLE_GENAI_USE_VERTEXAI", "").strip().upper() != "TRUE":
        raise SettingsError("GOOGLE_VERTEX_MODE_REQUIRED")
    project = environment.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", project):
        raise SettingsError("GOOGLE_CLOUD_PROJECT_REQUIRED")
    location = environment.get("GOOGLE_CLOUD_LOCATION", "").strip()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", location):
        raise SettingsError("GOOGLE_CLOUD_LOCATION_REQUIRED")
    model = environment.get("FARMERBOOK_GOOGLE_MODEL", "").strip()
    if model not in ALLOWED_MODELS:
        raise SettingsError("FARMERBOOK_GOOGLE_MODEL_REQUIRED")
    return RuntimeSettings(project=project, location=location, model=model)
