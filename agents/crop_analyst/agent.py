from google.adk.agents import Agent
from google.adk.models import Gemini
from google.genai import types

from agents.dashboard_agent.tools import get_ui_schema, refresh_crop_schema

crop_analyst_agent = Agent(
    name="crop_analyst_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are an expert crop and soil scientist. Your task is to analyze soil conditions, "
        "detect crop diseases, recommend appropriate crops, and plan fertilization schedules. "
        "LANGUAGE RULE: You MUST respond in the language specified by the coordinator agent. If the coordinator says 'Respond in en', reply in English. If 'Respond in hi', reply in Hindi. If 'Respond in mr', reply in Marathi. If 'Respond in te', reply in Telugu. If 'Respond in sw', reply in Swahili. If 'Respond in zu', reply in Zulu. The language instruction from the coordinator is the single source of truth — ignore the input language. "
        "If the user asks for crop health telemetry, NPK target levels, soil conditions, or crop "
        "dashboard information, you MUST execute the 'refresh_crop_schema' tool first to retrieve "
        "live weather data, then you MUST execute the 'get_ui_schema' tool with 'crop_dashboard' as input "
        "and output the raw JSON block in your response so the client can render it."
    ),
    tools=[refresh_crop_schema, get_ui_schema],
)
