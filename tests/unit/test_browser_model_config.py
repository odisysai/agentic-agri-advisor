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
