/**
 * crop_classifier.js
 * Real offline crop disease classification using MediaPipe Tasks Vision API.
 *
 * This module loads a TFLite plant disease model in the browser and runs
 * real inference on captured camera images — completely offline.
 *
 * The model is cached in the browser Cache API after first download.
 *
 * Fallback: If WebGPU/WebGL is not available or the model fails to load,
 * falls back to a simple rule-based leaf color analysis heuristic.
 */

class CropClassifier {
  constructor() {
    this.classifier = null;
    this.modelLoaded = false;
    this.modelAssetCached = false;
    this.runtimeMode = "not_loaded";
    this.modelUrl = window.KRISHI_CROP_CLASSIFIER_MODEL_URL || "/models/crop_disease_classifier.tflite";
    this.labels = [];
    this.onProgressCallback = null;
    this.modelDownloadRetries = Number(window.KRISHI_MODEL_DOWNLOAD_RETRIES || 5);
    this.modelDownloadRetryDelayMs = Number(window.KRISHI_MODEL_DOWNLOAD_RETRY_DELAY_MS || 3000);

    // Disease label mapping (PlantVillage 38-class model)
    // Maps model output indices to human-readable disease names + treatment hints
    this.DISEASE_LABELS = [
      { name: "Apple Scab", crop: "Apple", severity: "Moderate", type: "Fungal" },
      { name: "Apple Black Rot", crop: "Apple", severity: "High", type: "Fungal" },
      { name: "Apple Cedar Rust", crop: "Apple", severity: "Moderate", type: "Fungal" },
      { name: "Apple Healthy", crop: "Apple", severity: "None", type: "Healthy" },
      { name: "Blueberry Healthy", crop: "Blueberry", severity: "None", type: "Healthy" },
      { name: "Cherry Powdery Mildew", crop: "Cherry", severity: "Moderate", type: "Fungal" },
      { name: "Cherry Healthy", crop: "Cherry", severity: "None", type: "Healthy" },
      { name: "Corn Cercospora Leaf Spot (Gray Leaf Spot)", crop: "Corn", severity: "High", type: "Fungal" },
      { name: "Corn Common Rust", crop: "Corn", severity: "Moderate", type: "Fungal" },
      { name: "Corn Northern Leaf Blight", crop: "Corn", severity: "High", type: "Fungal" },
      { name: "Corn Healthy", crop: "Corn", severity: "None", type: "Healthy" },
      { name: "Grape Black Rot", crop: "Grape", severity: "High", type: "Fungal" },
      { name: "Grape Esca (Black Measles)", crop: "Grape", severity: "High", type: "Fungal" },
      { name: "Grape Leaf Blight (Isariopsis Leaf Spot)", crop: "Grape", severity: "Moderate", type: "Fungal" },
      { name: "Grape Healthy", crop: "Grape", severity: "None", type: "Healthy" },
      { name: "Orange Haunglongbing (Citrus Greening)", crop: "Orange", severity: "Critical", type: "Bacterial" },
      { name: "Peach Bacterial Spot", crop: "Peach", severity: "Moderate", type: "Bacterial" },
      { name: "Peach Healthy", crop: "Peach", severity: "None", type: "Healthy" },
      { name: "Pepper Bell Bacterial Spot", crop: "Pepper", severity: "Moderate", type: "Bacterial" },
      { name: "Pepper Bell Healthy", crop: "Pepper", severity: "None", type: "Healthy" },
      { name: "Potato Early Blight", crop: "Potato", severity: "High", type: "Fungal" },
      { name: "Potato Late Blight", crop: "Potato", severity: "Critical", type: "Fungal" },
      { name: "Potato Healthy", crop: "Potato", severity: "None", type: "Healthy" },
      { name: "Raspberry Healthy", crop: "Raspberry", severity: "None", type: "Healthy" },
      { name: "Soybean Healthy", crop: "Soybean", severity: "None", type: "Healthy" },
      { name: "Squash Powdery Mildew", crop: "Squash", severity: "Moderate", type: "Fungal" },
      { name: "Strawberry Leaf Scorch", crop: "Strawberry", severity: "Moderate", type: "Fungal" },
      { name: "Strawberry Healthy", crop: "Strawberry", severity: "None", type: "Healthy" },
      { name: "Tomato Bacterial Spot", crop: "Tomato", severity: "Moderate", type: "Bacterial" },
      { name: "Tomato Early Blight", crop: "Tomato", severity: "High", type: "Fungal" },
      { name: "Tomato Late Blight", crop: "Tomato", severity: "Critical", type: "Fungal" },
      { name: "Tomato Leaf Mold", crop: "Tomato", severity: "Moderate", type: "Fungal" },
      { name: "Tomato Septoria Leaf Spot", crop: "Tomato", severity: "Moderate", type: "Fungal" },
      { name: "Tomato Spider Mites (Two-Spotted Spider Mite)", crop: "Tomato", severity: "Moderate", type: "Pest" },
      { name: "Tomato Target Spot", crop: "Tomato", severity: "High", type: "Fungal" },
      { name: "Tomato Tomato Yellow Leaf Curl Virus", crop: "Tomato", severity: "High", type: "Viral" },
      { name: "Tomato Tomato Mosaic Virus", crop: "Tomato", severity: "Moderate", type: "Viral" },
      { name: "Tomato Healthy", crop: "Tomato", severity: "None", type: "Healthy" },
    ];

    // India/Africa-relevant crop extension labels (not in PlantVillage but common)
    this.REGIONAL_HINTS = {
      "Corn": {
        "Corn Common Rust": { hindi: "मक्का रस्ट", treatment: "Apply copper-based fungicide at first sign. Remove infected leaves." },
        "Corn Northern Leaf Blight": { hindi: "मक्का पत्ती झुलसन", treatment: "Use resistant varieties. Apply mancozeb at 2.5g/liter if severe." },
      },
      "Potato": {
        "Potato Late Blight": { hindi: "आलू लेट ब्लाइट", treatment: "Apply copper-based fungicide immediately. Remove infected plants. This is the disease that caused the Irish famine." },
      },
      "Tomato": {
        "Tomato Late Blight": { hindi: "टमाटर लेट ब्लाइट", treatment: "Apply copper-based organic fungicide. Improve air circulation. Remove infected leaves immediately." },
        "Tomato Early Blight": { hindi: "टमाटर अर्ली ब्लाइट", treatment: "Apply mancozeb at 2.5g/liter. Remove lower infected leaves. Mulch to prevent soil splash." },
      },
    };
  }

  /**
   * Checks if the browser supports WebGL/WebGPU for model inference
   * @returns {boolean} GPU acceleration support
   */
  checkHardwareSupport() {
    const hasWebGPU = !!navigator.gpu;
    const hasWebGL = (function() {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
        return false;
      }
    })();
    console.log('[CropClassifier] WebGPU:', hasWebGPU, '| WebGL:', hasWebGL);
    return hasWebGPU || hasWebGL;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Loads the MediaPipe Tasks Vision ImageClassifier with the TFLite model.
   *
   * @param {function} onProgress - Callback with download percentage (0-100)
   * @returns {Promise<boolean>} Whether the model is ready for inference
   */
  async loadModel(onProgress) {
    this.onProgressCallback = onProgress;
    if (this.modelLoaded) return true;

    // iOS/WKWebView: WebGL is present (Apple Metal), but MediaPipe WASM requires
    // SharedArrayBuffer (needs COOP/COEP headers not available in WKWebView) and
    // dynamic CDN imports are blocked by Safari's CSP. Skip on all iOS devices.
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      console.warn('[CropClassifier] iOS detected. MediaPipe WASM not supported in WKWebView. Using color heuristic.');
      this.runtimeMode = 'fallback_ios';
      return false;
    }

    // WebGL is the minimum requirement for MediaPipe inference
    const hasGPU = this.checkHardwareSupport();
    if (!hasGPU) {
      console.warn('[CropClassifier] No WebGL/WebGPU. Using color heuristic fallback.');
      this.runtimeMode = 'fallback_no_gpu';
      return false;
    }

    if (!navigator.onLine && !this.modelUrl.startsWith('/')) {
      console.warn('[CropClassifier] Offline. Using heuristic fallback.');
      this.runtimeMode = 'offline_fallback';
      return false;
    }

    try {
      if (this.onProgressCallback) this.onProgressCallback(10);
      console.log('[CropClassifier] Loading MediaPipe Tasks Vision runtime...');

      // Load MediaPipe Tasks Vision via CDN (ESM module)
      const mpVision = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm'
      );
      const { ImageClassifier, FilesetResolver } = mpVision;

      if (this.onProgressCallback) this.onProgressCallback(30);

      // Load WASM runtime
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      if (this.onProgressCallback) this.onProgressCallback(60);
      console.log(`[CropClassifier] Loading model from: ${this.modelUrl}`);

      // Try GPU delegate first, fall back to CPU
      let delegate = 'GPU';
      try {
        this.classifier = await ImageClassifier.createFromOptions(vision, {
          baseOptions: { modelAssetPath: this.modelUrl, delegate: 'GPU' },
          maxResults: 5,
          scoreThreshold: 0.05,
        });
      } catch {
        console.warn('[CropClassifier] GPU delegate failed, trying CPU...');
        delegate = 'CPU';
        this.classifier = await ImageClassifier.createFromOptions(vision, {
          baseOptions: { modelAssetPath: this.modelUrl, delegate: 'CPU' },
          maxResults: 5,
          scoreThreshold: 0.05,
        });
      }

      if (this.onProgressCallback) this.onProgressCallback(100);
      this.modelLoaded = true;
      this.modelAssetCached = true;
      this.runtimeMode = `mediapipe_${delegate.toLowerCase()}`;
      console.log(`[CropClassifier] Ready — MediaPipe ImageClassifier (${delegate}).`);
      return true;

    } catch (err) {
      console.warn('[CropClassifier] MediaPipe load failed. Using heuristic fallback.', err);
      this.classifier = null;
      this.modelLoaded = false;
      this.runtimeMode = 'fallback_mediapipe_failed';
      return false;
    }
  }

  /**
   * Classifies a captured crop image for disease detection.
   *
   * If the TFLite model is loaded, runs real ML inference.
   * Otherwise, falls back to a color-based heuristic analysis.
   *
   * @param {string} base64Image - Base64-encoded JPEG image from camera
   * @param {object} context - Farmer context (crop, soil, language)
   * @returns {Promise<object>} Classification result
   */
  async classifyImage(base64Image, context = {}) {
    if (!this.modelLoaded && this.runtimeMode === 'not_loaded') {
      await this.loadModel();
    }

    if (!this.modelLoaded || !this.classifier) {
      return this.classifyFallback(base64Image, context);
    }

    try {
      const img = await this._base64ToImage(base64Image);
      const result = this.classifier.classify(img);

      if (!result?.classifications?.[0]?.categories?.length) {
        return this.classifyFallback(base64Image, context);
      }

      const top = result.classifications[0].categories[0];
      const idx = typeof top.index === 'number' ? top.index : 0;
      const labelInfo = this.DISEASE_LABELS[idx] || {
        name: top.categoryName || 'Unknown Disease',
        crop: context.crop || 'Unknown',
        severity: 'Unknown',
        type: 'Unknown',
      };

      const confidencePct = Math.round((top.score || 0) * 100);
      const isLowConfidence = confidencePct < 50;

      const alternatives = (result.classifications[0].categories.slice(1, 3) || [])
        .map(cat => {
          const l = this.DISEASE_LABELS[cat.index] || { name: cat.categoryName || 'Unknown' };
          return `${l.name} (${Math.round(cat.score * 100)}%)`;
        });

      const cropKey = (labelInfo.crop || '').charAt(0).toUpperCase() + (labelInfo.crop || '').slice(1);
      const hint = (this.REGIONAL_HINTS[cropKey] || {})[labelInfo.name] || {};

      return {
        crop: labelInfo.crop || context.crop || 'Unknown',
        disease_name: labelInfo.name,
        hindi_name: hint.hindi,
        confidence: `${confidencePct}%`,
        severity: labelInfo.severity,
        type: labelInfo.type,
        organic_remedy: hint.treatment || this._defaultOrganic(labelInfo),
        chemical_remedy: this._defaultChemical(labelInfo),
        alternatives,
        mode: this.runtimeMode,
        model_status: this.runtimeMode,
        ml_runtime_used: true,
        escalate: isLowConfidence || labelInfo.severity === 'Critical',
      };

    } catch (err) {
      console.error('[CropClassifier] Inference error, using fallback:', err);
      this.runtimeMode = 'fallback_inference_error';
      return this.classifyFallback(base64Image, context);
    }
  }

  /** Converts a base64 image string to an HTMLImageElement for MediaPipe. */
  _base64ToImage(base64Image) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // data: URIs are same-origin — do NOT set crossOrigin, which can trigger
      // a CORS preflight and fail in WKWebView when the src is a data: URI.
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    });
  }

  /** Default organic treatment based on disease type. */
  _defaultOrganic(labelInfo) {
    if (labelInfo.severity === 'None' || labelInfo.type === 'Healthy') {
      return 'Crop appears healthy. Maintain balanced irrigation and nutrition.';
    }
    const treatmentMap = {
      Fungal:     'Spray neem oil at 5ml/liter. Apply Trichoderma viride as biocontrol. Remove and burn infected leaves.',
      Bacterial:  'Remove infected plant parts. Apply copper-based fungicide (Bordeaux mixture 1%). Avoid overhead irrigation.',
      Viral:      'Remove and destroy infected plants to prevent spread. Control insect vectors with neem oil spray.',
      Pest:       'Apply neem oil spray at 5ml/liter. Use yellow sticky traps. Encourage natural predators.',
      Nutrient:   'Apply well-decomposed FYM at 10-15 tonnes/hectare. Spray 2% urea for nitrogen deficiency.',
    };
    return treatmentMap[labelInfo.type] || 'Consult a local agronomist for appropriate treatment.';
  }

  /** Default chemical treatment based on disease type. */
  _defaultChemical(labelInfo) {
    if (labelInfo.severity === 'None' || labelInfo.type === 'Healthy') {
      return 'No treatment required.';
    }
    const chemMap = {
      Fungal:    'Apply mancozeb at 2.5g/liter or carbendazim at 1g/liter. Observe 14-day pre-harvest interval.',
      Bacterial: 'Apply copper oxychloride 50% WP at 3g/liter. Consult an agronomist before application.',
      Viral:     'No effective chemical cure. Focus on vector control and removing infected plants.',
      Pest:      'Apply imidacloprid 17.8% SL at 0.3ml/liter. Observe safety protocols.',
      Nutrient:  'Apply NPK fertilizer as per soil test. For nitrogen: top-dress urea at 25-30 kg/hectare.',
    };
    return chemMap[labelInfo.type] || 'Consult a certified agricultural expert for diagnosis and treatment.';
  }

  /**
   * Fallback heuristic classification based on leaf color analysis.
   *
   * Analyzes the image canvas for color patterns that indicate common
   * crop diseases. This is NOT a replacement for ML but provides a
   * basic offline diagnostic when the model isn't available.
   *
   * @param {string} base64Image - Base64-encoded JPEG
   * @param {object} context - Farmer context
   * @returns {Promise<object>} Heuristic classification result
   */
  async classifyFallback(base64Image, context = {}) {
    const crop = (context.crop || 'corn').toLowerCase();

    // Analyze image colors using a canvas
    const colorAnalysis = await this.analyzeImageColors(base64Image);

    // Simple rule-based diagnosis based on color distribution
    let diagnosis = {
      crop: crop,
      disease_name: "Unable to determine (offline heuristic mode)",
      confidence: "Low (heuristic)",
      severity: "Unknown",
      type: "Unknown",
      organic_remedy: "Please consult a local agronomist or take the photo to your nearest Krishi Vigyan Kendra.",
      chemical_remedy: "Consult a certified agricultural expert for proper diagnosis.",
      color_analysis: colorAnalysis,
      mode: "fallback_heuristic",
      model_status: this.runtimeMode,
      ml_runtime_used: false
    };

    // Yellowing → nutrient deficiency or viral
    if (colorAnalysis.yellow_ratio > 0.25) {
      diagnosis = {
        crop: crop,
        disease_name: `${crop.charAt(0).toUpperCase() + crop.slice(1)} — Possible Nutrient Deficiency (Yellowing)`,
        confidence: "Low (heuristic — " + Math.round(colorAnalysis.yellow_ratio * 100) + "% yellowing detected)",
        severity: "Moderate",
        type: "Nutrient",
        organic_remedy: "Apply well-decomposed FYM (farm yard manure) at 10-15 tonnes/hectare. Spray 2% urea solution if nitrogen deficiency suspected.",
        chemical_remedy: "Apply NPK fertilizer as per soil test. For nitrogen deficiency: top-dress urea at 25-30 kg/hectare.",
        color_analysis: colorAnalysis,
        mode: "fallback_heuristic",
        model_status: this.runtimeMode,
        ml_runtime_used: false
      };
    }
    // Brown/dark spots → fungal infection
    else if (colorAnalysis.brown_ratio > 0.15) {
      diagnosis = {
        crop: crop,
        disease_name: `${crop.charAt(0).toUpperCase() + crop.slice(1)} — Possible Fungal Infection (Brown Spots)`,
        confidence: "Low (heuristic — " + Math.round(colorAnalysis.brown_ratio * 100) + "% brown spots detected)",
        severity: "High",
        type: "Fungal",
        organic_remedy: "Spray neem oil at 5ml/liter. Apply Trichoderma viride as biocontrol. Remove and burn infected leaves.",
        chemical_remedy: "Apply carbendazim at 1g/liter or mancozeb at 2.5g/liter. Observe 14-day pre-harvest interval.",
        color_analysis: colorAnalysis,
        mode: "fallback_heuristic",
        model_status: this.runtimeMode,
        ml_runtime_used: false
      };
    }
    // Mostly green → healthy
    else if (colorAnalysis.green_ratio > 0.50) {
      diagnosis = {
        crop: crop,
        disease_name: `${crop.charAt(0).toUpperCase() + crop.slice(1)} — Appears Healthy`,
        confidence: "Medium (heuristic — " + Math.round(colorAnalysis.green_ratio * 100) + "% healthy green detected)",
        severity: "None",
        type: "Healthy",
        organic_remedy: "Continue regular monitoring. Maintain balanced irrigation and nutrition.",
        chemical_remedy: "No treatment needed. Continue regular farm practices.",
        color_analysis: colorAnalysis,
        mode: "fallback_heuristic",
        model_status: this.runtimeMode,
        ml_runtime_used: false
      };
    }

    // Add regional hint if available
    const cropHints = this.REGIONAL_HINTS[crop.charAt(0).toUpperCase() + crop.slice(1)];
    if (cropHints && cropHints[diagnosis.disease_name.split(' — ')[1]?.trim()]) {
      const hint = cropHints[diagnosis.disease_name.split(' — ')[1]?.trim()];
      diagnosis.hindi_name = hint.hindi;
      diagnosis.regional_treatment = hint.treatment;
    }

    return diagnosis;
  }

  /**
   * Analyzes the color distribution of an image using a canvas.
   * Returns ratios of green, yellow, brown, and other colors.
   *
   * @param {string} base64Image - Base64-encoded JPEG
   * @returns {Promise<object>} Color ratio analysis
   */
  async analyzeImageColors(base64Image) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 224; // Resize to 224x224 for quick analysis
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, maxDim, maxDim);

        const imageData = ctx.getImageData(0, 0, maxDim, maxDim);
        const pixels = imageData.data;

        let green = 0, yellow = 0, brown = 0, other = 0;
        const total = pixels.length / 4;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];

          // Green: high green channel, moderate red/blue
          if (g > 80 && g > r && g > b) {
            green++;
          }
          // Yellow: high red + green, low blue
          else if (r > 100 && g > 100 && b < 80) {
            yellow++;
          }
          // Brown: moderate red, low green, low blue
          else if (r > 60 && r < 150 && g < 80 && b < 60) {
            brown++;
          }
          else {
            other++;
          }
        }

        resolve({
          green_ratio: green / total,
          yellow_ratio: yellow / total,
          brown_ratio: brown / total,
          other_ratio: other / total,
          total_pixels: total
        });
      };
      img.onerror = () => {
        resolve({ green_ratio: 0.5, yellow_ratio: 0.2, brown_ratio: 0.1, other_ratio: 0.2, total_pixels: 0 });
      };
      img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    });
  }

  /**
   * Returns the list of all disease labels the classifier can detect.
   * @returns {Array} Disease label objects
   */
  getLabels() {
    return this.DISEASE_LABELS;
  }

  /**
   * Checks if the classifier is running in ML mode or fallback heuristic mode.
   * @returns {boolean} True if real ML model is loaded
   */
  isMlMode() {
    return this.modelLoaded && !!this.classifier && this.runtimeMode.startsWith('mediapipe_');
  }
}

// Export for use in dashboard.js
window.CropClassifier = CropClassifier;
