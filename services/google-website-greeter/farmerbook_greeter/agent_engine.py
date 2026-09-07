"""Vertex AI Agent Engine source entry point; this module never deploys itself."""

from vertexai.agent_engines import AdkApp

from .agent import root_agent

adk_app = AdkApp(
    agent=root_agent,
    app_name="farmerbook_website_greeter",
)
