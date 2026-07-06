import os

from google import genai
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Translation-Server")

MOCK_TRANSLATIONS = {
    "es": {"hello": "hola", "water": "agua", "corn": "maíz"},
    "sw": {"hello": "jambo", "water": "maji", "corn": "mahindi"},
    "zu": {"hello": "sawubona", "water": "amanzi", "corn": "ummbila"},
}


@mcp.tool()
async def translate_text(text: str, target_lang: str) -> str:
    """Translate agricultural advice or queries into a target language using Gemini.

    Args:
        text: Text string to translate.
        target_lang: Language code (e.g., 'es' for Spanish, 'sw' for Swahili).
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    client = None
    try:
        if api_key:
            client = genai.Client(api_key=api_key)
        else:
            client = genai.Client()
    except Exception as e:
        print(f"Warning: Could not initialize Google GenAI Client: {e}")

    if client:
        try:
            prompt = f"Translate the following text to language code '{target_lang}'. Output only the translation: {text}"
            response = client.models.generate_content(
                model="gemini-2.5-flash", contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"Gemini translation failed: {e}")

    lang = target_lang.lower().strip()
    words = text.lower().split()
    translated = []

    for word in words:
        clean = word.strip(".,!?")
        if lang in MOCK_TRANSLATIONS and clean in MOCK_TRANSLATIONS[lang]:
            translated.append(MOCK_TRANSLATIONS[lang][clean])
        else:
            translated.append(word)

    return f"[Mock Translation to {lang}]: " + " ".join(translated)
