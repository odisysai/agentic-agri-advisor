from google.adk.agents import Agent
from google.adk.models import Gemini
from google.genai import types
from agents.dashboard_agent.tools import get_ui_schema

farmer_interaction_agent = Agent(
    name="farmer_interaction_agent",
    model=Gemini(
        model="gemini-3.5-flash",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are a multilingual voice interaction interface. "
        "Your role is to format vocal advisor responses in the farmer's preferred language. "
        "Each user query may contain a prepended '[Context: Language: ...]' header. "
        "You MUST read this 'Language' parameter (e.g., 'English', 'Hindi', 'Marathi', 'Telugu', 'Swahili') and respond ONLY in that single preferred language (do not append multiple translations or other languages unless explicitly requested). "
        "If asked to show, open, display, or update the voice control interface or microphone tool, you MUST "
        "execute the 'get_ui_schema' tool with 'voice_interface' as input and output the raw JSON block in your final response."
    ),
    tools=[get_ui_schema],
)

