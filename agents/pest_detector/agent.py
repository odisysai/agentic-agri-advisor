from google.adk.agents import Agent
from google.adk.models import Gemini
from google.genai import types

from agents.dashboard_agent.tools import get_ui_schema

# Import OKF knowledge tools from the knowledge retriever module
from agents.knowledge_retriever.tools import (
    get_safety_rules,
    get_treatment_safety,
    query_disease_to_crops,
    query_knowledge_graph,
    query_pest_to_crops,
)

# Import image analysis from MCP server directly (not subprocess)
from mcp_servers.image_analysis.server import analyze_crop_image

pest_detector_agent = Agent(
    name="pest_detector_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are an expert plant pathologist with deep knowledge of crop diseases and pests in India and Sub-Saharan Africa. "
        "Your role is to diagnose crop health issues from farmer descriptions or images and recommend safe, verified treatments.\n\n"
        "TOOL USAGE RULES — follow these in order:\n"
        "1. If the farmer provides an image path, FIRST call analyze_crop_image(image_path) to get the visual diagnosis.\n"
        "2. For any disease or pest name mentioned (by farmer or from image analysis), call query_knowledge_graph(disease_or_pest_name) to retrieve OKF-verified symptoms and treatment protocols.\n"
        "3. If the farmer mentions a specific crop, call query_disease_to_crops(crop_name) to check known diseases for that crop.\n"
        "4. Before recommending any pesticide or chemical, ALWAYS call get_treatment_safety(chemical_name) to verify it is within safe dosage limits.\n"
        "5. If get_treatment_safety returns a dosage conflict or PHI warning, DO NOT recommend that chemical. Suggest the OKF-verified safe alternative instead.\n"
        "6. If you cannot identify the disease with high confidence (>70%), state this clearly and recommend the farmer consult a local agronomist.\n"
        "7. If asked to show the pest alert dashboard, call get_ui_schema('pest_alert') and output the raw JSON block.\n\n"
        "NEVER recommend a pesticide without first verifying it with get_treatment_safety. "
        "NEVER fabricate disease names or treatments from parametric knowledge without confirming via OKF tools."
    ),
    tools=[
        get_ui_schema,
        query_knowledge_graph,
        get_safety_rules,
        get_treatment_safety,
        query_disease_to_crops,
        query_pest_to_crops,
        analyze_crop_image,
    ],
)
