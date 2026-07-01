import os
import litert_lm
from mcp.server.fastmcp import FastMCP
from google import genai
from google.genai import types

mcp = FastMCP("STT-Voice-Server")

# Initialize the local Gemma-4-12B-it model from the Google AI Edge Gallery Documents cache
model_path = "/Users/ncgiri/Library/Application Support/com.google.AIEdgeGallery/Documents/Gemma_4_12B_it/v0/gemma-4-12B-it.litertlm"
engine = None

try:
    if os.path.exists(model_path):
        print(f"Loading Local Gemma-4-12B ASR Engine from: {model_path} ...")
        # Load model on Apple GPU, using CPU for audio preprocessing channel
        backend = litert_lm.Backend.GPU()
        audio_backend = litert_lm.Backend.CPU()
        engine = litert_lm.Engine(model_path, backend=backend, audio_backend=audio_backend)
        print("Local Gemma-4-12B ASR Engine successfully loaded on GPU!")
    else:
        print(f"Warning: Local Gemma-4-12B model not found at {model_path}. Cloud fallback active.")
except Exception as e:
    print(f"Warning: Could not initialize local Gemma-4-12B Engine: {e}. Cloud fallback active.")


@mcp.tool()
async def speech_to_text(audio_path: str) -> str:
    """Transcribe farmer audio queries into text. Uses local Gemma-4-12B-it on GPU with cloud fallback.

    Args:
        audio_path: Path to the audio file to transcribe.
    """
    if not os.path.exists(audio_path):
        return f"Error: Audio file {audio_path} not found."
        
    # 1. Try local on-device Gemma-4-12B transcription first
    if engine:
        try:
            print(f"Transcribing {audio_path} locally via Gemma-4-12B...")
            with engine.create_conversation() as conv:
                multimodal_input = litert_lm.Contents.of(
                    litert_lm.Content.AudioFile(absolute_path=audio_path),
                    "Transcribe the spoken words in this agricultural audio query verbatim. Do not add any introduction or comments."
                )
                response = conv.send_message(multimodal_input)
                transcription = response["content"][0]["text"].strip()
                if transcription:
                    print(f"Local ASR Success: '{transcription}'")
                    return transcription
        except Exception as local_err:
            print(f"Local Gemma-4-12B transcription failed: {local_err}. Falling back to Cloud Gemini.")

    # 2. Cloud Fallback (Gemini API)
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
            uploaded_file = client.files.upload(file=audio_path)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[uploaded_file, "Transcribe this agricultural audio query verbatim."]
            )
            return response.text
        except Exception as e:
            return f"Error transcribing via Gemini: {e}"
            
    return "Farmer Query (Mocked): What is the best treatment for late blight on potatoes?"
