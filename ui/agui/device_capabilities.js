/**
 * device_capabilities.js
 * Detects the farmer's device capabilities and determines which features
 * can be enabled. This drives the tiered offline AI strategy:
 *
 * Tier 1 (Full AI):   WebGPU + 4GB+ RAM → Gemma-4-2B + TFLite + OKF cache
 * Tier 2 (Vision AI): WebGL + 2GB+ RAM  → TFLite classifier + OKF cache
 * Tier 3 (Knowledge): Any device         → OKF cache + rule-based responses
 */

(function() {

  const DeviceCapabilities = {
    // Detected features
    webgpu: false,
    webgl: false,
    camera: false,
    geolocation: false,
    speechSynthesis: false,
    speechRecognition: false,
    serviceWorker: false,
    pushNotifications: false,
    backgroundSync: false,
    indexedDB: false,
    cacheApi: false,
    notifications: false,

    // Device tier (1=full, 2=vision, 3=knowledge)
    tier: 3,
    tierName: 'Knowledge AI',

    // RAM estimate (rough)
    deviceMemory: 0,

    // Connection type
    connectionType: 'unknown',
    saveData: false,

    // Screen size
    screenWidth: 0,
    screenHeight: 0,
    isMobile: false,

    /**
     * Detect all device capabilities
     * @returns {Promise<object>} Capability report
     */
    async detect() {
      console.log('[Device] Detecting capabilities...');

      // WebGPU check
      this.webgpu = !!navigator.gpu;
      if (this.webgpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          this.webgpu = !!adapter;
        } catch (e) {
          this.webgpu = false;
        }
      }

      // WebGL check
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        this.webgl = !!gl;
      } catch (e) {
        this.webgl = false;
      }

      // Camera
      this.camera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      // Geolocation
      this.geolocation = !!navigator.geolocation;

      // Speech Synthesis (TTS)
      this.speechSynthesis = !!window.speechSynthesis;

      // Speech Recognition (STT)
      this.speechRecognition = !!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

      // Service Worker
      this.serviceWorker = !!('serviceWorker' in navigator);

      // Push Notifications
      this.pushNotifications = !!('PushManager' in window);

      // Background Sync
      this.backgroundSync = !!('SyncManager' in window);

      // IndexedDB
      this.indexedDB = !!window.indexedDB;

      // Cache API
      this.cacheApi = !!('caches' in window);

      // Notifications API
      this.notifications = !!('Notification' in window);

      // Device memory (Chrome only — returns GB in powers of 2)
      this.deviceMemory = navigator.deviceMemory || 0;

      // Connection type
      if (navigator.connection) {
        this.connectionType = navigator.connection.effectiveType || 'unknown';
        this.saveData = navigator.connection.saveData || false;
      }

      // Screen size
      this.screenWidth = window.screen.width;
      this.screenHeight = window.screen.height;
      this.isMobile = window.screen.width < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Determine tier
      this._determineTier();

      // Save to localStorage for other modules
      localStorage.setItem('device_tier', String(this.tier));
      localStorage.setItem('device_tier_name', this.tierName);
      localStorage.setItem('device_webgpu', String(this.webgpu));
      localStorage.setItem('device_webgl', String(this.webgl));

      const report = this.getReport();
      console.log('[Device] Tier:', this.tierName, '(', this.tier, ')');
      console.log('[Device] Capabilities:', report.summary);
      return report;
    },

    /**
     * Determine the device tier based on capabilities
     */
    _determineTier() {
      if (this.webgpu && this.deviceMemory >= 4) {
        this.tier = 1;
        this.tierName = 'Full AI';
      } else if (this.webgl) {
        this.tier = 2;
        this.tierName = 'Vision AI';
      } else {
        this.tier = 3;
        this.tierName = 'Knowledge AI';
      }
    },

    /**
     * Get a human-readable capability report
     * @returns {object} Report with features and recommendations
     */
    getReport() {
      const features = {
        'WebGPU (Gemma-4-2B LLM)': this.webgpu,
        'WebGL (TFLite Classifier)': this.webgl,
        'Camera': this.camera,
        'Geolocation': this.geolocation,
        'Voice Output (TTS)': this.speechSynthesis,
        'Voice Input (STT)': this.speechRecognition,
        'Service Worker (Offline)': this.serviceWorker,
        'Push Notifications': this.pushNotifications,
        'Background Sync': this.backgroundSync,
        'IndexedDB (Local Storage)': this.indexedDB,
        'Cache API': this.cacheApi,
        'Notifications': this.notifications,
      };

      const recommendations = {
        canRunGemma: this.webgpu,
        canRunTFLite: this.webgl,
        canRunOffline: this.serviceWorker && this.indexedDB,
        canUseVoice: this.speechRecognition && this.speechSynthesis,
        canUseCamera: this.camera,
        canCacheKnowledge: this.indexedDB,
        canPushAlerts: this.pushNotifications && this.notifications,
      };

      const summary = Object.entries(features)
        .filter(([k, v]) => v)
        .map(([k]) => k)
        .join(', ');

      return {
        tier: this.tier,
        tierName: this.tierName,
        features: features,
        recommendations: recommendations,
        summary: summary,
        deviceMemory: this.deviceMemory,
        connectionType: this.connectionType,
        isMobile: this.isMobile,
      };
    },

    /**
     * Show a toast notification to the farmer about what's available
     */
    showCapabilityToast() {
      if (typeof window.showToast !== 'function') return;

      const messages = {
        1: ['Full AI Mode', 'Your device supports offline AI assistant, crop diagnosis, and voice.'],
        2: ['Vision AI Mode', 'Your device supports offline crop diagnosis, knowledge search, and voice.'],
        3: ['Knowledge Mode', 'Your device supports offline knowledge search and voice. Basic but effective.'],
      };

      const [title, msg] = messages[this.tier] || messages[3];
      window.showToast(title, msg, 'info');
    },
  };

  // Run detection on page load
  document.addEventListener('DOMContentLoaded', async () => {
    await DeviceCapabilities.detect();
    // Show capability info after 5 seconds (non-intrusive)
    setTimeout(() => DeviceCapabilities.showCapabilityToast(), 5000);
  });

  window.DeviceCapabilities = DeviceCapabilities;
})();
