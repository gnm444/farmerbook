"""Create the tool-free greeter in Google Agent Runtime using ADC.

Run this only from an authenticated operator environment such as Google Cloud
Shell. It deliberately accepts no service-account key or credential argument.
"""

from __future__ import annotations

import argparse
from contextlib import chdir
import json
import os
from pathlib import Path
from typing import Sequence

from .deployment import (
    ALLOWED_MODELS,
    build_deployment_plan,
    deployment_requirements,
    validate_resource_name,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--location", required=True)
    parser.add_argument("--staging-bucket", required=True)
    parser.add_argument("--model", required=True, choices=ALLOWED_MODELS)
    parser.add_argument(
        "--resource-name",
        help="Update this exact existing Agent Engine instead of creating one.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print non-secret deployment metadata only.",
    )
    return parser


def _resource_name(remote_agent: object) -> str:
    for candidate in (
        getattr(remote_agent, "resource_name", None),
        getattr(remote_agent, "name", None),
        getattr(getattr(remote_agent, "api_resource", None), "name", None),
    ):
        if isinstance(candidate, str) and candidate:
            return candidate
    return "created-resource-name-unavailable"


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    service_root = Path(__file__).resolve().parents[1]
    plan = build_deployment_plan(
        project=args.project,
        location=args.location,
        staging_bucket=args.staging_bucket,
        model=args.model,
    )
    requirements = deployment_requirements(service_root)
    resource_name = (
        validate_resource_name(
            args.resource_name,
            project=plan.project,
            location=plan.location,
        )
        if args.resource_name
        else None
    )
    if args.dry_run:
        print(json.dumps({"action": "dry-run", **plan.public_summary()}, sort_keys=True))
        return 0

    # These values are non-secret runtime metadata. Authentication comes only
    # from Application Default Credentials in the operator environment.
    os.environ.update({
        "GOOGLE_GENAI_USE_VERTEXAI": "TRUE",
        "GOOGLE_CLOUD_PROJECT": plan.project,
        "GOOGLE_CLOUD_LOCATION": plan.location,
        "FARMERBOOK_GOOGLE_MODEL": plan.model,
    })

    import vertexai
    from vertexai import types

    from .agent_engine import adk_app

    client = vertexai.Client(project=plan.project, location=plan.location)
    config = {
        "requirements": str(requirements),
        # The SDK preserves the paths given here when it builds its dependency
        # archive. Supplying an absolute path nests the package under the
        # operator's workstation path and makes ``farmerbook_greeter.agent``
        # unavailable in
        # the runtime. Run the synchronous upload from the service root and
        # package ``farmerbook_greeter`` at the archive root instead. A unique
        # package name also avoids Google's reserved runtime ``app`` package.
        "extra_packages": ["farmerbook_greeter"],
        "staging_bucket": plan.staging_bucket,
        "display_name": plan.display_name,
        "description": (
            "Purpose-limited, tool-free FarmerBook website greeter canary; "
            "English, Telugu, and Hindi only."
        ),
        "labels": {
            "application": "farmerbook",
            "surface": "website-greeter-canary",
        },
        "env_vars": {
            "GOOGLE_GENAI_USE_VERTEXAI": "TRUE",
            "FARMERBOOK_GOOGLE_MODEL": plan.model,
        },
        "identity_type": types.IdentityType.AGENT_IDENTITY,
        "min_instances": plan.min_instances,
        "max_instances": plan.max_instances,
        "agent_framework": "google-adk",
    }
    with chdir(service_root):
        if resource_name:
            remote_agent = client.agent_engines.update(
                name=resource_name,
                agent=adk_app,
                config=config,
            )
            action = "updated"
        else:
            remote_agent = client.agent_engines.create(agent=adk_app, config=config)
            action = "created"
    print(json.dumps({
        "action": action,
        "project": plan.project,
        "location": plan.location,
        "resourceName": _resource_name(remote_agent),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
