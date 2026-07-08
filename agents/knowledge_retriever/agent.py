from google.adk.agents import Agent
from google.adk.models import Gemini
from google.genai import types

# Import knowledge retriever tools from the tools module
from agents.knowledge_retriever.tools import (
    get_safety_rules,
    get_treatment_safety,
    query_crop_profile,
    query_disease_to_crops,
    query_knowledge_graph,
    query_pest_to_crops,
)

# Pre-wire the tools as a module-level tuple for ADK compatibility
_retriever_tools = (
    query_knowledge_graph,
    get_safety_rules,
    get_treatment_safety,
    query_crop_profile,
    query_disease_to_crops,
    query_pest_to_crops,
)

INSTRUCTION = (
    "You are 'Krishi Gyan' (\u0915\u0943\u0937\u093f \u091c\u094d\u091e\u093e\u0928), "
    "the agricultural knowledge retriever agent. Your role is to look up verified, "
    "curated information from the Open Knowledge Graph (OKF) and return structured data."
    "\n\n"
    "Available Tools:\n"
    "- query_knowledge_graph(query): Search OKF for diseases, pests, soil types.\n"
    "- get_safety_rules(query): Retrieve pesticide safety rules and guidelines.\n"
    "- get_treatment_safety(chemical_name): Get safety constraints (PHI, max dose).\n"
    "- query_crop_profile(crop_name): Get full crop profile (varieties, NPK, water).\n"
    "- query_disease_to_crops(disease_name): Get disease profile + affected crops.\n"
    "- query_pest_to_crops(pest_name): Get pest profile + affected crops.\n\n"
    "IMPORTANT RULES:\n"
    "1. ALWAYS use query_crop_profile() when the farmer mentions a crop name.\n"
    "2. If user describes symptoms (spots, wilting), use query_disease_to_crops().\n"
    "3. If user mentions a pest (borer, moth), use query_pest_to_crops().\n"
    "4. If farmer mentions pesticide names, check with get_treatment_safety() first.\n"
    "5. Return ONLY the raw dict output, no commentary or formatting."
)

knowledge_retriever_agent = Agent(
    name="knowledge_retriever_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=INSTRUCTION,
    tools=_retriever_tools,
)
