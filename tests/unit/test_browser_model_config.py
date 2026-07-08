import subprocess


def test_crop_classifier_uses_runtime_model_url_config():
    script = r"""
    const fs = require('fs');
    const vm = require('vm');
    global.window = {
      KRISHI_CROP_CLASSIFIER_MODEL_URL: 'https://storage.googleapis.com/demo-assets/models/crop_disease_classifier.tflite'
    };
    vm.runInThisContext(fs.readFileSync('ui/agui/crop_classifier.js', 'utf8'));
    const classifier = new window.CropClassifier();
    if (classifier.modelUrl !== window.KRISHI_CROP_CLASSIFIER_MODEL_URL) {
      throw new Error(`unexpected modelUrl ${classifier.modelUrl}`);
    }
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_local_ai_engine_defaults_to_litertlm_model_name():
    script = r"""
    const fs = require('fs');
    const vm = require('vm');
    global.window = {};
    global.navigator = { gpu: {}, onLine: false };
    global.caches = { open: async () => ({ match: async () => null }) };
    window.LocalDb = class { async getOkfGuide() { return null; } };
    vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
    const engine = new window.LocalAiEngine();
    if (engine.modelName !== 'Gemma-4-E2B') throw new Error(engine.modelName);
    if (!engine.modelUrl.endsWith('/models/gemma-4-E2B-it-web.litertlm')) {
      throw new Error(engine.modelUrl);
    }
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)
