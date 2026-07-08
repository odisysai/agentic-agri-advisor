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


def test_hindi_sastri_explains_local_vision_result_without_english_fallback_label():
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
        'Farmer uploaded a crop photo. Local vision result: Tomato — Possible Nutrient Deficiency (Yellowing).',
        {
          crop: 'tomato',
          soil: 'clay',
          language: 'Hindi',
          visionResult: {
            crop: 'tomato',
            disease_name: 'Tomato — Possible Nutrient Deficiency (Yellowing)',
            confidence: 'Low (heuristic)',
            severity: 'Moderate',
            mode: 'fallback_heuristic',
            ml_runtime_used: false
          }
        }
      );
      if (!reply.includes('फोटो')) throw new Error(reply);
      if (!reply.includes('स्थानीय')) throw new Error(reply);
      if (!reply.includes('पोषक कमी')) throw new Error(reply);
      if (/Nutrient Deficiency|Yellowing|Tomato|Pathologist|Coordinator|\*\*/.test(reply)) throw new Error(reply);
      if (!reply.includes('कृषि विशेषज्ञ')) throw new Error(reply);
    })().catch(err => { console.error(err); process.exit(1); });
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_hindi_sastri_rejects_internal_mixed_litert_reply_and_falls_back_cleanly():
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
      engine.llmLoaded = true;
      engine.llmConversation = {};
      engine.generateWithLiteRt = async () => 'समन्वयक (Coordinator) profile.soil.blackclay Pathologist Crop Analyst';
      const reply = await engine.generateText(
        'मेरे खेत में टमाटर की फसल है। पत्ते पीले हो रहे हैं। मुझे क्या करना चाहिए?',
        { crop: 'corn', soil: 'blackclay', language: 'Hindi' }
      );
      if (!reply.includes('टमाटर')) throw new Error(reply);
      if (!reply.includes('नमी') || !reply.includes('पानी')) throw new Error(reply);
      if (/[A-Za-z]/.test(reply)) throw new Error(reply);
      if (/Coordinator|Pathologist|Crop Analyst|profile\.|soil\.|blackclay|\*\*/.test(reply)) throw new Error(reply);
    })().catch(err => { console.error(err); process.exit(1); });
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_litert_generation_timeout_prevents_hanging_farmer_reply():
    script = r"""
    (async () => {
      const fs = require('fs');
      const vm = require('vm');
      global.window = { KRISHI_MODEL_GENERATION_TIMEOUT_MS: 10 };
      global.navigator = { gpu: {}, onLine: false };
      global.caches = { open: async () => ({ match: async () => null }) };
      window.LocalDb = class { async getOkfGuide() { return null; } };
      vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
      const engine = new window.LocalAiEngine();
      engine.llmConversation = { sendMessage: () => new Promise(() => {}) };
      try {
        await engine.generateWithLiteRt(
          'मेरे खेत में टमाटर की फसल है। पत्ते पीले हो रहे हैं।',
          { crop: 'tomato', soil: 'clay', language: 'Hindi' },
          'crop=टमाटर'
        );
        throw new Error('LiteRT generation did not time out');
      } catch (err) {
        if (!/LiteRT-LM generation timed out/.test(err.message)) throw err;
      }
    })().catch(err => { console.error(err); process.exit(1); });
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_hindi_sastri_generation_timeout_falls_back_cleanly():
    script = r"""
    (async () => {
      const fs = require('fs');
      const vm = require('vm');
      global.window = { KRISHI_MODEL_GENERATION_TIMEOUT_MS: 10 };
      global.navigator = { gpu: {}, onLine: false };
      global.caches = { open: async () => ({ match: async () => null }) };
      window.LocalDb = class { async getOkfGuide() { return null; } };
      vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
      const engine = new window.LocalAiEngine();
      engine.llmLoaded = true;
      engine.llmConversation = { sendMessage: () => new Promise(() => {}) };
      const reply = await engine.generateText(
        'मेरे खेत में टमाटर की फसल है। पत्ते पीले हो रहे हैं। मुझे क्या करना चाहिए?',
        { crop: 'corn', soil: 'clay', language: 'Hindi' }
      );
      if (!reply.includes('टमाटर')) throw new Error(reply);
      if (!reply.includes('नमी') || !reply.includes('पानी')) throw new Error(reply);
      if (/[A-Za-z]/.test(reply)) throw new Error(reply);
      if (/Coordinator|Pathologist|Crop Analyst|profile\.|soil\.|blackclay|\*\*/.test(reply)) throw new Error(reply);
    })().catch(err => { console.error(err); process.exit(1); });
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_litert_response_parser_accepts_common_browser_shapes():
    script = r"""
    const fs = require('fs');
    const vm = require('vm');
    global.window = {};
    global.navigator = { gpu: {}, onLine: false };
    global.caches = { open: async () => ({ match: async () => null }) };
    window.LocalDb = class { async getOkfGuide() { return null; } };
    vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
    const engine = new window.LocalAiEngine();
    const samples = [
      ['सीधा उत्तर', 'सीधा उत्तर'],
      [{ text: 'टेक्स्ट उत्तर' }, 'टेक्स्ट उत्तर'],
      [{ message: 'मैसेज उत्तर' }, 'मैसेज उत्तर'],
      [{ content: [{ text: 'कंटेंट उत्तर' }] }, 'कंटेंट उत्तर'],
      [{ candidates: [{ text: 'कैंडिडेट उत्तर' }] }, 'कैंडिडेट उत्तर']
    ];
    for (const [input, expected] of samples) {
      const actual = engine.extractLiteRtText(input);
      if (actual !== expected) throw new Error(`${actual} !== ${expected}`);
    }
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_hindi_farmer_safe_reply_allows_standard_agronomy_tokens():
    script = r"""
    const fs = require('fs');
    const vm = require('vm');
    global.window = {};
    global.navigator = { gpu: {}, onLine: false };
    global.caches = { open: async () => ({ match: async () => null }) };
    window.LocalDb = class { async getOkfGuide() { return null; } };
    vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
    const engine = new window.LocalAiEngine();
    const reply = 'नमस्ते किसान भाई। मिट्टी का pH 6.5 रखें। NPK PPM जांचें और नीम तेल 5 ml प्रति लीटर दें।';
    if (!engine.isFarmerSafeReply(reply, 'Hindi')) {
      throw new Error(engine.farmerSafetyIssue(reply, 'Hindi'));
    }
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_hindi_farmer_safe_reply_rejects_real_english_sentence():
    script = r"""
    const fs = require('fs');
    const vm = require('vm');
    global.window = {};
    global.navigator = { gpu: {}, onLine: false };
    global.caches = { open: async () => ({ match: async () => null }) };
    window.LocalDb = class { async getOkfGuide() { return null; } };
    vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
    const engine = new window.LocalAiEngine();
    const reply = 'नमस्ते किसान भाई। Spray neem oil and check soil moisture.';
    if (engine.isFarmerSafeReply(reply, 'Hindi')) {
      throw new Error('English sentence was accepted');
    }
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_hindi_farmer_safe_reply_rejects_wrong_crop():
    script = r"""
    const fs = require('fs');
    const vm = require('vm');
    global.window = {};
    global.navigator = { gpu: {}, onLine: false };
    global.caches = { open: async () => ({ match: async () => null }) };
    window.LocalDb = class { async getOkfGuide() { return null; } };
    vm.runInThisContext(fs.readFileSync('ui/agui/local_models.js', 'utf8'));
    const engine = new window.LocalAiEngine();
    const reply = 'नमस्ते किसान भाई। मक्के की फसल में टहनियों के छेदक की समस्या हो सकती है।';
    const issue = engine.farmerSafetyIssue(reply, 'Hindi', { crop: 'chilli' });
    if (issue !== 'crop_mismatch') throw new Error(issue);
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)


def test_hindi_chilli_spots_reply_includes_safe_steps_before_expert():
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
        'मेरी मिर्च की फसल के पत्तों पर छोटे-छोटे धब्बे दिख रहे हैं। मिट्टी में पानी भी ज्यादा रुक रहा है। क्या यह बीमारी हो सकती है?',
        { crop: 'chilli', soil: 'clay', language: 'Hindi', forceRuleFallback: true }
      );
      if (!reply.includes('मिर्च')) throw new Error(reply);
      if (!reply.includes('पहले सुरक्षित कदम')) throw new Error(reply);
      if (!reply.includes('निकासी सुधारें')) throw new Error(reply);
      if (!reply.includes('हवा रखें')) throw new Error(reply);
      if (reply.indexOf('पहले सुरक्षित कदम') > reply.indexOf('कृषि विशेषज्ञ')) throw new Error(reply);
      if (/Coordinator|Pathologist|Crop Analyst|profile\.|soil\.|blackclay|\*\*/.test(reply)) throw new Error(reply);
    })().catch(err => { console.error(err); process.exit(1); });
    """

    subprocess.run(["node", "-e", script], cwd=".", check=True)
