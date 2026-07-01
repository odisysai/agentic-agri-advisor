import litert_lm

model_path = "/Users/ncgiri/Library/Application Support/com.google.AIEdgeGallery/Documents/Gemma_4_12B_it/v0/gemma-4-12B-it.litertlm"
backend = litert_lm.Backend.GPU()
try:
    with litert_lm.Engine(model_path, backend=backend) as engine:
        print("Model loaded!")
        with engine.create_conversation() as conv:
            resp = conv.send_message("Please read the following word aloud: Hello.")
            print("Response:", resp)
except Exception as e:
    print("Error:", e)
