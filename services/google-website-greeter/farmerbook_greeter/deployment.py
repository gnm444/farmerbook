"""Validated, non-secret Agent Runtime deployment configuration."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import re


class DeploymentConfigurationError(ValueError):
    pass


_PROJECT_PATTERN = re.compile(r"[a-z][a-z0-9-]{4,28}[a-z0-9]")
_LOCATION_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_BUCKET_PATTERN = re.compile(r"gs://[a-z0-9][a-z0-9._-]{1,61}[a-z0-9](?:/[A-Za-z0-9._/-]+)?")
ALLOWED_MODELS = ("gemini-2.5-flash-lite", "gemini-2.5-flash")


@dataclass(frozen=True)
class DeploymentPlan:
    project: str
    location: str
    staging_bucket: str
    model: str
    display_name: str = "FarmerBook website greeter canary"
    min_instances: int = 0
    max_instances: int = 1
    identity_type: str = "AGENT_IDENTITY"

    def public_summary(self) -> dict[str, object]:
        """Return only non-secret metadata suitable for logs and dry runs."""
        return asdict(self)


def build_deployment_plan(
    *,
    project: str,
    location: str,
    staging_bucket: str,
    model: str,
) -> DeploymentPlan:
    project = project.strip()
    location = location.strip()
    staging_bucket = staging_bucket.strip().rstrip("/")
    model = model.strip()
    if not _PROJECT_PATTERN.fullmatch(project):
        raise DeploymentConfigurationError("GOOGLE_CLOUD_PROJECT_INVALID")
    if not _LOCATION_PATTERN.fullmatch(location):
        raise DeploymentConfigurationError("GOOGLE_CLOUD_LOCATION_INVALID")
    if not _BUCKET_PATTERN.fullmatch(staging_bucket):
        raise DeploymentConfigurationError("GOOGLE_CLOUD_STAGING_BUCKET_INVALID")
    if model not in ALLOWED_MODELS:
        raise DeploymentConfigurationError("FARMERBOOK_GOOGLE_MODEL_INVALID")
    return DeploymentPlan(
        project=project,
        location=location,
        staging_bucket=staging_bucket,
        model=model,
    )


def deployment_requirements(service_root: Path) -> Path:
    requirements = service_root / "requirements.lock"
    if not requirements.is_file():
        raise DeploymentConfigurationError("REQUIREMENTS_LOCK_REQUIRED")
    return requirements


def validate_resource_name(
    resource_name: str,
    *,
    project: str,
    location: str,
) -> str:
    """Validate that an update targets this deployment plan's exact scope."""
    expected = re.compile(
        rf"projects/{re.escape(project)}/locations/{re.escape(location)}"
        r"/reasoningEngines/[0-9]+"
    )
    if not expected.fullmatch(resource_name):
        raise DeploymentConfigurationError("GOOGLE_AGENT_ENGINE_RESOURCE_INVALID")
    return resource_name
