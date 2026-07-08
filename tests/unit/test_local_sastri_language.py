import subprocess


def test_hindi_sastri_local_response_does_not_leak_english_or_internal_names():
    script = r"""
    (async () => {
      const fs = require('fs');
      const vm = require('vm');
      global.window = {};
      global.navigator = { gpu: {}, onLine: false };
      global.caches = { open: async () => ({ match: async () => null }) };
      window.LocalDb = class { async getOkfGuide() { return null; } };
      vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
      const engine = new window.LocalAiEngine();
      const reply = await engine.generateText(
        'मेरी मिर्च की फसल के पत्तों पर छोटे-छोटे धब्बे दिख रहे हैं। क्या यह बीमारी हो सकती है?',
        { crop: 'corn', soil: 'clay', language: 'Hindi' }
      );
      if (/[A-Za-z]/.test(reply)) throw new Error(reply);
      if (/Pathologist|Coordinator|Running|\*\*/.test(reply)) throw new Error(reply);
      if (!reply.includes('कृषि विशेषज्ञ')) throw new Error(reply);
    })().catch(err => { console.error(err); process.exit(1); });
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_hindi_sastri_question_crop_overrides_profile_crop_for_tomato():
    script = r"""
    (async () => {
      const fs = require('fs');
      const vm = require('vm');
      global.window = {};
      global.navigator = { gpu: {}, onLine: false };
      global.caches = { open: async () => ({ match: async () => null }) };
      window.LocalDb = class { async getOkfGuide() { return null; } };
      vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
      const engine = new window.LocalAiEngine();
      const reply = await engine.generateText(
        'मेरे खेत में टमाटर की फसल है। पत्ते पीले हो रहे हैं। मुझे क्या करना चाहिए?',
        { crop: 'corn', soil: 'clay', language: 'Hindi' }
      );
      if (!reply.includes('टमाटर')) throw new Error(reply);
      if (reply.includes('मक्का') || /Corn|Maize|Pathologist|Coordinator|\*\*/.test(reply)) throw new Error(reply);
      if (!reply.includes('नमी') || !reply.includes('पानी')) throw new Error(reply);
    })().catch(err => { console.error(err); process.exit(1); });
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)
