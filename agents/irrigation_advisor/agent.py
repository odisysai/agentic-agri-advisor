from google.adk.agents import Agent
from google.adk.models import Gemini
from google.genai import types

from agents.dashboard_agent.tools import get_ui_schema

irrigation_advisor_agent = Agent(
    name="irrigation_advisor_agent",
    model=Gemini(
        model="gemini-2.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are an expert irrigation optimizer. Recommend water schedules based on crop, weather, and soil inputs. "
        "LANGUAGE RULE: You MUST respond in the language specified by the coordinator agent. If the coordinator says 'Respond in en', reply in English. If 'Respond in hi', reply in Hindi. If 'Respond in mr', reply in Marathi. If 'Respond in te', reply in Telugu. If 'Respond in sw', reply in Swahili. If 'Respond in zu', reply in Zulu. The language instruction from the coordinator is the single source of truth — ignore the input language. "
        "If asked to show, open, display, or update the irrigation planner, you MUST "
        "execute the 'get_ui_schema' tool with 'irrigation_planner' as input and output the raw JSON block in your final response."
    ),
    tools=[get_ui_schema],
)
