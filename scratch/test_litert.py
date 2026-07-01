import litert_lm
import sys

model_path = "/Users/ncgiri/Library/Application Support/com.google.AIEdgeGallery/Documents/Gemma_4_12B_it/v0/gemma-4-12B-it.litertlm"
print("Loading model...")
backend = litert_lm.Backend.GPU()
try:
    with litert_lm.Engine(model_path, backend=backend) as engine:
        print("Model loaded successfully!")
        with engine.create_conversation() as conv:
            print("Conversation created!")
            resp = conv.send_message("Explain soil nitrogen in 1 sentence.")
            print("Response:", resp)
except Exception as e:
    print("Error:", e)
