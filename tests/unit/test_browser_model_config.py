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


def test_local_ai_engine_reads_model_timeout_config():
    script = r"""
    const fs = require('fs');
    const vm = require('vm');
    global.window = {
      KRISHI_MODEL_INIT_TIMEOUT_MS: 1234,
      KRISHI_MODEL_GENERATION_TIMEOUT_MS: 5678,
      KRISHI_MODEL_ANSWER_TIMEOUT_MS: 9012
    };
    global.navigator = { gpu: {}, onLine: false };
    global.caches = { open: async () => ({ match: async () => null }) };
    window.LocalDb = class { async getOkfGuide() { return null; } };
    vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
    const engine = new window.LocalAiEngine();
    if (engine.modelInitTimeoutMs !== 1234) throw new Error(engine.modelInitTimeoutMs);
    if (engine.generationTimeoutMs !== 5678) throw new Error(engine.generationTimeoutMs);
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)
