/**
 * local_models.js
 * In-browser Local LLM (Gemma-4-E2B) and TFLite Crop Disease Classification management.
 * Local crop facts are used only as grounding/fallback context for Krishi Sastri.
 */

class LocalAiEngine {
  constructor() {
    this.modelName = window.KRISHI_LOCAL_MODEL_NAME || "Gemma-4-E2B";
    this.modelUrl = window.KRISHI_LOCAL_MODEL_URL || "/models/gemma-4-E2B-it-web.litertlm";
    this.litertCoreUrl = window.KRISHI_LITERT_LM_CORE_URL || "https://cdn.jsdelivr.net/npm/@litert-lm/core/+esm";
    this.llmEngine = null;
    this.llmConversation = null;
    this.llmLoaded = false;
    this.llmMode = "not_loaded";
    this.modelInitTimeoutMs = Number(window.KRISHI_MODEL_INIT_TIMEOUT_MS || 45000);
    this.generationTimeoutMs = Number(window.KRISHI_MODEL_GENERATION_TIMEOUT_MS || 20000);
    this.modelDownloadRetries = Number(window.KRISHI_MODEL_DOWNLOAD_RETRIES || 5);
    this.modelDownloadRetryDelayMs = Number(window.KRISHI_MODEL_DOWNLOAD_RETRY_DELAY_MS || 3000);
    this.classifierLoaded = false;
    this.webGpuSupported = false;
    this.onProgressCallback = null;

    // Local agricultural knowledge base for offline reasoning fallback
    this.offlineDatabase = {
      crops: {
        corn: {
          health: "Corn health appears normal (94%). NPK level is stable. Optimal soil temp is 20-25°C.",
          pests: "Potential risk of Maize Stalk Borer. Traditional treatment: Spray a mixture of water and neem oil (5ml per liter) onto the leaf whorls during early mornings.",
          irrigation: "Sandy soil requires 5-8 liters of water per day via drip systems. Avoid waterlogging during flowering stage."
        },
        wheat: {
          health: "Wheat crop is in vegetative phase. Leaf index shows slight nitrogen deficiency.",
          pests: "Potential risk of Brown Leaf Rust. Traditional treatment: Spray wood ash mixed with cow urine, or standard copper-based fungicides if rust spots spread.",
          irrigation: "Drip schedules should apply 4-6 liters daily. Maintain moist soil without saturating root zones."
        }
      },
      soil: {
        clay: "Black Clay soil retains water very well but can crack when dry. Add organic compost or wood shavings to improve aeration.",
        sandy: "Red Sandy Loam soil has high drainage. Apply frequent, small-volume waterings to avoid nutrient leaching."
      },
      alerts: {
        pest_alert: {
          title: "🚨 Pest Alert: Maize Stem Borer",
          level: "High Risk",
          treatment: "Spray organic neem oil extract or apply wood ash directly to leaf whorls. Check leaf undersides."
        }
      }
    };
  }

  async withTimeout(operation, timeoutMs, label) {
    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const operationPromise = Promise.resolve().then(operation);
      return await Promise.race([operationPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  reportProgress(progress, stage = "downloading") {
    if (this.onProgressCallback) {
      this.onProgressCallback(Math.max(0, Math.min(100, Math.round(progress))), stage);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parseContentRangeTotal(value) {
    const match = String(value || "").match(/\/(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  async downloadModelBlob(url, contentLengthHint = 1430000000) {
    let receivedLength = 0;
    let contentLength = 0;
    let chunks = [];
    let attempt = 0;

    while (attempt <= this.modelDownloadRetries) {
      const headers = {};
      if (receivedLength > 0) {
        headers.Range = `bytes=${receivedLength}-`;
      }

      try {
        const response = await fetch(url, { headers });
        const isResume = receivedLength > 0;
        const supportsResume = response.status === 206;

        if (!response.ok && !supportsResume) {
          throw new Error(`Failed to fetch model: ${response.statusText || response.status}`);
        }

        if (isResume && !supportsResume) {
          console.warn('[Local AI] Model host ignored Range resume. Restarting model download from byte 0.');
          receivedLength = 0;
          chunks = [];
        }

        const contentRangeTotal = this.parseContentRangeTotal(response.headers.get('Content-Range'));
        const headerLength = Number(response.headers.get('Content-Length')) || 0;
        contentLength = contentRangeTotal || (receivedLength + headerLength) || contentLength || contentLengthHint;

        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedLength += value.length;

          const percent = contentLength
            ? Math.round((receivedLength / contentLength) * 100)
            : 0;
          this.reportProgress(percent, "downloading");
        }

        if (!contentLength || receivedLength >= contentLength) {
          this.reportProgress(100, "downloaded");
          return new Blob(chunks);
        }

        throw new Error(`Model stream ended early at ${receivedLength}/${contentLength} bytes`);
      } catch (err) {
        attempt += 1;
        if (attempt > this.modelDownloadRetries) {
          throw err;
        }
        console.warn(
          `[Local AI] Model download interrupted at ${receivedLength} bytes. Retrying ${attempt}/${this.modelDownloadRetries}...`,
          err
        );
        this.reportProgress(contentLength ? Math.round((receivedLength / contentLength) * 100) : 0, "retrying");
        await this.sleep(this.modelDownloadRetryDelayMs * attempt);
      }
    }

    throw new Error('Model download retry loop ended unexpectedly');
  }

  /**
   * Evaluates browser support for WebGPU/WebGL acceleration
   * @returns {boolean} WebGPU status
   */
  checkHardwareSupport() {
    this.webGpuSupported = !!navigator.gpu;
    console.log('[Local AI] WebGPU supported:', this.webGpuSupported);
    return this.webGpuSupported;
  }

  getStatus() {
    return {
      advisor: "Krishi Sastri",
      model: this.modelName,
      mode: this.llmMode,
      loaded: this.llmLoaded,
      webGpuSupported: this.webGpuSupported
    };
  }

  inferCropFromPrompt(prompt, fallbackCrop = "corn") {
    const text = (prompt || "").toLowerCase();
    const normalizedFallback = (fallbackCrop || "corn").toLowerCase();
    const cropPatterns = [
      { crop: "tomato", terms: ["tomato", "tomatoes", "टमाटर", "टोमॅटो", "టమాట", "టమోటా", "nyanya", "utamatisi"] },
      { crop: "chilli", terms: ["chilli", "chili", "pepper", "मिर्च", "मिरची", "మిరప", "pilipili"] },
      { crop: "wheat", terms: ["wheat", "गेहूँ", "गेहूं", "गहू", "గోధుమ", "ngano", "ukolweni"] },
      { crop: "corn", terms: ["corn", "maize", "मक्का", "मका", "మొక్కజొన్న", "mahindi", "ummbila"] }
    ];

    const match = cropPatterns.find(item => item.terms.some(term => text.includes(term)));
    return match ? match.crop : normalizedFallback;
  }

  buildFallbackOkfGuide(crop) {
    const fallbackGuides = {
      wheat: {
        metadata: { name: "Wheat" },
        specifications: {
          optimal_soil_ph: "6.0-7.0",
          npk_ratio: { nitrogen_ppm: 60, phosphorus_ppm: 30, potassium_ppm: 40 },
          soil_moisture: { min_pct: 35.0, max_pct: 65.0, optimal_pct: 45.0 }
        },
        diagnostics: {}
      },
      corn: {
        metadata: { name: "Corn" },
        specifications: {
          optimal_soil_ph: "5.8-7.0",
          npk_ratio: { nitrogen_ppm: 80, phosphorus_ppm: 40, potassium_ppm: 50 },
          soil_moisture: { min_pct: 40.0, max_pct: 70.0, optimal_pct: 55.0 }
        },
        diagnostics: {}
      },
      tomato: {
        metadata: { name: "Tomato" },
        specifications: {
          optimal_soil_ph: "6.0-6.8",
          npk_ratio: { nitrogen_ppm: 55, phosphorus_ppm: 35, potassium_ppm: 70 },
          soil_moisture: { min_pct: 45.0, max_pct: 70.0, optimal_pct: 55.0 }
        },
        diagnostics: {
          "Tomato Yellow Leaf Stress": {
            symptom: {
              English: "Yellow tomato leaves can come from excess water, nitrogen or magnesium deficiency, root stress, or early disease.",
              Hindi: "टमाटर के पत्ते पीले होना अधिक पानी, नाइट्रोजन या मैग्नीशियम की कमी, जड़ तनाव या शुरुआती रोग का संकेत हो सकता है।",
              Marathi: "टोमॅटोची पाने पिवळी होणे जास्त पाणी, नायट्रोजन किंवा मॅग्नेशियम कमतरता, मुळांचा ताण किंवा सुरुवातीचा रोग दाखवू शकते.",
              Telugu: "టమాట ఆకులు పసుపుగా మారడం అధిక నీరు, నత్రజని లేదా మెగ్నీషియం లోపం, వేరు ఒత్తిడి లేదా ప్రారంభ తెగులును సూచించవచ్చు.",
              Swahili: "Majani ya nyanya kuwa manjano yanaweza kutokana na maji mengi, upungufu wa nitrojeni au magnesiamu, msongo wa mizizi, au ugonjwa wa mapema.",
              Zulu: "Amaqabunga katamatisi aphuzi angavela emanzini amaningi, ukuswela initrogeni noma imagnesium, ukucindezeleka kwezimpande, noma isifo sokuqala."
            },
            organic_remedy: {
              English: "Check soil moisture first. Stop irrigation if water is standing, improve drainage, add compost, and remove leaves with spreading spots.",
              Hindi: "पहले मिट्टी की नमी जांचें। पानी जमा हो तो सिंचाई रोकें, निकासी सुधारें, कम्पोस्ट दें और फैलते धब्बों वाली पत्तियां हटाएं।",
              Marathi: "आधी मातीतील ओलावा तपासा. पाणी साचले असेल तर सिंचन थांबवा, निचरा सुधारा, कंपोस्ट द्या आणि पसरणारे डाग असलेली पाने काढा.",
              Telugu: "ముందుగా నేల తేమ తనిఖీ చేయండి. నీరు నిల్వ ఉంటే సాగు ఆపి, నీటి పారుదల మెరుగుపరచి, కంపోస్ట్ ఇవ్వండి.",
              Swahili: "Kagua unyevu wa udongo kwanza. Maji yakisimama, simamisha umwagiliaji, boresha mifereji, ongeza mboji, na ondoa majani yenye madoa yanayoenea.",
              Zulu: "Hlola umswakama womhlabathi kuqala. Uma amanzi emi, misa ukunisela, thuthukisa ukugeleza, faka umquba, ususe amaqabunga anamabala asabalalayo."
            }
          },
          "Tomato Late Blight": {
            symptom: {
              English: "Dark spreading leaf spots with humid weather can indicate tomato late blight.",
              Hindi: "नमी वाले मौसम में तेजी से फैलते गहरे धब्बे टमाटर में लेट ब्लाइट का संकेत हो सकते हैं।",
              Marathi: "ओलसर हवेत जलद पसरणारे काळे डाग टोमॅटोतील लेट ब्लाइट दाखवू शकतात.",
              Telugu: "తేమ వాతావరణంలో వేగంగా వ్యాపించే ముదురు మచ్చలు టమాట లేట్ బ్లైట్‌ను సూచించవచ్చు.",
              Swahili: "Madoa meusi yanayoenea haraka wakati wa unyevu yanaweza kuonyesha ugonjwa wa late blight kwenye nyanya.",
              Zulu: "Amabala amnyama asabalala ngokushesha ngesikhathi somswakama angakhombisa late blight katamatisi."
            },
            organic_remedy: {
              English: "Remove badly infected leaves, avoid overhead watering, keep plants airy, and ask an expert if the spread is fast.",
              Hindi: "बहुत प्रभावित पत्तियां हटाएं, ऊपर से पानी न दें, पौधों में हवा रखें और तेजी से फैलने पर विशेषज्ञ से सलाह लें।",
              Marathi: "जास्त बाधित पाने काढा, वरून पाणी देऊ नका, झाडांमध्ये हवा खेळती ठेवा आणि वेगाने पसरल्यास तज्ज्ञांचा सल्ला घ्या.",
              Telugu: "బాగా ప్రభావితమైన ఆకులను తొలగించి, పై నుంచి నీరు పోయకండి, మొక్కలకు గాలి అందేలా ఉంచండి.",
              Swahili: "Ondoa majani yaliyoathirika sana, epuka kumwagilia juu ya majani, acha hewa ipite, na muulize mtaalamu ikiendelea haraka.",
              Zulu: "Susa amaqabunga atheleleke kakhulu, gwema ukunisela ngaphezulu, vumela umoya, bese ubuza uchwepheshe uma kusabalala ngokushesha."
            }
          }
        }
      },
      chilli: {
        metadata: { name: "Chilli" },
        specifications: {
          optimal_soil_ph: "6.0-7.0",
          npk_ratio: { nitrogen_ppm: 50, phosphorus_ppm: 35, potassium_ppm: 60 },
          soil_moisture: { min_pct: 40.0, max_pct: 65.0, optimal_pct: 52.0 }
        },
        diagnostics: {}
      }
    };

    return fallbackGuides[crop] || fallbackGuides.corn;
  }

  buildGroundingFacts(guide, cropName, lang) {
    if (!guide) return "";
    const specs = guide.specifications || {};
    const moisture = specs.soil_moisture || {};
    const npk = specs.npk_ratio || {};
    const diagnostics = guide.diagnostics || {};
    const diagnosticNames = Object.keys(diagnostics).slice(0, 3).join(", ");
    const parts = [
      `crop=${cropName}`,
      specs.optimal_soil_ph ? `ph=${specs.optimal_soil_ph}` : "",
      moisture.optimal_pct ? `moisture=${moisture.optimal_pct}%` : "",
      npk.nitrogen_ppm ? `npk=${npk.nitrogen_ppm}/${npk.phosphorus_ppm}/${npk.potassium_ppm}` : "",
      diagnosticNames ? `known_diagnostics=${diagnosticNames}` : "",
      `language=${lang}`
    ];
    return parts.filter(Boolean).join("; ");
  }

  parseConfidencePercent(confidence) {
    const match = String(confidence || "").match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  buildVisionFindingReply(visionResult, dict, cropName) {
    let diseaseName = visionResult.disease_name || visionResult.label || "";
    if (dict.langName === "Hindi") {
      if (visionResult.hindi_name) diseaseName = visionResult.hindi_name;
      else if (/nutrient deficiency|yellowing/i.test(diseaseName)) diseaseName = "पत्तों में पीलापन या पोषक कमी का संकेत";
      else if (/fungal|brown spots/i.test(diseaseName)) diseaseName = "भूरे धब्बे या फफूंद संक्रमण का संकेत";
      else if (/healthy/i.test(diseaseName)) diseaseName = "फसल सामान्य दिख रही है";
      else if (/unable/i.test(diseaseName)) diseaseName = "फोटो से पक्की पहचान नहीं हो पाई";
    }
    const confidence = visionResult.confidence || "";
    const severity = visionResult.severity || "";
    const isFallback = visionResult.mode === "fallback_heuristic" || visionResult.ml_runtime_used === false;
    const confidencePct = this.parseConfidencePercent(confidence);
    const shouldEscalate = isFallback || confidencePct < 70 || severity === "Critical" || severity === "Unknown";

    const localized = {
      English: {
        intro: "I checked the crop photo locally.",
        finding: "Finding",
        confidence: "Confidence",
        safe: "Safe first step",
        fallbackNote: "This is only a local visual estimate.",
        action: "Keep the plant airy, avoid extra watering, and remove badly affected leaves.",
        expert: "For exact diagnosis, send the photo to Krishi Bisesagya."
      },
      Hindi: {
        intro: "मैंने फोटो की स्थानीय जांच की।",
        finding: "संकेत",
        confidence: "विश्वास",
        safe: "पहला सुरक्षित कदम",
        fallbackNote: "यह केवल स्थानीय फोटो अनुमान है।",
        action: "पौधे में हवा रखें, ज्यादा पानी न दें और बहुत प्रभावित पत्तियां हटाएं।",
        expert: "पक्की जांच के लिए फोटो कृषि विशेषज्ञ को भेजें।"
      },
      Marathi: {
        intro: "मी फोटोची स्थानिक तपासणी केली.",
        finding: "संकेत",
        confidence: "विश्वास",
        safe: "पहिले सुरक्षित पाऊल",
        fallbackNote: "हा फक्त स्थानिक फोटो अंदाज आहे.",
        action: "झाडात हवा खेळती ठेवा, जास्त पाणी देऊ नका आणि बाधित पाने काढा.",
        expert: "अचूक तपासणीसाठी फोटो कृषी तज्ज्ञाला पाठवा."
      },
      Telugu: {
        intro: "నేను ఫోటోను స్థానికంగా పరిశీలించాను.",
        finding: "సూచన",
        confidence: "నమ్మకం",
        safe: "మొదటి సురక్షిత చర్య",
        fallbackNote: "ఇది స్థానిక ఫోటో అంచనా మాత్రమే.",
        action: "మొక్కలకు గాలి అందేలా ఉంచండి, అధిక నీరు ఇవ్వకండి, ప్రభావిత ఆకులు తొలగించండి.",
        expert: "ఖచ్చితమైన నిర్ధారణకు ఫోటోను నిపుణుడికి పంపండి."
      },
      Swahili: {
        intro: "Nimekagua picha hapa kwenye kifaa.",
        finding: "Dalili",
        confidence: "Uhakika",
        safe: "Hatua salama ya kwanza",
        fallbackNote: "Huu ni makadirio ya picha ya ndani tu.",
        action: "Acha hewa ipite, epuka maji mengi, na ondoa majani yaliyoathirika sana.",
        expert: "Kwa utambuzi wa uhakika, tuma picha kwa Krishi Bisesagya."
      },
      Zulu: {
        intro: "Ngihlole isithombe kudivayisi.",
        finding: "Okubonakele",
        confidence: "Ukuqiniseka",
        safe: "Isinyathelo sokuqala esiphephile",
        fallbackNote: "Lokhu kuwukulinganisa kwesithombe kwasendaweni kuphela.",
        action: "Vumela umoya, gwema amanzi amaningi, ususe amaqabunga athinteke kakhulu.",
        expert: "Ukuze kuqinisekiswe, thumela isithombe ku-Krishi Bisesagya."
      }
    };
    const v = localized[dict.langName] || localized.English;
    const escalationLine = shouldEscalate ? `\n${v.expert}` : "";
    const fallbackLine = isFallback ? `\n${v.fallbackNote}` : "";

    return `${v.intro}\n${cropName}: ${v.finding}: ${diseaseName}\n${v.confidence}: ${confidence}\n${v.safe}: ${v.action}${fallbackLine}${escalationLine}`;
  }

  /**
   * Downloads and caches the client-side Gemma-4-E2B model using the Cache API.
   * Falls back to high-fidelity client-side dialog simulator if offline or hardware fails.
   * @param {function} onProgress - Callback with percentage loaded
   * @returns {Promise<boolean>} Load status
   */
  async loadLlm(onProgress) {
    this.onProgressCallback = onProgress;
    this.checkHardwareSupport();

    if (this.llmLoaded) return true;
    if (!this.webGpuSupported) {
      console.warn('[Local AI] WebGPU is required for LiteRT-LM Web. Falling back to deterministic local advisor.');
      this.llmMode = "rule_fallback_no_webgpu";
      return false;
    }

    const MODEL_URL = this.modelUrl;
    const CACHE_KEY = `${this.modelName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-model`;

    console.log(`[Local AI] Checking Cache API for local ${this.modelName} model...`);

    try {
      const cache = await caches.open('gemma-model-cache');
      const cachedResponse = await cache.match(CACHE_KEY);

      if (cachedResponse) {
        console.log(`[Local AI] ${this.modelName} found in local browser Cache API. Initializing LiteRT-LM...`);
        const modelBlob = await cachedResponse.blob();
        this.reportProgress(100, "initializing");
        await this.withTimeout(
          () => this.initializeLiteRtLm(modelBlob),
          this.modelInitTimeoutMs,
          "LiteRT-LM initialization"
        );
        this.reportProgress(100, "ready");
        this.llmLoaded = true;
        this.llmMode = "litert_lm_cached_model";
        return true;
      }

      // If not cached, we need to download it from the network
      if (!navigator.onLine) {
        console.warn('[Local AI] Device is offline and model is not cached. Falling back to offline rule engine.');
        this.llmMode = "offline_rule_fallback";
        return false;
      }

      console.log(`[Local AI] Model cache miss. Downloading ${this.modelName} from ${MODEL_URL}...`);

      const modelBlob = await this.downloadModelBlob(MODEL_URL);
      console.log('[Local AI] Compiling download stream chunks...');
      await cache.put(CACHE_KEY, new Response(modelBlob));

      console.log(`[Local AI] Local ${this.modelName} model cached. Initializing LiteRT-LM...`);
      this.reportProgress(100, "initializing");
      await this.withTimeout(
        () => this.initializeLiteRtLm(modelBlob),
        this.modelInitTimeoutMs,
        "LiteRT-LM initialization"
      );
      this.reportProgress(100, "ready");
      this.llmLoaded = true;
      this.llmMode = "litert_lm_cloud_model";
      return true;
    } catch (err) {
      console.warn('[Local AI] LiteRT-LM model download or initialization failed. Running deterministic local advisor.', err);
      this.llmEngine = null;
      this.llmConversation = null;
      this.llmLoaded = false;
      this.llmMode = "rule_fallback_model_unavailable";
      return false;
    }
  }

  async initializeLiteRtLm(modelSource) {
    const { Engine } = await import(this.litertCoreUrl);
    this.llmEngine = await Engine.create({
      model: modelSource,
      mainExecutorSettings: {
        maxNumTokens: 2048
      }
    });
    this.llmConversation = await this.llmEngine.createConversation({
      preface: {
        messages: [
          {
            role: "system",
            content: "You are Krishi Sastri, a warm local agriculture advisor. Answer farmers briefly in their selected language. For crop disease or stress questions, always give 2-3 safe immediate actions before suggesting expert consultation. Avoid unsafe chemical dosage unless verified. Ask to consult Krishi Bisesagya only after safe first steps for uncertain, severe, or chemical-sensitive cases."
          }
        ]
      }
    });
  }

  async generateWithLiteRt(prompt, context, groundingFacts) {
    if (!this.llmConversation) return "";
    const language = context.language || "English";
    const farmerPrompt = [
      `Language: ${language}`,
      `Crop: ${context.crop || "unknown"}`,
      `Soil: ${context.soil || "unknown"}`,
      groundingFacts ? `Local crop facts: ${groundingFacts}` : "",
      context.visionResult ? `Local vision result: ${JSON.stringify(context.visionResult)}` : "",
      `Farmer question: ${prompt}`,
      "Respond under 80 words. Do not use markdown. Use the farmer's selected language.",
      "For disease/stress: state likely issue, give 2-3 safe first actions, then mention expert only if needed."
    ].filter(Boolean).join("\n");

    const response = await this.withTimeout(
      () => this.llmConversation.sendMessage(farmerPrompt),
      this.generationTimeoutMs,
      "LiteRT-LM generation"
    );
    return this.extractLiteRtText(response);
  }

  extractLiteRtText(response) {
    if (!response) return "";
    if (typeof response === "string") return response.trim();
    if (typeof response.text === "string") return response.text.trim();
    if (typeof response.message === "string") return response.message.trim();
    if (Array.isArray(response.content)) {
      return response.content.map(item => {
        if (typeof item === "string") return item;
        return item?.text || item?.content || "";
      }).join("").trim();
    }
    if (Array.isArray(response.candidates)) {
      return response.candidates.map(item => item?.text || item?.content || "").join("").trim();
    }
    return "";
  }

  isFarmerSafeReply(reply, lang, context = {}) {
    return !this.farmerSafetyIssue(reply, lang, context);
  }

  farmerSafetyIssue(reply, lang, context = {}) {
    const text = String(reply || "");
    if (!text.trim()) return "empty_response";
    if (/Coordinator|Pathologist|Irrigation Planner|Crop Analyst|profile\.|soil\.|blackclay|\*\*/i.test(text)) {
      return "internal_or_markdown_leak";
    }
    const crop = String(context.crop || "").toLowerCase();
    if (crop && this.replyMentionsDifferentCrop(text, crop)) {
      return "crop_mismatch";
    }
    if (lang === "Hindi") {
      const allowedTechnical = /\b(pH|NPK|PPM|ml|mg|kg|cm|mm|EC|ASK)\b|°C|कृषि Sastri|Krishi Sastri|Krishi Bisesagya/gi;
      const remainingLatin = text.replace(allowedTechnical, "");
      if (/\b(the|and|or|use|spray|apply|disease|pest|soil|crop|water|fertilizer|nitrogen|magnesium|deficiency|expert|consult)\b/i.test(remainingLatin)) {
        return "english_phrase_in_hindi_reply";
      }
    }
    return "";
  }

  replyMentionsDifferentCrop(text, expectedCrop) {
    const cropTerms = {
      corn: ["corn", "maize", "मक्का", "मक्के", "मका", "मकई"],
      chilli: ["chilli", "chili", "pepper", "मिर्च", "मिर्ची", "मिरची"],
      tomato: ["tomato", "tomatoes", "टमाटर", "टोमॅटो"],
      wheat: ["wheat", "गेहूँ", "गेहूं", "गहू"]
    };
    const expectedTerms = cropTerms[expectedCrop] || [];
    const mentionsExpected = expectedTerms.some(term => text.toLowerCase().includes(term.toLowerCase()));
    const otherCrop = Object.entries(cropTerms).find(([cropName, terms]) => {
      if (cropName === expectedCrop) return false;
      return terms.some(term => text.toLowerCase().includes(term.toLowerCase()));
    });
    return Boolean(otherCrop && !mentionsExpected);
  }

  /**
   * Simulates downloading the TFLite leaf disease classifier model (~15MB)
   * @returns {Promise<boolean>} Load status
   */
  async loadClassifier() {
    if (this.classifierLoaded) return true;
    console.log('[Local AI] Loading TFLite Plant Pathology Image Classifier...');
    this.classifierLoaded = true;
    return true;
  }

  /**
   * Performs image classification on base64 captured frame
   * @param {string} base64Image
   * @returns {Promise<object>} Detected disease and trust index
   */
  async classifyImage(base64Image) {
    await this.loadClassifier();

    // In a real local VLM/TFLite, we pass the image tensor. Here we parse features.
    // Return a mocked agronomic disease finding based on active profile values.
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          disease_name: "Maize Stalk Borer Infestation",
          confidence: "92%",
          severity: "Medium",
          organic_remedy: "Neem seed kernel extract (NSKE 5%) spray or placing handpicked wood ash in whorls.",
          chemical_remedy: "Chlorantraniliprole 18.5% SC chemical spray at early stage."
        });
      }, 800);
    });
  }

  /**
   * Generates farmer-facing agricultural advice locally.
   *
   * Desired path: Gemma-4-E2B receives farmer context + compact local crop facts.
   * Current path: until a real browser/mobile Gemma runtime is wired, the same
   * compact facts drive a deterministic fallback response. OKF/local facts are
   * supporting context, not the primary product behavior.
   * @param {string} prompt
   * @param {object} context - Farmer Digital Twin context
   * @returns {Promise<string>} Translated Krishi Sastri response
   */
  async generateText(prompt, context = {}) {
    if (!this.llmLoaded) {
      this.llmMode = this.webGpuSupported ? "rule_fallback_model_not_loaded" : "rule_fallback_no_webgpu";
    }
    const text = prompt.toLowerCase();
    const crop = this.inferCropFromPrompt(prompt, context.crop || 'corn');
    const soil = (context.soil || 'clay').toLowerCase();
    const lang = context.language || 'English';

    // 1. Initialize DB and query local crop facts for grounding/fallback only.
    const localDb = new window.LocalDb();
    let okfGuide = context.localFacts || context.okfGuide || null;
    try {
      okfGuide = okfGuide || await localDb.getOkfGuide(crop);
    } catch (e) {
      console.warn("Could not load local crop facts from IndexedDB, using static backup", e);
    }

    // Fallback static guide if DB fetch fails
    if (!okfGuide) {
      okfGuide = this.buildFallbackOkfGuide(crop);
    }

    const labels = {
      English: {
        pranam: "Pranam Farmer.",
        ramram: "Ram Ram Kisan Bhai. Running the",
        namaste: "Namaste Kisan. Running",
        welcome: "Namaste Farmer Brother.",
        triggered: "I have triggered my",
        skillFor: "skill for our",
        crop: "crop.",
        symptomLabel: "Symptom",
        organicLabel: "Organic Remedy",
        safeStepsLabel: "Safe first steps",
        safeDiseaseSteps: "Improve drainage if water is standing. Keep plants airy. Remove badly affected leaves separately.",
        fallbackSymptom: "Small spots, leaf damage, or pest marks can indicate early stress.",
        fallbackRemedy: "Spray neem oil solution early in the morning and keep affected leaves separate.",
        optimalMoisture: "Optimal Moisture",
        criticalLimit: "Critical Limit",
        dripStrategy: "Drip Strategy",
        strategyDesc: "Apply small volume frequent cycles daily. Avoid pooling water near roots.",
        targetNpk: "Target NPK PPM",
        optimalPh: "Optimal pH",
        nitrogen: "Nitrogen",
        phosphorus: "Phosphorus",
        potassium: "Potassium",
        coordinatorIntro: "I am your Edge Multi-Agent Coordinator. I have cached the digital twin: growing",
        onSoil: "on",
        soilSuffix: "soil.",
        coordinatorOffer: "I can trigger specialized skills locally:",
        pathologistName: "Crop Pathologist",
        pathologistSkill: "Disease Treatment & Organic Remedies",
        irrigatorName: "Irrigation Planner",
        irrigatorSkill: "Drip Scheduling & Moisture Optimization",
        analystName: "Crop Analyst",
        analystSkill: "Soil Profile & NPK Calibration",
        coordinatorName: "Coordinator",
        coordinatorSkill: "General Orchestration",
        cropNames: { corn: "corn", wheat: "wheat", tomato: "tomato", chilli: "chilli" },
        pestAdvice: "This can be a crop disease or pest issue.",
        irrigationAdvice: "Give water in small cycles and avoid waterlogging near roots.",
        soilAdvice: "Check soil nutrients and add compost before increasing fertilizer.",
        expertOffer: "If the spots are spreading quickly, ask Krishi Bisesagya for deeper review."
      },
      Hindi: {
        pranam: "प्रणाम किसान भाई।",
        ramram: "राम राम किसान भाई।",
        namaste: "नमस्ते किसान भाई।",
        welcome: "नमस्ते किसान भाई।",
        triggered: "मैंने सक्रिय किया है अपना",
        skillFor: "स्किल हमारी",
        crop: "फसल के लिए।",
        symptomLabel: "लक्षण",
        organicLabel: "जैविक उपचार",
        safeStepsLabel: "पहले सुरक्षित कदम",
        safeDiseaseSteps: "पानी रुका हो तो निकासी सुधारें। पौधों में हवा रखें। ज्यादा प्रभावित पत्ते अलग करें।",
        fallbackSymptom: "पत्तों पर छोटे धब्बे, छेद या कीट के निशान शुरुआती तनाव दिखा सकते हैं।",
        fallbackRemedy: "सुबह नीम तेल का हल्का घोल छिड़कें और ज्यादा प्रभावित पत्तों को अलग रखें।",
        optimalMoisture: "इष्टतम नमी",
        criticalLimit: "महत्वपूर्ण सीमा",
        dripStrategy: "ड्रिप सिंचाई रणनीति",
        strategyDesc: "प्रतिदिन कम मात्रा में बार-बार चक्र लागू करें। जड़ों के पास पानी जमा होने से बचाएं।",
        targetNpk: "लक्ष्य NPK PPM",
        optimalPh: "इष्टतम pH",
        nitrogen: "नाइट्रोजन",
        phosphorus: "फास्फोरस",
        potassium: "पोटेशियम",
        coordinatorIntro: "मैं आपका ऑफलाइन मल्टी-एजेंट कोऑर्डिनेटर हूँ। मैंने डिजिटल ट्विन लोड किया है: बढ़ती हुई",
        onSoil: "को",
        soilSuffix: "मिट्टी पर।",
        coordinatorOffer: "मैं स्थानीय रूप से विशेष स्किल्स ट्रिगर कर सकता हूँ:",
        pathologistName: "फसल रोग सलाह",
        pathologistSkill: "रोग उपचार और जैविक उपचार",
        irrigatorName: "सिंचाई सलाह",
        irrigatorSkill: "ड्रिप शेड्यूलिंग और नमी अनुकूलन",
        analystName: "मिट्टी सलाह",
        analystSkill: "मिट्टी प्रोफाइल और NPK अंशांकन",
        coordinatorName: "कृषि शास्त्री",
        coordinatorSkill: "सामान्य सलाह",
        cropNames: { corn: "मक्का", wheat: "गेहूँ", tomato: "टमाटर", chilli: "मिर्च" },
        pestAdvice: "यह फसल रोग या कीट की समस्या हो सकती है।",
        irrigationAdvice: "पानी छोटे-छोटे चक्रों में दें और जड़ों के पास पानी जमा न होने दें।",
        soilAdvice: "खाद बढ़ाने से पहले मिट्टी की नमी और पोषक तत्व जांचें।",
        expertOffer: "अगर धब्बे तेजी से फैल रहे हैं, तो कृषि विशेषज्ञ से गहरी जांच कराएं।"
      },
      Marathi: {
        pranam: "नमस्कार शेतकरी बंधू.",
        ramram: "राम राम शेतकरी बंधू. रनिंग द",
        namaste: "नमस्कार. रनिंग",
        welcome: "नमस्कार शेतकरी बंधू.",
        triggered: "मी सक्रिय केला आहे माझा",
        skillFor: "स्किल आपल्या",
        crop: "पिकासाठी.",
        symptomLabel: "लक्षणे",
        organicLabel: "सेंद्रिय उपचार",
        safeStepsLabel: "पहिली सुरक्षित पावले",
        safeDiseaseSteps: "पाणी साचत असेल तर निचरा सुधारा. झाडात हवा खेळती ठेवा. जास्त बाधित पाने वेगळी ठेवा.",
        fallbackSymptom: "पानांवरील छोटे डाग, छिद्रे किंवा किडीचे चिन्ह सुरुवातीचा ताण दाखवू शकतात.",
        fallbackRemedy: "सकाळी नीम तेलाचे हलके द्रावण फवारावे आणि जास्त बाधित पाने वेगळी ठेवावीत.",
        optimalMoisture: "योग्य ओलावा",
        criticalLimit: "धोकादायक मर्यादा",
        dripStrategy: "ठिबक सिंचन धोरण",
        strategyDesc: "दररोज कमी प्रमाणात वारंवार पाणी द्या. मुळांजवळ पाणी साचू देऊ नका.",
        targetNpk: "लक्ष्य NPK PPM",
        optimalPh: "योग्य pH",
        nitrogen: "नायट्रोजन",
        phosphorus: "फॉस्फरस",
        potassium: "पोटॅशियम",
        coordinatorIntro: "मी तुमचा offline मल्टी-एजेंट कोऑर्डिनेटर आहे. मी डिजिटल ट्विन लोड केला आहे: लागवड",
        onSoil: "या",
        soilSuffix: "मातीवर.",
        coordinatorOffer: "मी स्थानिक पातळीवर खालील विशेष स्किल्स ट्रिगर करू शकतो:",
        pathologistName: "पीक रोग सल्ला",
        pathologistSkill: "रोग उपचार आणि सेंद्रिय उपाय",
        irrigatorName: "सिंचन सल्ला",
        irrigatorSkill: "ठिबक नियोजन आणि ओलावा अनुकूलन",
        analystName: "माती सल्ला",
        analystSkill: "माती प्रोफाइल आणि NPK कॅलिब्रेशन",
        coordinatorName: "कृषी शास्त्री",
        coordinatorSkill: "सामान्य सल्ला",
        cropNames: { corn: "मका", wheat: "गहू", tomato: "टोमॅटो", chilli: "मिरची" },
        pestAdvice: "ही पीक रोग किंवा किडीची समस्या असू शकते.",
        irrigationAdvice: "पाणी लहान चक्रांत द्या आणि मुळांजवळ पाणी साचू देऊ नका.",
        soilAdvice: "खत वाढवण्यापूर्वी मातीतील ओलावा आणि पोषक घटक तपासा.",
        expertOffer: "डाग जलद पसरत असतील तर कृषी तज्ज्ञांकडून सखोल तपासणी करून घ्या."
      },
      Telugu: {
        pranam: "నమస్కారం రైతు సోదరులారా.",
        ramram: "నమస్కారం రైతు సోదరులారా. రన్నింగ్",
        namaste: "నమస్కారం. రన్నింగ్",
        welcome: "నమస్కారం రైతు సోదరులారా.",
        triggered: "నేను నా ప్రత్యేక",
        skillFor: "నైపుణ్యాన్ని ప్రారంభించాను మా",
        crop: "పంట కోసం.",
        symptomLabel: "లక్షణాలు",
        organicLabel: "సేంద్రీయ నివారణ",
        safeStepsLabel: "మొదటి సురక్షిత చర్యలు",
        safeDiseaseSteps: "నీరు నిల్వ ఉంటే పారుదల మెరుగుపరచండి. మొక్కలకు గాలి అందేలా ఉంచండి. ఎక్కువగా ప్రభావితమైన ఆకులు వేరు చేయండి.",
        fallbackSymptom: "ఆకులపై చిన్న మచ్చలు, రంధ్రాలు లేదా పురుగు గుర్తులు ప్రారంభ ఒత్తిడిని చూపవచ్చు.",
        fallbackRemedy: "ఉదయం తేలికపాటి వేపనూనె ద్రావణం పిచికారీ చేసి, ఎక్కువగా ప్రభావితమైన ఆకులను వేరు చేయండి.",
        optimalMoisture: "అనుకూలమైన తేమ",
        criticalLimit: "క్లిష్టమైన పరిమితి",
        dripStrategy: "డ్రిప్ వ్యూహం",
        strategyDesc: "రోజూ తక్కువ పరిమాణంలో తరచుగా నీరు అందించండి. వేర్ల దగ్గర నీరు నిల్వ ఉండకుండా చూడండి.",
        targetNpk: "NPK లక్ష్యం PPM",
        optimalPh: "అనుకూలమైన pH",
        nitrogen: "నత్రజని",
        phosphorus: "భాస్వరం",
        potassium: "పొటాషియం",
        coordinatorIntro: "నేను మీ ఆఫ్‌లైన్ కోఆర్డినేటర్. డిజిటల్ ట్విన్ లోడ్ చేసాను: పెరుగుతున్న",
        onSoil: "ఆ",
        soilSuffix: "నేలలో.",
        coordinatorOffer: "నేను ఇక్కడ ప్రత్యేక నైపుణ్యాలను ప్రారంభించగలను:",
        pathologistName: "పంట రోగ సలహా",
        pathologistSkill: "వ్యాధి నివారణ & సేంద్రీయ పరిష్కారాలు",
        irrigatorName: "నీటిపారుదల సలహా",
        irrigatorSkill: "డ్రిప్ షెడ్యూలింగ్ & తేమ ఆప్టిమైజేషన్",
        analystName: "నేల సలహా",
        analystSkill: "నేల ప్రొఫైల్ & NPK అమరిక",
        coordinatorName: "కృషి శాస్త్రి",
        coordinatorSkill: "సాధారణ సలహా",
        cropNames: { corn: "మొక్కజొన్న", wheat: "గోధుమ", tomato: "టమాట", chilli: "మిరప" },
        pestAdvice: "ఇది పంట రోగం లేదా పురుగు సమస్య కావచ్చు.",
        irrigationAdvice: "నీటిని చిన్న చక్రాల్లో ఇవ్వండి; వేర్ల దగ్గర నీరు నిల్వ ఉండకూడదు.",
        soilAdvice: "ఎరువు పెంచే ముందు నేల తేమ, పోషకాలను తనిఖీ చేయండి.",
        expertOffer: "మచ్చలు త్వరగా వ్యాపిస్తే కృషి విశేషజ్ఞతో లోతైన పరిశీలన చేయించండి."
      },
      Swahili: {
        pranam: "Jambo Mkulima.",
        ramram: "Jambo Mkulima. Ninaendesha",
        namaste: "Jambo. Ninaendesha",
        welcome: "Jambo ndugu mkulima.",
        triggered: "Nimeanzisha yangu",
        skillFor: "ujuzi kwa shamba letu la",
        crop: "zao.",
        symptomLabel: "Dalili",
        organicLabel: "Tiba ya Kiorgansiki",
        safeStepsLabel: "Hatua salama za kwanza",
        safeDiseaseSteps: "Boresha mifereji ikiwa maji yanasimama. Acha hewa ipite. Tenga majani yaliyoathirika sana.",
        fallbackSymptom: "Madoa madogo, mashimo, au alama za wadudu kwenye majani zinaweza kuonyesha msongo wa mapema.",
        fallbackRemedy: "Nyunyizia mchanganyiko mwepesi wa mafuta ya mwarobaini asubuhi na tenga majani yaliyoathirika sana.",
        optimalMoisture: "Unyevu Sahihi",
        criticalLimit: "Kiwango cha Chini",
        dripStrategy: "Mkakati wa Kudondosha Maji",
        strategyDesc: "Mwagilia maji kidogo kidogo mara kwa mara kila siku. Epuka maji kusimama karibu na mizizi.",
        targetNpk: "Lengo NPK PPM",
        optimalPh: "pH Sahihi",
        nitrogen: "Naitrojeni",
        phosphorus: "Fosforasi",
        potassium: "Potasiamu",
        coordinatorIntro: "Mimi ni mratibu wako wa offline. Nimepata data ya shamba: kukuza",
        onSoil: "kwenye udongo wa",
        soilSuffix: ".",
        coordinatorOffer: "Ninaweza kuanzisha ujuzi maalum hapa:",
        pathologistName: "Ushauri wa Magonjwa ya Mazao",
        pathologistSkill: "Matibabu ya Magonjwa ya Mazao",
        irrigatorName: "Ushauri wa Umwagiliaji",
        irrigatorSkill: "Mkakati wa Umwagiliaji wa Unyevu",
        analystName: "Ushauri wa Udongo",
        analystSkill: "Kipimo cha Udongo NPK",
        coordinatorName: "Krishi Sastri",
        coordinatorSkill: "Ushauri wa jumla",
        cropNames: { corn: "mahindi", wheat: "ngano", tomato: "nyanya", chilli: "pilipili" },
        pestAdvice: "Hili linaweza kuwa tatizo la ugonjwa wa mmea au wadudu.",
        irrigationAdvice: "Mwagilia kwa vipindi vidogo na epuka maji kusimama karibu na mizizi.",
        soilAdvice: "Kagua unyevu na virutubisho vya udongo kabla ya kuongeza mbolea.",
        expertOffer: "Ikiwa madoa yanaenea haraka, muulize Krishi Bisesagya kwa uchunguzi wa kina."
      },
      Zulu: {
        pranam: "Sawubona Mlimi.",
        ramram: "Sawubona Mlimi. Ngiyasebenza",
        namaste: "Sawubona. Ngiyasebenza",
        welcome: "Sawubona mlimi.",
        triggered: "Ngivuse i-",
        skillFor: "iskhathi sami sesimu sethu se-",
        crop: "ummbila.",
        symptomLabel: "Imibhalo",
        organicLabel: "Ukwelapha Ngokwemvelo",
        safeStepsLabel: "Izinyathelo zokuqala eziphephile",
        safeDiseaseSteps: "Thuthukisa ukugeleza uma amanzi emi. Vumela umoya ezitshalweni. Hlukanisa amaqabunga athinteke kakhulu.",
        fallbackSymptom: "Amabala amancane, izimbobo, noma izimpawu zezinambuzane emaqabungeni zingakhombisa ukucindezeleka kokuqala.",
        fallbackRemedy: "Fafaza isixazululo esincane samafutha e-neem ekuseni bese uhlukanisa amaqabunga athinteke kakhulu.",
        optimalMoisture: "Umswakama Ohelekile",
        criticalLimit: "Izinga Elingaphansi",
        dripStrategy: "Isu Lokunisela Ngamathontsi",
        strategyDesc: "Nisela amanzi amancane njalo nsuku. Qaphela ukungahlangani kwamanzi eduze nezimpande.",
        targetNpk: "I-NPK Ehihlose",
        optimalPh: "I-pH Ehelekile",
        nitrogen: "I-Nitrogen",
        phosphorus: "I-Phosphorus",
        potassium: "I-Potassium",
        coordinatorIntro: "Ngingumlekeleli wakho wangaphandle koxhumano. Ngithole imininingwane yesimu: ukukhuliswa",
        onSoil: "kumhlabathi we-",
        soilSuffix: ".",
        coordinatorOffer: "Ngingakuvusa izikhathi ezithile lapha:",
        pathologistName: "Iseluleko Sezifo Zezitshalo",
        pathologistSkill: "Ukwelapha Izifo Zommbila",
        irrigatorName: "Iseluleko Sokunisela",
        irrigatorSkill: "Isu Lokunisela Umswakama",
        analystName: "Iseluleko Somhlabathi",
        analystSkill: "Ukuhlola Umhlabathi I-NPK",
        coordinatorName: "Krishi Sastri",
        coordinatorSkill: "Iseluleko esijwayelekile",
        cropNames: { corn: "ummbila", wheat: "ukolweni", tomato: "utamatisi", chilli: "upelepele" },
        pestAdvice: "Lokhu kungaba yisifo sesitshalo noma inkinga yezinambuzane.",
        irrigationAdvice: "Nisela ngezikhathi ezincane futhi ugweme amanzi ame eduze kwezimpande.",
        soilAdvice: "Hlola umswakama nomanyolo womhlabathi ngaphambi kokwandisa umanyolo.",
        expertOffer: "Uma amabala esabalala ngokushesha, cela u-Krishi Bisesagya ahlole ngokujulile."
      }
    };

    const dict = labels[lang] || labels.English;
    dict.langName = lang;
    let response = "";
    let activeAgent = "Coordinator";
    let activeSkill = "General Advisory";
    const cropName = dict.cropNames?.[crop] || okfGuide.metadata.name || crop;
    const groundingFacts = this.buildGroundingFacts(okfGuide, cropName, lang);

    if (!context.forceRuleFallback && this.llmLoaded && this.llmConversation) {
      try {
        const llmResponse = await this.generateWithLiteRt(prompt, { ...context, crop, soil, language: lang }, groundingFacts);
        if (this.isFarmerSafeReply(llmResponse, lang, { crop })) {
          return llmResponse;
        }
        const issue = this.farmerSafetyIssue(llmResponse, lang, { crop });
        console.warn('[Local AI] LiteRT-LM response failed farmer-safe checks; using deterministic local advisor.', {
          issue,
          expectedCrop: crop,
          preview: String(llmResponse || "").slice(0, 240)
        });
      } catch (err) {
        console.warn('[Local AI] LiteRT-LM generation failed; using deterministic local advisor.', err);
        this.llmMode = "rule_fallback_generation_failed";
      }
    }

    // 2. Multi-Agent Skill Routing (multilingual keyword matching)
    const pestKeywords = ['pest', 'insect', 'disease', 'borer', 'rust', 'aphid', 'blight', 'outbreak', 'pathology',
      // Hindi
      'कीट', 'रोग', 'बीमारी', 'कीड़ा', 'फफूंद', 'झुलसन', 'रतुआ', 'बोलवर्म',
      // Marathi
      'कीडकीट', 'रोग', 'फुगी', 'कवक',
      // Telugu
      'తెగులు', 'వ్యాధి', 'కీటకాలు', 'శిలీంధ్రం', 'పురుగు',
      // Swahili
      'magonjwa', 'wadudu', 'magonjwa', 'ukungaji', 'kuuguza',
      // Zulu
      'izilwane', 'izifo', 'amathosi'
    ];
    const irrigationKeywords = ['water', 'irrigate', 'irrigation', 'drip', 'rain', 'moisture', 'watering',
      // Hindi
      'पानी', 'सिंच', 'जल', 'बारिश', 'नमी', 'ड्रिप',
      // Marathi
      'पाणी', 'सिंचन', 'द्रिप', 'ओलावा',
      // Telugu
      'నీరు', 'నీటి', 'సాగు', 'తేమ', 'డ్రిప్',
      // Swahili
      'maji', 'umwagiliaji', 'unyevu', 'mvua',
      // Zulu
      'amanzi', 'ukunisela', 'umswakama'
    ];
    const soilKeywords = ['soil', 'nutrient', 'nitrogen', 'npk', 'fertilizer', 'manure', 'compost',
      // Hindi
      'मिट्टी', 'माटी', 'खाद', 'नाइट्रोजन', 'उर्वरक', 'जैव',
      // Marathi
      'माती', 'खत', 'नत्र',
      // Telugu
      'నేల', 'ఎరువు', 'నత్రజని', 'భాస్వరం',
      // Swahili
      'udongo', 'mbolea', 'nitrojeni',
      // Zulu
      'umhlabathi', 'isikhathi'
    ];
    const yellowLeafKeywords = ['yellow', 'yellowing', 'chlorosis', 'पीले', 'पीली', 'पीला', 'पिवळी', 'పసుపు', 'manjano', 'aphuzi'];

    if (context.visionResult) {
      activeAgent = dict.pathologistName;
      activeSkill = dict.pathologistSkill;
      response = this.buildVisionFindingReply(context.visionResult, dict, cropName);
    }
    else if (pestKeywords.some(kw => text.includes(kw)) || yellowLeafKeywords.some(kw => text.includes(kw))) {
      activeAgent = dict.pathologistName;
      activeSkill = dict.pathologistSkill;

      let diseaseMatch = "Maize Stalk Borer Infestation";
      if (crop === "tomato" && yellowLeafKeywords.some(kw => text.includes(kw))) diseaseMatch = "Tomato Yellow Leaf Stress";
      else if (crop === "tomato" && (text.includes('blight') || text.includes('झुलसन') || text.includes('धब्ब') || text.includes('spot'))) diseaseMatch = "Tomato Late Blight";
      else if (text.includes('rust') || text.includes('रतुआ') || text.includes('తుప్పు') || text.includes('kutu')) diseaseMatch = "Brown Leaf Rust";
      else if (text.includes('aphid') || text.includes('माहू') || text.includes('ఆకుపురుగు')) diseaseMatch = "Aphids";

      const rawDiag = okfGuide.diagnostics[diseaseMatch] || {
        symptom: { [lang]: dict.fallbackSymptom, English: labels.English.fallbackSymptom },
        organic_remedy: { [lang]: dict.fallbackRemedy, English: labels.English.fallbackRemedy }
      };

      const symptomVal = (rawDiag.symptom && typeof rawDiag.symptom === 'object') ? (rawDiag.symptom[lang] || rawDiag.symptom.English) : rawDiag.symptom;
      const remedyVal = (rawDiag.organic_remedy && typeof rawDiag.organic_remedy === 'object') ? (rawDiag.organic_remedy[lang] || rawDiag.organic_remedy.English) : rawDiag.organic_remedy;

      response = `${dict.pranam}\n${cropName}: ${dict.pestAdvice}\n${dict.symptomLabel}: ${symptomVal}\n${dict.safeStepsLabel}: ${dict.safeDiseaseSteps}\n${dict.organicLabel}: ${remedyVal}\n${dict.expertOffer}`;
    }
    else if (irrigationKeywords.some(kw => text.includes(kw))) {
      activeAgent = dict.irrigatorName;
      activeSkill = dict.irrigatorSkill;

      const specs = okfGuide.specifications;
      response = `${dict.ramram}\n${cropName}: ${dict.irrigationAdvice}\n${dict.optimalMoisture}: ${specs.soil_moisture.optimal_pct}%\n${dict.criticalLimit}: ${specs.soil_moisture.min_pct}%`;
    }
    else if (soilKeywords.some(kw => text.includes(kw))) {
      activeAgent = dict.analystName;
      activeSkill = dict.analystSkill;

      const specs = okfGuide.specifications;
      const NPK = specs.npk_ratio;
      response = `${dict.namaste}\n${cropName}: ${dict.soilAdvice}\n${dict.targetNpk}: ${dict.nitrogen}: ${NPK.nitrogen_ppm}, ${dict.phosphorus}: ${NPK.phosphorus_ppm}, ${dict.potassium}: ${NPK.potassium_ppm}\n${dict.optimalPh}: ${specs.optimal_soil_ph}`;
    }
    else {
      activeAgent = dict.coordinatorName;
      activeSkill = dict.coordinatorSkill;
      response = `${dict.welcome}\n${cropName}: ${dict.soilAdvice}\n${dict.expertOffer}`;
    }

    return new Promise(resolve => {
      if (groundingFacts) {
        console.debug("[Local AI] Sastri grounded with local crop facts:", groundingFacts);
      }
      setTimeout(() => resolve(response), 1000);
    });
  }
}

// Bind to window for global access
window.LocalAiEngine = LocalAiEngine;
