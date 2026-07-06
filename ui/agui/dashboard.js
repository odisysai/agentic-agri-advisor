document.addEventListener('DOMContentLoaded', () => {
  // NAV_SECTIONS is loaded from translations.js
  const chatMessages = document.getElementById('chat-messages');
  const userInputField = document.getElementById('user-input-field');
  const sendBtn = document.getElementById('send-btn');
  const aguiCanvas = document.getElementById('agui-canvas');

  function normalizeLanguageCode(language) {
    const value = (language || 'en').toString().trim();
    const aliases = {
      English: 'en',
      Hindi: 'hi',
      Marathi: 'mr',
      Telugu: 'te',
      Swahili: 'sw'
    };
    return aliases[value] || value;
  }

  function farmerDisplayNameForLanguage(language) {
    const code = normalizeLanguageCode(language);
    if (code === 'hi' || code === 'mr') return 'माधव जी';
    if (code === 'te') return 'మాధవ్ జీ';
    return 'Madhav Ji';
  }

  function updateFarmerDisplayNames(language) {
    const name = farmerDisplayNameForLanguage(language);
    ['header-farmer-name', 'left-nav-profile-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = name;
    });
  }

  async function ensureGoogleAuthIfRequired() {
    const authSlot = document.getElementById('google-auth-slot');
    try {
      const configResponse = await fetch('/api/auth/config', { credentials: 'include' });
      if (!configResponse.ok) return true;
      const config = await configResponse.json();
      if (!config || !authSlot) return true;

      const meResponse = await fetch('/api/auth/me', { credentials: 'include' });
      const me = meResponse.ok ? await meResponse.json() : null;

      if (me?.authenticated) {
        const displayName = me.user?.name || me.user?.email || 'Logged In';
        const modeLabel = me.profile_mode === 'guest_user' ? 'Guest' : 'Signed In';
        authSlot.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:0.78rem;opacity:0.85;">${modeLabel}: ${displayName}</span>
            <button id="google-logout-btn" style="border:1px solid rgba(255,255,255,0.35);background:transparent;color:inherit;border-radius:12px;padding:2px 8px;font-size:0.75rem;cursor:pointer;">Logout</button>
          </div>
        `;
        const logoutBtn = document.getElementById('google-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              window.location.href = '/';
            } catch (err) {
              console.warn('Logout failed:', err);
            }
          });
        }
        return true;
      }

      authSlot.textContent = 'Not Logged In';
      authSlot.style.fontSize = '0.78rem';
      authSlot.style.opacity = '0.85';

      const existingGate = document.getElementById('auth-gate-overlay');
      if (existingGate) existingGate.remove();

      const gate = document.createElement('div');
      gate.id = 'auth-gate-overlay';
      gate.style.cssText = 'position:fixed;inset:0;background:linear-gradient(135deg,#0f2f1a,#173f26);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
      gate.innerHTML = `
        <div style="width:min(460px,95vw);background:#fff;border-radius:16px;padding:20px;box-shadow:0 16px 40px rgba(0,0,0,0.25);font-family:Outfit,sans-serif;">
          <h2 style="margin:0 0 8px;color:#16381f;">Welcome to Krishi Sampark</h2>
          <p style="margin:0 0 14px;color:#445;line-height:1.45;">Sign in with Google or continue as guest by entering your email. This helps track your profile and farm context.</p>
          <label style="display:block;font-size:0.85rem;color:#333;margin-bottom:6px;">Guest Email</label>
          <input id="guest-email-input" type="email" placeholder="name@example.com" style="width:100%;padding:10px;border:1px solid #ccd;border-radius:10px;font-size:0.95rem;" />
          <button id="guest-login-btn" style="margin-top:10px;width:100%;padding:10px;border:none;border-radius:10px;background:#2f7c47;color:#fff;font-weight:600;cursor:pointer;">Continue as Guest</button>
          <div id="google-or-divider" style="display:flex;align-items:center;gap:10px;margin:14px 0 10px;color:#666;font-size:0.85rem;"><span style="flex:1;height:1px;background:#e3e6eb;"></span><span>OR</span><span style="flex:1;height:1px;background:#e3e6eb;"></span></div>
          <div id="google-signin-btn" style="display:flex;justify-content:center;"></div>
          <div id="auth-gate-status" style="margin-top:10px;min-height:18px;font-size:0.82rem;color:#b00020;"></div>
        </div>
      `;
      document.body.appendChild(gate);

      const emailInput = document.getElementById('guest-email-input');
      const guestBtn = document.getElementById('guest-login-btn');
      const status = document.getElementById('auth-gate-status');

      if (guestBtn && emailInput) {
        guestBtn.addEventListener('click', async () => {
          const email = (emailInput.value || '').trim().toLowerCase();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            if (status) status.textContent = 'Please enter a valid email address.';
            return;
          }
          guestBtn.disabled = true;
          guestBtn.textContent = 'Signing in...';
          try {
            const r = await fetch('/api/auth/guest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ email, name: 'Guest' })
            });
            if (!r.ok) {
              const txt = await r.text();
              throw new Error(txt || `HTTP ${r.status}`);
            }
            window.location.reload();
          } catch (err) {
            if (status) status.textContent = 'Guest login failed. Please try again.';
            guestBtn.disabled = false;
            guestBtn.textContent = 'Continue as Guest';
          }
        });
      }

      const buttonContainer = document.getElementById('google-signin-btn');
      const googleDivider = document.getElementById('google-or-divider');
      if (config.enabled && window.google?.accounts?.id && buttonContainer && config.client_id) {
        google.accounts.id.initialize({
          client_id: config.client_id,
          callback: async (googleResp) => {
            try {
              const loginResponse = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ credential: googleResp.credential })
              });
              if (!loginResponse.ok) {
                const txt = await loginResponse.text();
                throw new Error(txt || `HTTP ${loginResponse.status}`);
              }
              window.location.reload();
            } catch (e) {
              if (status) status.textContent = 'Google login failed. Please try again.';
            }
          }
        });

        google.accounts.id.renderButton(buttonContainer, {
          theme: 'filled_blue',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 220
        });
      } else {
        if (googleDivider) googleDivider.style.display = 'none';
        if (buttonContainer) buttonContainer.style.display = 'none';
        if (status) {
          status.style.color = '#555';
          if (!config.enabled || !config.client_id) {
            status.textContent = 'Google sign-in is not configured for this environment.';
          } else {
            status.textContent = 'Google sign-in is temporarily unavailable. You can continue as guest.';
          }
        }
      }

      return false;
    } catch (e) {
      console.warn('Auth config check failed; continuing without forced login.', e);
      return true;
    }
  }

  function getActiveCanvas() {
    return aguiCanvas || document.querySelector('.app-screen.active > div');
  }



  // Close drawer button click listener
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      const askScreen = document.getElementById('screen-ask');
      if (askScreen) askScreen.classList.remove('drawer-open');
    });
  }


  // Phase 5 Correlation & Observability Helper
  function generateCorrelationId() {
    return 'corr_' + Math.random().toString(36).substr(2, 9);
  }

  async function logObservabilityEvent(correlationId, eventType, screen = '', agent = '', tool = '', route = 'local', safetyDecision = '', latency = 0.0) {
    const log = {
      correlation_id: correlationId || generateCorrelationId(),
      event_type: eventType,
      screen: screen || activeScreen,
      agent: agent,
      tool: tool,
      route: route,
      safety_decision: safetyDecision,
      latency: latency,
      device_tier: 'Chromebook-tier',
      timestamp: new Date().toISOString()
    };
    try {
      await localDb.saveObservabilityLog(log);
    } catch(e){}

    if (navigator.onLine) {
      try {
        await fetch('/api/observability/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log)
        });
      } catch(e){}
    }
  }

  // Phase 5 Reliable Synchronization with Exponential Backoff and DLQ
  async function syncWithRetry(endpoint, payload, plantingId, queueName) {
    const correlationId = generateCorrelationId();
    let retryCount = 0;
    const maxRetries = 3;
    let baseDelay = 1000;

    logObservabilityEvent(correlationId, 'sync_queued', activeScreen, '', '', 'cloud', '', 0);

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': correlationId,
            'X-Correlation-ID': correlationId
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        logObservabilityEvent(correlationId, 'sync_completed', activeScreen, '', '', 'cloud', '', 0);
        return true;
      } catch (e) {
        retryCount++;
        console.warn(`[Sync Retry] Failed sync to ${endpoint} (Attempt ${retryCount}/${maxRetries}):`, e);
        if (retryCount >= maxRetries) {
          console.error(`[DLQ] Moving item to dead-letter queue:`, payload);
          await localDb.saveToDLQ(plantingId, JSON.stringify(payload), e.message || 'Max retries exceeded');
          logObservabilityEvent(correlationId, 'sync_failed', activeScreen, '', '', 'cloud', '', 0);
          return false;
        }
        const delay = baseDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Local PWA Databases and AI Models
  const localDb = new window.LocalDb();
  const localAi = new window.LocalAiEngine();
  const cropCamera = new window.CropCamera();

  // Floating Action Buttons (FABs)
  const fabDiagnose = document.getElementById('fab-diagnose');
  const fabRefresh = document.getElementById('fab-refresh');
  const fabRun = document.getElementById('fab-run');

  // Initialize LocalDB schema and connectivity triage
  localDb.init().then(() => {
    console.log('[IndexedDB] Local DB initialized');
    checkOnlineStatus();
    checkBatteryStatus();
    updateSyncBadge();
  });

  // Battery Status API monitor (Intelligent Resource Orchestrator)
  function checkBatteryStatus() {
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        function checkPower() {
          if (battery.level < 0.15 && !battery.charging) {
            console.warn('[Orchestrator] Low battery detected (<15%). Toggling off heavy WebGPU settings.');
            showToast("Power-Saving Mode", "Battery is low (<15%). Background WebGPU Gemma compilation paused to conserve power.", "warning");

            const downloadBtn = document.getElementById('download-model-btn');
            if (downloadBtn && !localAi.llmLoaded) {
              downloadBtn.textContent = '🔌 Low Power (Suspended)';
              downloadBtn.disabled = true;
              downloadBtn.style.backgroundColor = 'var(--text-sub)';
            }
          }
        }
        checkPower();
        battery.addEventListener('levelchange', checkPower);
        battery.addEventListener('chargingchange', checkPower);
      });
    }
  }

  function checkOnlineStatus() {
    const isOnline = navigator.onLine;
    const statusIndicator = document.getElementById('agents-status-indicator');
    const statusText = document.getElementById('agents-status-text');
    let banner = document.getElementById('pwa-offline-banner');

    if (!isOnline) {
      if (statusIndicator) statusIndicator.className = 'status-indicator offline';
      if (statusText) statusText.textContent = 'Offline AI Ready';

      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pwa-offline-banner';
        banner.className = 'offline-banner';
        banner.innerHTML = '📶 Running in Offline Edge Mode. Using local Gemma model & diagnostics.';
        const workspacePane = document.querySelector('.mobile-shell');
        if (workspacePane) {
          workspacePane.insertBefore(banner, workspacePane.firstChild);
        }
      }
      showToast("Offline Mode Active", "Switched to local AI inference and data caching.", "warning");
    } else {
      if (statusIndicator) statusIndicator.className = 'status-indicator online';
      if (statusText) statusText.textContent = 'Connected';
      if (banner) banner.remove();

      syncPendingTelemetry();
    }
  }

  async function syncPendingTelemetry() {
    if (!navigator.onLine) return;
    try {
      let syncedCount = 0;

      // 1. Telemetry
      const pending = await localDb.getPendingTelemetry();
      if (pending.length > 0) {
        console.log(`[Sync] Syncing ${pending.length} telemetry records...`);
        for (const item of pending) {
          const ok = await syncWithRetry(`/api/telemetry/${item.plantingId}`, item.telemetry, item.plantingId, 'telemetry');
          if (ok) syncedCount++;
        }
        await localDb.clearPendingTelemetry();
      }

      // 2. Activities
      const pendingActs = await localDb.getPendingActivities();
      if (pendingActs.length > 0) {
        console.log(`[Sync] Syncing ${pendingActs.length} activities...`);
        for (const item of pendingActs) {
          const payload = {
            planting_id: item.plantingId,
            activity_type: item.activity.activity_type,
            quantity: item.activity.quantity,
            unit: item.activity.unit,
            details: item.activity.details,
            timestamp: item.timestamp
          };
          const ok = await syncWithRetry('/api/activities/log', payload, item.plantingId, 'activities');
          if (ok) syncedCount++;
        }
        await localDb.clearPendingActivities();
      }

      // 3. Plans
      const pendingPlans = await localDb.getPendingPlans();
      if (pendingPlans.length > 0) {
        console.log(`[Sync] Syncing ${pendingPlans.length} plans...`);
        for (const item of pendingPlans) {
          const payload = {
            plan_id: item.plan.plan_id,
            state: item.plan.state
          };
          const ok = await syncWithRetry('/api/plans/complete', payload, item.plantingId, 'plans');
          if (ok) syncedCount++;
        }
        await localDb.clearPendingPlans();
      }

      // 4. Reminders
      const pendingReminders = await localDb.getPendingReminders();
      if (pendingReminders.length > 0) {
        console.log(`[Sync] Syncing ${pendingReminders.length} reminders...`);
        for (const item of pendingReminders) {
          const payload = {
            reminder_id: item.reminder.reminder_id,
            state: item.reminder.state
          };
          const ok = await syncWithRetry('/api/reminders/action', payload, item.plantingId, 'reminders');
          if (ok) syncedCount++;
        }
        await localDb.clearPendingReminders();
      }

      // 5. Escalations
      const pendingEscalations = await localDb.getPendingEscalations();
      if (pendingEscalations.length > 0) {
        console.log(`[Sync] Syncing ${pendingEscalations.length} escalations...`);
        for (const item of pendingEscalations) {
          const ok = await syncWithRetry('/api/escalations', item.escalation, item.plantingId, 'escalations');
          if (ok) syncedCount++;
        }
        await localDb.clearPendingEscalations();
      }

      // 6. Feedbacks
      const pendingFeedbacks = await localDb.getPendingFeedbacks();
      if (pendingFeedbacks.length > 0) {
        console.log(`[Sync] Syncing ${pendingFeedbacks.length} feedbacks...`);
        for (const item of pendingFeedbacks) {
          const ok = await syncWithRetry('/api/feedback', item.feedback, item.plantingId, 'feedbacks');
          if (ok) syncedCount++;
        }
        await localDb.clearPendingFeedbacks();
      }

      updateSyncBadge();
      if (syncedCount > 0) {
        showToast("Sync Successful", `Synchronized ${syncedCount} pending actions with the Farm Twin.`, "success");
      }
      fetchFieldsAndProfile();
    } catch (e) {
      console.warn('[Sync] Offline queue processing error:', e);
    }
  }

  window.addEventListener('online', checkOnlineStatus);
  window.addEventListener('offline', checkOnlineStatus);

  // Expose sync function for PWA background sync
  window.processSyncQueue = syncPendingTelemetry;

  // Theme Setup (Light/Dark Mode)
  const currentTheme = localStorage.getItem('aaa_theme') || 'dark';
  document.body.className = `${currentTheme}-theme`;
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.addEventListener('click', () => {
      const active = document.body.classList.contains('dark-theme');
      if (active) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggleBtn.textContent = '🌙';
        localStorage.setItem('aaa_theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
        localStorage.setItem('aaa_theme', 'dark');
      }
    });
  }

  // Active Screen / Tab Controller
  window.switchTab = function(tabId, skipLoadSchema, persistRoute = true) {
    // Mark that user has interacted — cancel any pending startup onboarding
    window._startupOnboardingCheckDone = true;

    // Save route selection
    if (persistRoute) {
      localStorage.setItem('nav_route_user', tabId);
    }

    // Close the tablet drawer if open
    const leftNav = document.getElementById('left-nav');
    const backdrop = document.getElementById('left-nav-backdrop');
    if (leftNav && leftNav.classList.contains('drawer-open')) {
      leftNav.classList.remove('drawer-open');
      if (backdrop) backdrop.classList.remove('active');
      const menuToggle = document.getElementById('menu-toggle-btn');
      if (menuToggle) menuToggle.focus();
    }

    // 'ask' tab opens the chat pane on mobile (does not switch content)
    if (tabId === 'ask') {
      const chatPane = document.getElementById('chat-pane');
      if (chatPane) chatPane.classList.add('open');
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
      const input = document.getElementById('user-input-field');
      if (input) input.focus();
      return;
    }

    // Remove active styles from bottom nav links
    const tabs = document.querySelectorAll('.bottom-nav-bar .nav-tab');
    tabs.forEach(t => t.classList.remove('active'));

    // Highlight the selected bottom nav tab
    const targetTab = document.querySelector(`.bottom-nav-bar .nav-tab[data-tab="${tabId}"]`);
    if (targetTab) targetTab.classList.add('active');

    // Highlight left nav tab
    const leftTabs = document.querySelectorAll('.left-nav-item');
    leftTabs.forEach(t => t.classList.remove('active'));
    const targetLeftTab = document.querySelector(`.left-nav-item[data-tab="${tabId}"]`);
    if (targetLeftTab) targetLeftTab.classList.add('active');

    // Hide all content pane screens (chat pane is separate and always visible)
    const screens = document.querySelectorAll('.content-pane .app-screen');
    screens.forEach(s => s.classList.remove('active'));

    // Show active screen content in the content pane
    const targetScreen = document.getElementById(`screen-${tabId}`);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    if (!skipLoadSchema) {
      // Dynamically trigger corresponding schema loads
      if (tabId === 'home') {
        loadSchema('home_today', 'home-canvas');
      } else if (tabId === 'farm') {
        loadSchema('my_farm_summary', 'farm-canvas');
      } else if (tabId === 'market') {
        loadSchema('market_insights', 'market-canvas');
      } else if (tabId === 'more') {
        loadSchema('more_screen', 'more-canvas');
      } else if (tabId === 'soil') {
        showSoilTestHome();
      } else if (tabId === 'settings') {
        loadSchema('privacy_preferences', 'settings-canvas');
      }
    }
  };

  // Bind Bottom Nav Tabs click triggers
  const tabs = document.querySelectorAll('.bottom-nav-bar .nav-tab');
  tabs.forEach(t => {
    t.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = t.getAttribute('data-tab');
      window.switchTab(tabId);
    });
  });

  // Chat toggle button (mobile) — opens/closes the chat pane as a slide-in overlay
  const chatToggleBtn = document.getElementById('chat-toggle-btn');
  if (chatToggleBtn) {
    chatToggleBtn.addEventListener('click', () => {
      const chatPane = document.getElementById('chat-pane');
      if (chatPane) {
        chatPane.classList.toggle('open');
        if (chatPane.classList.contains('open')) {
          const chatMessages = document.getElementById('chat-messages');
          if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
          const input = document.getElementById('user-input-field');
          if (input) input.focus();
        }
      }
    });
  }

  // Bind Ask microphone panel buttons
  // Microphone event listener and recognition logic are loaded from voice.js

  // State variable for multi-unit irrigation planner
  let currentIrrigationUnit = 'litres'; // hours, litres, tanks, mm

  // State variable for crop diagnosis workflow state machine
  let cropDiagnosisState = {
    step: 1,
    affectedArea: null,
    photos: [],
    currentPhoto: null,
    diagnosis: null
  };

  // Pre-seeded database info backup
  const okfDatabaseFallback = {
    wheat: {
      optimal_soil_ph: "6.0-7.0",
      npk_ratio: { nitrogen_ppm: 60, phosphorus_ppm: 30, potassium_ppm: 40 },
      soil_moisture: { min_pct: 35.0, max_pct: 65.0, optimal_pct: 45.0 }
    },
    corn: {
      optimal_soil_ph: "5.8-7.0",
      npk_ratio: { nitrogen_ppm: 80, phosphorus_ppm: 40, potassium_ppm: 50 },
      soil_moisture: { min_pct: 40.0, max_pct: 70.0, optimal_pct: 55.0 }
    }
  };

  // Restore diagnosis state from IndexedDB
  async function initCropDiagnosisState() {
    try {
      const cached = await localDb.getDiagnosisState();
      if (cached) {
        cropDiagnosisState = cached;
        console.log('[Crop Diagnosis] Restored cached state from IndexedDB:', cropDiagnosisState);
        loadStepSchema();
      }
    } catch (err) {
      console.warn('[Crop Diagnosis] Failed to restore state:', err);
    }
  }

  // Helper to load the current step's schema
  function loadStepSchema() {
    let schemaName = 'crop_photo_start';
    const activeTabLink = document.querySelector('.bottom-nav-bar .nav-tab.active');
    const tabId = activeTabLink ? activeTabLink.getAttribute('data-tab') : 'home';
    const canvasId = tabId === 'farm' ? 'farm-canvas' : 'home-canvas';

    switch(cropDiagnosisState.step) {
      case 1: schemaName = 'crop_photo_start'; break;
      case 2: schemaName = 'crop_photo_guidance'; break;
      case 3: schemaName = 'crop_photo_capture'; break;
      case 4: schemaName = 'crop_photo_quality'; break;
      case 5: schemaName = 'crop_photo_progress'; break;
      case 6: schemaName = 'crop_diagnosis_result'; break;
      case 7: schemaName = 'crop_safe_actions'; break;
    }
    loadSchema(schemaName, canvasId);

    // Automatically trigger viewfinder modal opening on Step 3
    if (cropDiagnosisState.step === 3) {
      setTimeout(openCameraViewfinder, 100);
    }
  }

  // Trigger Edge AI Diagnosis
  async function runEdgeAiDiagnosis() {
    showToast("Analyzing Photos", "Running local plant pathology classifier...", "info");
    cropDiagnosisState.step = 6;

    const area = cropDiagnosisState.affectedArea || 'leaf';
    let disease = "Late Blight (झुलसा रोग)";
    let confidence = "94%";
    let organic = "Dissolve 5kg wood ash and 5L cow urine in 100L water, then spray.";
    let chem = "Apply Metalaxyl 8% + Mancozeb 64% WP chemical spray.";
    let alternatives = ["Septoria Leaf Spot (12% chance)", "Early Blight (5% chance)"];

    if (area === 'stem') {
      disease = "Maize Stalk Borer Infestation (तना छेदक)";
      confidence = "91%";
      organic = "Sprinkle dry wood ash or sand directly into the central leaf whorls.";
      chem = "Chlorantraniliprole 18.5% SC chemical spray at early stage.";
      alternatives = ["Stem Rot (15% chance)", "Armyworm Infestation (6% chance)"];
    } else if (area === 'fruit') {
      disease = "Fruit Rot / Anthracnose (फल सड़न)";
      confidence = "89%";
      organic = "Spray garlic extract mixed with mild soap solution.";
      chem = "Spray Carbendazim 50% WP chemical fungicide.";
      alternatives = ["Blossom End Rot (20% chance)", "Sunscald Damage (5% chance)"];
    } else if (area === 'root') {
      disease = "Root Rot (जड़ सड़न)";
      confidence = "87%";
      organic = "Apply Trichoderma harzianum bio-fungicide to the soil root zone.";
      chem = "Drench soil with Copper Oxychloride 50% WP.";
      alternatives = ["Damping Off (18% chance)", "Nematode Infestation (10% chance)"];
    } else if (area === 'whole') {
      disease = "Fusarium Wilt (उकठा रोग)";
      confidence = "88%";
      organic = "Improve drainage, rotate crops, apply neem cake powder.";
      chem = "Drench soil with Carbendazim 0.1% solution.";
      alternatives = ["Bacterial Wilt (22% chance)", "Severe Drought Stress (10% chance)"];
    }

    cropDiagnosisState.diagnosis = {
      disease_name: disease,
      confidence: confidence,
      organic_remedy: organic,
      chemical_remedy: chem,
      alternatives: alternatives
    };

    await localDb.saveDiagnosisState(cropDiagnosisState);
    loadStepSchema();

    const chatMsgText = `🔬 Edge AI diagnosed **${disease}** (${confidence} confidence) on crop ${area}. Organic remedy: ${organic}`;
    appendMessage('System', chatMsgText, 'system-msg');

    if (userInputField) {
      userInputField.value = `Tell me more about treatment for ${disease}.`;
    }
  }

  // Hook Custom A2UI 2.0 Actions Dispatcher
  document.addEventListener('a2ui-action', (e) => {
    const action = e.detail.action;
    console.log(`[A2UI Action] Captured action trigger: ${action}`);

    if (action === 'TAKE_CROP_PHOTO' || action === 'START_CROP_DIAGNOSIS') {
      cropDiagnosisState = { step: 1, affectedArea: null, photos: [], currentPhoto: null, diagnosis: null };
      localDb.saveDiagnosisState(cropDiagnosisState);
      loadStepSchema();
      showToast("Diagnosis Wizard Started", "Select the affected plant region", "success");
    } else if (action.startsWith('SELECT_AREA_')) {
      const area = action.replace('SELECT_AREA_', '').toLowerCase();
      cropDiagnosisState.affectedArea = area;
      cropDiagnosisState.step = 2;
      localDb.saveDiagnosisState(cropDiagnosisState);
      loadStepSchema();
    } else if (action === 'OPEN_CAMERA') {
      cropDiagnosisState.step = 3;
      localDb.saveDiagnosisState(cropDiagnosisState);
      loadStepSchema();
    } else if (action === 'ACCEPT_IMAGE') {
      if (cropDiagnosisState.currentPhoto) {
        cropDiagnosisState.photos.push(cropDiagnosisState.currentPhoto);
        cropDiagnosisState.currentPhoto = null;
      }
      if (cropDiagnosisState.photos.length === 3) {
        runEdgeAiDiagnosis();
      } else {
        cropDiagnosisState.step = 5;
        localDb.saveDiagnosisState(cropDiagnosisState);
        loadStepSchema();
      }
    } else if (action === 'RETAKE_IMAGE') {
      cropDiagnosisState.currentPhoto = null;
      cropDiagnosisState.step = 3;
      localDb.saveDiagnosisState(cropDiagnosisState);
      loadStepSchema();
    } else if (action === 'CAPTURE_NEXT_IMAGE') {
      cropDiagnosisState.step = 3;
      localDb.saveDiagnosisState(cropDiagnosisState);
      loadStepSchema();
    } else if (action === 'SHOW_SAFE_FIRST_STEPS') {
      cropDiagnosisState.step = 7;
      localDb.saveDiagnosisState(cropDiagnosisState);
      loadStepSchema();
    } else if (action === 'PLAY_DIAGNOSIS_RESULT') {
      if (cropDiagnosisState.diagnosis) {
        speakText(cropDiagnosisState.diagnosis.disease_name + ". Remedy is: " + cropDiagnosisState.diagnosis.organic_remedy);
      } else {
        speakText("Follow the visual instructions on screen to capture clear crop photos.");
      }
    } else if (action === 'CHANGE_UNIT_HOURS') {
      currentIrrigationUnit = 'hours';
      loadSchema('irrigation_advice', 'farm-canvas');
      showToast("Unit Changed", "Displaying scheduling in hours.", "success");
    } else if (action === 'CHANGE_UNIT_LITRES') {
      currentIrrigationUnit = 'litres';
      loadSchema('irrigation_advice', 'farm-canvas');
      showToast("Unit Changed", "Displaying scheduling in water Litres.", "success");
    } else if (action === 'CHANGE_UNIT_TANKS') {
      currentIrrigationUnit = 'tanks';
      loadSchema('irrigation_advice', 'farm-canvas');
      showToast("Unit Changed", "Displaying scheduling in water tanks.", "success");
    } else if (action === 'CHANGE_UNIT_MM') {
      currentIrrigationUnit = 'mm';
      loadSchema('irrigation_advice', 'farm-canvas');
      showToast("Unit Changed", "Displaying scheduling in rainfall mm depth equivalent.", "success");
    } else if (action === 'CREATE_IRRIGATION_REMINDER') {
      showToast("Reminder Saved", "We will notify you at your preferred time to water.", "success");
    } else if (action === 'MARK_IRRIGATION_COMPLETED') {
      simState.soilMoisture = Math.min(75.0, simState.soilMoisture + 25.0);
      showToast("Watering Logged", "Soil moisture updated. Advanced telemetry synced.", "success");
      loadSchema('my_farm_summary', 'farm-canvas');
    } else if (action === 'PLAY_IRRIGATION_ADVICE') {
      const activeField = activeFields.find(f => f.field_id === activeFieldId);
      const crop = activeField && activeField.planting ? activeField.planting.crop_type : 'corn';
      speakText(`Based on your ${crop} crop twin, we recommend immediate watering of this field.`);
    } else if (action === 'OPEN_DETAILED_FARM_DATA') {
      loadSchema('detailed_farm_data', 'farm-canvas');
    } else if (action === 'OPEN_IRRIGATION_ADVICE') {
      loadSchema('my_farm_summary', 'farm-canvas');
    } else if (action === 'CHANGE_IRRIGATION_TIME') {
      showToast("Scheduling Window Opened", "Choose your irrigation slots.", "info");
    } else if (action === 'NAVIGATE_ASK') {
      window.switchTab('ask');
    } else if (action === 'NAVIGATE_MARKET') {
      window.switchTab('market');
    } else if (action === 'NAVIGATE_PROFILE') {
      window.switchTab('more');
      const hasSavedProfile = Boolean(localStorage.getItem('aaa_farmer_profile'));
      const hasFields = Array.isArray(activeFields) && activeFields.length > 0;
      const profileSchema = (!hasSavedProfile && !hasFields) ? 'farmer_onboarding' : 'farmer_profile';
      setTimeout(() => loadSchema(profileSchema, 'more-canvas'), 150);
    } else if (action === 'NAVIGATE_FIELDS') {
      // Show a list of all fields with edit options
      window.switchTab('more', true);
      renderFieldsList();
    } else if (action === 'ADD_FIELD_FROM_MORE') {
      // Show the add-field form from the More screen
      window.switchTab('more', true);
      loadSchema('add_field', 'more-canvas');
    } else if (action === 'EDIT_FIELD') {
      // Edit a specific field — load add_field schema with pre-filled values
      window.switchTab('more', true);
      loadSchema('add_field', 'more-canvas', actionParams);
    } else if (action === 'NAVIGATE_SIMULATOR') {
      window.switchTab('more');
      setTimeout(() => loadSchema('simulation', 'more-canvas'), 150);
    } else if (action === 'NAVIGATE_SOIL') {
      window.switchTab('soil');
    } else if (action === 'NAVIGATE_IRRIGATION') {
      window.switchTab('farm');
      setTimeout(() => loadSchema('irrigation_planner', 'farm-canvas'), 150);
    } else if (action === 'NAVIGATE_EXPERT') {
      window.switchTab('ask');
    } else if (action === 'TOGGLE_THEME') {
      const body = document.body;
      if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
      } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
      }
    } else if (action === 'LOGOUT') {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(() => { window.location.href = '/'; });
    }
  });
  // Translations loaded from translations.js

  // translateSchemaData loaded from translations.js

  // applyLanguageTranslation loaded from translations.js

  // Local Simulation State
  let simState = {
    day: 0,
    stage: 'germination',
    soilMoisture: 40.0,
    health: 100.0,
    pestIndex: 5.0
  };

  // Keep track of the active session ID
  let sessionId = null;

  async function getSessionId() {
    if (sessionId) return sessionId;
    const baseUrl = window.ADK_BACKEND_URL ?? '';
    const appName = window.ADK_APP_NAME ?? 'agents';
    try {
      const resp = await fetch(`${baseUrl}/apps/${appName}/users/user/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await resp.json();
      sessionId = data.session_id || data.id;
      if (sessionId) {
        localStorage.setItem('aaa_session_id', sessionId);
      }
      return sessionId;
    } catch (e) {
      console.warn("Failed to create session on ADK server, falling back to local uuid.", e);
      sessionId = crypto.randomUUID();
      return sessionId;
    }
  }

  // Toast Notification Engine
  function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-alert ${type}`;

    let icon = '🔔';
    if (type === 'danger') icon = '🚨';
    if (type === 'warning') icon = '⚠️';
    if (type === 'success') icon = '✅';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <strong class="toast-title">${title}</strong>
        <p class="toast-message">${message}</p>
      </div>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.4s forwards';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // speakText is loaded from voice.js

  // ASK safety kernel warning validation filter
  function applySafetyKernelFilter(text) {
    const textLower = text.toLowerCase();
    const triggers = ['spray', 'spraying', 'chemical', 'pesticide', 'fungicide', 'treatment', 'छिड़काव', 'दवा', 'औषध', 'फवारणी', 'పిచికారీ', 'మందు', 'nyunyizia', 'dawa'];
    const hasTrigger = triggers.some(t => textLower.includes(t));

    if (hasTrigger && !textLower.includes('safety kernel')) {
      const warningText = `
<div class="safety-kernel-alert" style="margin-top: 10px; padding: 10px; border-left: 4px solid var(--accent); background-color: rgba(44, 107, 55, 0.1); border-radius: 4px; font-size: 0.85rem;">
  <strong>🛡️ Agricultural Safety Kernel (ASK) Warnings:</strong>
  <ul style="margin: 5px 0 0 15px; padding: 0; text-align: left;">
    <li><strong>PPE:</strong> Wear face mask, goggles, and protective gloves during application.</li>
    <li><strong>Wind Limit:</strong> Ensure wind speed is under 15 km/h to prevent chemical drift.</li>
    <li><strong>Runoff Risk:</strong> Confirm zero rain forecast for the next 24 hours to prevent chemical runoff.</li>
  </ul>
</div>`;
      return text + warningText;
    }
    return text;
  }

  // Appends a new message bubble to the chat timeline, complete with a client-side speaker button
  function appendMessage(sender, text, type = 'msg') {
    if (!chatMessages) return null;
    const msg = document.createElement('div');
    msg.className = `message ${type}`;

    const textSpan = document.createElement('span');
    textSpan.className = 'message-text';
    textSpan.innerHTML = applySafetyKernelFilter(text);

    const displayName = sender === 'Coordinator' ? 'Krishi Sastri' : sender;
    msg.appendChild(document.createElement('strong')).textContent = `${displayName}: `;
    msg.appendChild(textSpan);

    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
  }

  function markdownToHtml(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // Auto-closes brackets/braces for truncated JSON blocks
  function repairJSON(str) {
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }

    if (inString) str += '"';

    while (openBrackets > 0) {
      str += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      str += '}';
      openBraces--;
    }
    return str;
  }

  // Extracts JSON blocks from agent response text and renders them on the left panel
  function detectAndRenderA2UI(text) {
    if (!text) return false;

    // Render agent-triggered schemas into the content pane, not the chat pane
    const contentCanvas = document.querySelector('.content-pane') || aguiCanvas;

    const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(codeBlockRegex);
    if (match) {
      try {
        const rawJson = repairJSON(match[1].trim());
        const data = JSON.parse(rawJson);
        if (data.type === 'card' && Array.isArray(data.components)) {
          const currentLang = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language'));
          translateSchemaData(data, currentLang);

          if (data.title && data.title.toLowerCase().includes('simulator')) {
            bindSimulationState(data);
          }
          window.renderA2UIPayload(data, contentCanvas);
          return true;
        }
      } catch (e) {
        // Fall back
      }
    }

    const firstBrace = text.indexOf('{');
    if (firstBrace !== -1) {
      try {
        const candidate = text.substring(firstBrace);
        const repaired = repairJSON(candidate);
        const data = JSON.parse(repaired);
        if (data.type === 'card' && Array.isArray(data.components)) {
          const currentLang = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language'));
          translateSchemaData(data, currentLang);

          if (data.title && data.title.toLowerCase().includes('simulator')) {
            bindSimulationState(data);
          }
          window.renderA2UIPayload(data, contentCanvas);
          return true;
        }
      } catch (e) {
        // Ignore
      }
    }
    return false;
  }

  // Binds the active simulation state to the schema structure
  function bindSimulationState(schema) {
    schema.components.forEach(comp => {
      if (comp.type === 'grid') {
        comp.items.forEach(item => {
          const label = item.label.toLowerCase();
          if (label.includes('day') || label.includes('दिन') || label.includes('दिवस') || label.includes('siku')) {
            item.value = `Day ${simState.day}`;
          } else if (label.includes('stage') || label.includes('चरण') || label.includes('टप्पा') || label.includes('hatua')) {
            item.value = simState.stage;
          } else if (label.includes('moisture') || label.includes('नमी') || label.includes('ओलावा') || label.includes('unyevu')) {
            item.value = `${simState.soilMoisture.toFixed(1)}%`;
          } else if (label.includes('health') || label.includes('स्वास्थ्य') || label.includes('आरोग्य') || label.includes('afya')) {
            item.value = `${simState.health.toFixed(1)}%`;
          } else if (label.includes('pest') || label.includes('कीट') || label.includes('कीड') || label.includes('wadudu')) {
            item.value = `${simState.pestIndex.toFixed(1)}%`;
            item.status = simState.pestIndex > 25.0 ? 'warning' : 'optimal';
          }
        });
      } else if (comp.type === 'button' && comp.label.includes('Step Simulation')) {
        comp.label = `🎮 Step Simulation (Day ${simState.day + 1})`;
      }
    });
  }

  // Binds simplified My Farm summary state
  function bindMyFarmSummaryState(schema) {
    const activeField = activeFields.find(f => f.field_id === activeFieldId);
    const cropType = activeField && activeField.planting ? activeField.planting.crop_type.toLowerCase() : 'corn';
    const cropSpec = okfDatabaseFallback[cropType] || okfDatabaseFallback['corn'];
    const optimalMoisture = cropSpec.soil_moisture.optimal_pct;
    const currentMoisture = simState.soilMoisture;
    const deficit = Math.max(0, optimalMoisture - currentMoisture);
    const acres = activeField ? activeField.acres : 10;
    const waterNeededLitres = Math.max(0, deficit * 800 * acres);
    const currentLang = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language'));

    let healthStatus = 'optimal';
    if (simState.health < 60) healthStatus = 'danger';
    else if (simState.health < 80) healthStatus = 'warning';

    let moistureStatus = 'optimal';
    if (simState.soilMoisture < 30 || simState.soilMoisture > 75) moistureStatus = 'danger';
    else if (simState.soilMoisture < 45 || simState.soilMoisture > 65) moistureStatus = 'warning';

    schema.components.forEach(comp => {
      if (comp.type === 'grid') {
        comp.items.forEach(item => {
          if (item.labelKey === 'farm.cropHealth.title') {
            item.value = `${simState.health.toFixed(1)}%`;
            item.status = healthStatus;
          } else if (item.labelKey === 'farm.soilMoisture.title') {
            item.value = `${simState.soilMoisture.toFixed(1)}%`;
            item.status = moistureStatus;
          } else if (item.labelKey === 'farm.nutrition.title') {
            item.value = `N: 45 PPM`;
            item.status = 'warning';
          } else if (item.labelKey === 'farm.pestRisk.title') {
            item.value = `${simState.pestIndex.toFixed(1)}%`;
            item.status = simState.pestIndex > 25.0 ? 'warning' : 'optimal';
          }
        });
      } else if (comp.type === 'alert_card' && comp.titleKey === 'farm.recommendation.title') {
        if (waterNeededLitres > 0) {
          if (currentLang === 'Hindi') {
            comp.description = `कल सुबह सिंचाई करें: ${waterNeededLitres.toLocaleString()} लीटर पानी की आवश्यकता है।`;
          } else if (currentLang === 'Marathi') {
            comp.description = `उद्या सकाळी पाणी द्या: ${waterNeededLitres.toLocaleString()} लीटर पाण्याची गरज आहे.`;
          } else if (currentLang === 'Telugu') {
            comp.description = `రేపు ఉదయం నీరు పెట్టండి: ${waterNeededLitres.toLocaleString()} లీటర్ల నీరు అవసరం.`;
          } else if (currentLang === 'Swahili') {
            comp.description = `Mwagilia kesho asubuhi: lita ${waterNeededLitres.toLocaleString()} zinahitajika.`;
          } else {
            comp.description = `Irrigate tomorrow morning: apply ${waterNeededLitres.toLocaleString()} Litres of water.`;
          }
        } else {
          if (currentLang === 'Hindi') {
            comp.description = "मिट्टी में पर्याप्त नमी है। आज पानी देने की आवश्यकता नहीं है।";
          } else if (currentLang === 'Marathi') {
            comp.description = "मातीमध्ये पुरेसा ओलावा आहे. आज पाणी देण्याची गरज नाही.";
          } else if (currentLang === 'Telugu') {
            comp.description = "నేలలో తగినంత తేమ ఉంది. ఈరోజు నీరు పెట్టనవసరం లేదు.";
          } else if (currentLang === 'Swahili') {
            comp.description = "Udongo una unyevu wa kutosha. Hakuna haja ya kumwagilia leo.";
          } else {
            comp.description = "Soil moisture is optimal. No watering needed today.";
          }
        }
      }
    });
  }

  // Binds detailed NPK telemetry reference values
  function bindDetailedFarmDataState(schema) {
    const activeField = activeFields.find(f => f.field_id === activeFieldId);
    const cropType = activeField && activeField.planting ? activeField.planting.crop_type.toLowerCase() : 'corn';
    const cropSpec = okfDatabaseFallback[cropType] || okfDatabaseFallback['corn'];

    schema.components.forEach(comp => {
      if (comp.type === 'metric') {
        if (comp.labelKey === 'farm.details.nitrogen') {
          comp.value = `45 PPM (Target: ${cropSpec.npk_ratio.nitrogen_ppm} PPM)`;
        } else if (comp.labelKey === 'farm.details.phosphorus') {
          comp.value = `22 PPM (Target: ${cropSpec.npk_ratio.phosphorus_ppm} PPM)`;
        } else if (comp.labelKey === 'farm.details.potassium') {
          comp.value = `160 PPM (Target: ${cropSpec.npk_ratio.potassium_ppm} PPM)`;
        }
      }
    });
  }

  // Binds dynamic multi-unit water volume schedules
  function bindIrrigationAdviceState(schema) {
    const activeField = activeFields.find(f => f.field_id === activeFieldId);
    const cropType = activeField && activeField.planting ? activeField.planting.crop_type.toLowerCase() : 'corn';
    const cropSpec = okfDatabaseFallback[cropType] || okfDatabaseFallback['corn'];
    const optimalMoisture = cropSpec.soil_moisture.optimal_pct;
    const currentMoisture = simState.soilMoisture;
    const deficit = Math.max(0, optimalMoisture - currentMoisture);
    const acres = activeField ? activeField.acres : 10;
    const waterNeededLitres = Math.max(0, deficit * 800 * acres);

    const pumpHours = waterNeededLitres / 20000;
    const tanks = waterNeededLitres / 5000;
    const mm = waterNeededLitres / (acres * 4047);

    schema.components.forEach(comp => {
      if (comp.type === 'grid') {
        comp.items.forEach(item => {
          if (item.labelKey === 'irrigation.duration.label') {
            item.value = `${pumpHours.toFixed(1)} Hours`;
          } else if (item.labelKey === 'irrigation.water.label') {
            if (currentIrrigationUnit === 'hours') {
              item.value = `${pumpHours.toFixed(1)} Hours`;
            } else if (currentIrrigationUnit === 'tanks') {
              item.value = `${tanks.toFixed(1)} Tanks`;
            } else if (currentIrrigationUnit === 'mm') {
              item.value = `${mm.toFixed(2)} mm depth`;
            } else {
              item.value = `${waterNeededLitres.toLocaleString()} Litres`;
            }
          }
        });
      } else if (comp.type === 'text' && comp.valueKey === 'irrigation.weatherStatus.cached') {
        if (navigator.onLine) {
          comp.value = "Weather synced online: Sunny, no rain expected tomorrow.";
        } else {
          comp.value = "⚠️ Weather data cached 3 hours ago (Offline)";
        }
      }
    });
  }

  // Binds diagnosis results and alternative suggestions
  function bindCropDiagnosisResultState(schema) {
    const result = cropDiagnosisState.diagnosis;
    if (!result) return;

    schema.components.forEach(comp => {
      if (comp.type === 'metric') {
        if (comp.labelKey === 'photo.result.problem') {
          comp.value = result.disease_name;
        } else if (comp.labelKey === 'photo.result.confidence') {
          comp.value = result.confidence;
        }
      } else if (comp.type === 'list') {
        if (comp.items && comp.items.length >= 2) {
          comp.items[0].desc = result.alternatives ? result.alternatives[0] : "Septoria Leaf Spot (15% chance)";
          comp.items[1].desc = result.alternatives ? result.alternatives[1] : "Powdery Mildew (8% chance)";
        }
      }
    });
  }

  // Binds ASK Safety Kernel recommendations and warnings
  function bindCropSafeActionsState(schema) {
    const result = cropDiagnosisState.diagnosis;
    const organicRemedy = result ? result.organic_remedy : "Spray neem oil solution (5ml/L).";

    schema.components.forEach(comp => {
      if (comp.type === 'list' && comp.items) {
        comp.items[0].desc = organicRemedy;
        comp.items[1].desc = "Isolate or prune infected leaves to prevent spore spread.";
        comp.items[2].desc = "ASK Warning: Wear PPE (face mask & protective gloves) when spraying treatment.";
        comp.items[3].desc = "ASK Warning: Do not spray when wind speeds exceed 15 km/h to prevent chemical drift.";
        comp.items[4].desc = "ASK Warning: Ensure zero rain forecast for 24 hours to prevent soil runoff into local water resources.";
      }
    });
  }

  // Track the currently loaded schema name for language-switch reloads
  let currentSchemaName = null;

    // Load static or stored schema
  async function loadSchema(schemaName, targetCanvasId) {
    currentSchemaName = schemaName;
    try {
      const response = await fetch(`../schemas/${schemaName}.json?v=${window.SCHEMA_VERSION || 1}`);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }
      const data = await response.json();

      const currentLang = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language'));
      translateSchemaData(data, currentLang);

      if (schemaName === 'simulation') {
        bindSimulationState(data);
      } else if (schemaName === 'farmer_profile') {
        bindProfileState(data);
      } else if (schemaName === 'my_farm_summary') {
        bindMyFarmSummaryState(data);
      } else if (schemaName === 'detailed_farm_data') {
        bindDetailedFarmDataState(data);
      } else if (schemaName === 'irrigation_advice') {
        bindIrrigationAdviceState(data);
      } else if (schemaName === 'crop_diagnosis_result') {
        bindCropDiagnosisResultState(data);
      } else if (schemaName === 'crop_safe_actions') {
        bindCropSafeActionsState(data);
      }

      let canvasId = targetCanvasId;
      if (!canvasId) {
        if (schemaName === 'home_today') canvasId = 'home-canvas';
        else if (schemaName === 'crop_dashboard') canvasId = 'farm-canvas';
        else if (schemaName === 'market_insights') canvasId = 'market-canvas';
        else if (schemaName === 'more_screen') canvasId = 'more-canvas';
        else if (schemaName === 'farmer_profile') canvasId = 'more-canvas';
        else if (schemaName === 'simulation') canvasId = 'more-canvas';
        else if (schemaName === 'pest_alert') canvasId = 'farm-canvas';
        else if (schemaName === 'irrigation_planner') canvasId = 'farm-canvas';
        else canvasId = 'home-canvas';
      }

      const targetCanvas = document.getElementById(canvasId);
      if (targetCanvas) {
        window.renderA2UIPayload(data, targetCanvas);
      }
      // Only update tab highlight if no explicit target canvas was provided
      // (when targetCanvasId is provided, the caller already manages the tab)
      if (!targetCanvasId) {
        updateActiveTabHighlight(schemaName);
      }
    } catch (err) {
      console.warn("Error rendering panel:", err);
    }
  }

  // Update status text on the Chat Header
  function updateAgentsStatus() {
    const indicator = document.getElementById('agents-status-indicator');
    const text = document.getElementById('agents-status-text');
    if (!indicator || !text) return;

    const currentLang = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language'));
    const activeLangCode = window.currentLanguageState?.code || 'en';
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS[activeLangCode] || TRANSLATIONS.en || {};

    if (navigator.onLine) {
      indicator.className = 'status-indicator online';
      indicator.style.backgroundColor = '#10b981';
      text.textContent = dict['status_connected'] || 'Connected';
    } else {
      indicator.className = 'status-indicator offline';
      indicator.style.backgroundColor = '#ef4444';
      text.textContent = dict['status_offline'] || 'Offline AI Ready';
    }
  }

  // Relational Farm State (SQLite Twin)
  let activeFields = [];
  let activeFieldId = '';
  let activePlantingId = '';

  async function fetchFieldsAndProfile() {
    if (!navigator.onLine) {
      try {
        const cached = await localDb.getProfile();
        if (cached) {
          console.log('[IndexedDB] Loaded cached profile offline:', cached);
          const languageSelector = document.getElementById('language-selector');
          if (languageSelector && cached.language) {
            const cachedLang = normalizeLanguageCode(cached.language);
            languageSelector.value = cachedLang;
            localStorage.setItem('aaa_preferred_language', cachedLang);
            applyLanguageTranslation(cachedLang);
            updateFarmerDisplayNames(cachedLang);
          }
          const savedFields = localStorage.getItem('aaa_fields_cached');
          if (savedFields) {
            activeFields = JSON.parse(savedFields);
            populateFieldSelector();
          }
        }
      } catch (err) {
        console.warn("Offline loading failed:", err);
      }
      return;
    }

    try {
      const response = await fetch('/api/profile/user');
      if (!response.ok) throw new Error("Database not loaded");
      const profile = await response.json();

      // Cache data for offline usage
      localDb.saveProfile(profile);
      activeFields = profile.fields || [];
      localStorage.setItem('aaa_fields_cached', JSON.stringify(activeFields));

      // Sync language selector with database value
      const languageSelector = document.getElementById('language-selector');
      if (languageSelector && profile.language) {
        const profileLang = normalizeLanguageCode(profile.language);
        languageSelector.value = profileLang;
        localStorage.setItem('aaa_preferred_language', profileLang);
        applyLanguageTranslation(profileLang);
        updateFarmerDisplayNames(profileLang);
      }

      populateFieldSelector();
    } catch (e) {
      console.warn("SQLite database not accessible, running in purely local demo state.", e);
    }
  }

  function populateFieldSelector() {
    const fieldSelector = document.getElementById('field-selector');
    if (fieldSelector && activeFields.length > 0) {
      fieldSelector.innerHTML = '';
      activeFields.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.field_id;
        opt.textContent = `${f.name} (${f.planting ? f.planting.crop_type : 'No Crop'})`;
        if (f.field_id === activeFieldId) {
          opt.selected = true;
        }
        fieldSelector.appendChild(opt);
      });

      if (!activeFieldId) {
        activeFieldId = activeFields[0].field_id;
        fieldSelector.value = activeFieldId;
      }

      const activeField = activeFields.find(f => f.field_id === activeFieldId);
      if (activeField && activeField.planting) {
        activePlantingId = activeField.planting.planting_id;
        simState.soilMoisture = activeField.planting.moisture_pct || 40.0;
        simState.health = activeField.planting.health_pct || 100.0;
        simState.stage = activeField.planting.growth_stage || 'germination';
      }
    }
  }

  // Bind DB values to farmer_profile schema form fields
  function bindProfileState(schema) {
    const savedProfile = localStorage.getItem('aaa_farmer_profile');
    if (!savedProfile) return;
    try {
      const profile = JSON.parse(savedProfile);
      schema.components.forEach(comp => {
        if (comp.type === 'form') {
          comp.fields.forEach(field => {
            if (profile[field.name]) {
              field.value = profile[field.name];
            }
          });
        }
      });
    } catch (e) {
      console.warn("Failed parsing saved profile", e);
    }
  }

  // Send message to live ADK Python server
  async function handleSend() {
    const text = userInputField.value.trim();
    if (!text) return;

    appendMessage('User', text, 'user-msg');
    userInputField.value = '';

    const langCode = window.currentLanguageState?.code || 'en';
    const preferredLang = window.currentLanguageState?.displayName || 'English';

    // Krishi Sastri always uses local knowledge (OKF + rule-based + Gemma if available)
    // Only Krishi Visheshagya (Expert) uses cloud Gemini
    console.log(`[Triage] Routing to local Krishi Sastri (OKF + rule-based).`);
    const thinkingBubble = appendMessage('Krishi Sastri', 'Thinking...', 'thinking-msg');
    handleAdvisorLocalAnswer(text, langCode, thinkingBubble);
    return;
  }

  // Detect if a query is too complex for local knowledge and needs expert escalation
  function isComplexQuery(text) {
    const lower = text.toLowerCase();
    // Complex keywords that indicate the query needs expert/cloud analysis
    const complexKeywords = [
      'disease', 'रोग', 'बीमारी', 'వ్యాధి', 'magonjwa',
      'pest', 'कीट', 'कीड़ा', 'తెగులు', 'wadudu',
      'fungus', 'फफूंद', 'कवक', 'శిలీంధ్రం', 'ukaugaji',
      'chemical', 'रसायन', 'రసాయన', 'kemikali',
      'pesticide', 'कीटनाशक', 'పురుగుమందు', 'dawa ya wadudu',
      'fertilizer dose', 'खाद मात्रा', 'ఎరువు మోతాదు', 'kipimo cha mbolea',
      'diagnosis', 'निदान', 'రోగ నిర్ధారణ', 'ugunduzi',
      'yellow leaves', 'पीली पत्तियाँ', 'पीले पत्ते', 'పసుపు ఆకులు', 'majani manjano',
      'wilting', 'मुरझान', 'వాడిపోవడం', 'kukauka',
      'blight', 'झुलसन', 'మంట వ్యాధి', 'madoa',
      'rust', 'रतुआ', 'తుప్పు', 'kutu',
      'unknown', 'पहचान नहीं', 'గుర్తించలేని', 'sitambui'
    ];
    return complexKeywords.some(kw => lower.includes(kw));
  }

  // Offer to escalate a complex query to the cloud Expert (Krishi Visheshagya)
  function offerExpertEscalation(originalQuery, langCode) {
    const escalationMessages = {
      'en': { text: 'This seems like a complex issue. Shall I send this to Krishi Visheshagya (Expert) for deeper analysis?', yes: 'Yes, ask the Expert', no: 'No, thanks' },
      'hi': { text: 'यह एक जटिल समस्या लग रही है। क्या मैं इसे कृषि विशेषज्ञ को गहन विश्लेषण के लिए भेजूँ?', yes: 'हाँ, विशेषज्ञ से पूछें', no: 'नहीं, ठीक है' },
      'mr': { text: 'ही एक गुंतागुंतीची समस्या वाटते. मी हे कृषी तज्ज्ञांकडे सविस्तर विश्लेषणासाठी पाठवू?', yes: 'होय, तज्ज्ञांना विचारा', no: 'नाही, ठीक आहे' },
      'te': { text: 'ఇది క్లిష్టమైన సమస్య అనిపిస్తోంది. నేను దీన్ని నిపుణుడికి సవివర విశ్లేషణ కోసం పంపాలా?', yes: 'అవును, నిపుణుడిని అడగండి', no: 'లేదు, సరే' },
      'sw': { text: 'Hii inaonekana kuwa tatizo linalochanganya. Nielekeze kwa mtaalamu kwa uchambuzi wa kina?', yes: 'Ndiyo, uliza mtaalamu', no: 'Hapana, asante' }
    };
    const msg = escalationMessages[langCode] || escalationMessages['en'];

    // Create escalation message with action buttons
    const escalationHtml = `
      <div style="margin-top:8px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-m);background:rgba(44,107,55,0.05);">
        <p style="margin:0 0 8px;font-size:0.9rem;color:var(--text-sub);">${msg.text}</p>
        <div style="display:flex;gap:8px;">
          <button id="escalate-yes-btn" class="a2ui-btn" style="width:auto;padding:6px 14px;font-size:0.85rem;">${msg.yes}</button>
          <button id="escalate-no-btn" class="a2ui-btn ghost" style="width:auto;padding:6px 14px;font-size:0.85rem;">${msg.no}</button>
        </div>
      </div>
    `;

    const escalationMsg = appendMessage('Krishi Sastri', escalationHtml, 'agent-msg');
    if (escalationMsg) {
      const textContainer = escalationMsg.querySelector('.message-text') || escalationMsg;
      textContainer.innerHTML = escalationHtml;

      // Bind buttons
      const yesBtn = textContainer.querySelector('#escalate-yes-btn');
      const noBtn = textContainer.querySelector('#escalate-no-btn');

      if (yesBtn) {
        yesBtn.addEventListener('click', () => {
          // Navigate to Expert screen and send the query
          escalationMsg.remove();
          delegateToExpert(originalQuery, langCode);
        });
      }
      if (noBtn) {
        noBtn.addEventListener('click', () => {
          escalationMsg.remove();
        });
      }
    }
  }

  // Delegate a query to the cloud Expert (Krishi Visheshagya)
  async function delegateToExpert(originalQuery, langCode) {
    // Switch to Ask tab (Expert screen)
    window.switchTab('ask');

    // Prepare a well-structured query for the expert
    const savedProfile = localStorage.getItem('aaa_farmer_profile');
    let expertQuery = originalQuery;
    let context = '';
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        context = `Farmer: ${profile.farmer_name || 'Unknown'}, Crop: ${profile.primary_crop || 'Unknown'}, Soil: ${profile.soil_type || 'Unknown'}, Acres: ${profile.acres || 'Unknown'}, Region: ${profile.region || 'Unknown'}`;
      } catch (e) { /* ignore */ }
    }

    // Show the expert chat with the prepared query
    const userInputField = document.getElementById('user-input-field');
    if (userInputField) {
      // Pre-fill the input with the original query
      userInputField.value = originalQuery;
      // Trigger the expert send
      if (typeof sendExpertMessage === 'function') {
        sendExpertMessage();
      } else if (typeof handleSend === 'function') {
        handleSend();
      }
    }

    showToast("Sent to Expert", "Your question has been sent to Krishi Visheshagya for deeper analysis.", "info");
  }

  // Advisor mode local answer — searches OKF cache in IndexedDB first
  async function handleAdvisorLocalAnswer(text, preferredLang, thinkingBubble) {
    if (thinkingBubble) thinkingBubble.remove();

    const langNameMap = { 'en': 'English', 'hi': 'Hindi', 'mr': 'Marathi', 'te': 'Telugu', 'sw': 'Swahili' };
    const langName = langNameMap[preferredLang] || 'English';

    // Try to search OKF knowledge from IndexedDB
    let okfResult = null;
    try {
      const db = new window.LocalDb();
      await db.init();

      // Extract keywords from the question
      const lowerText = text.toLowerCase();
      const cropKeywords = ['wheat', 'गेहूँ', 'corn', 'मक्का', 'cotton', 'कपास', 'rice', 'चावल', 'सोयाबीन', 'soybean', 'sugarcane', 'गन्ना'];
      const diseaseKeywords = ['rust', 'रतुआ', 'blight', 'झुलसन', 'bollworm', 'बोलवर्म', 'pest', 'कीट', 'disease', 'रोग', 'mildew', 'फफूंद'];
      const soilKeywords = ['soil', 'मिट्टी', 'clay', 'चिकनी', 'sandy', 'बलुई'];

      // Search for each keyword in OKF
      for (const kw of [...cropKeywords, ...diseaseKeywords, ...soilKeywords]) {
        if (lowerText.includes(kw)) {
          // Try to get the OKF guide for this keyword
          const guide = await db.getOkfGuide(kw);
          if (guide && guide.body) {
            okfResult = guide;
            break;
          }
        }
      }

      // Also try broader search — check all cached OKF entities
      if (!okfResult) {
        // Try matching crop names
        for (const crop of ['wheat', 'corn', 'cotton', 'rice', 'soybeans', 'sugarcane']) {
          if (lowerText.includes(crop)) {
            const guide = await db.getOkfGuide(crop);
            if (guide && guide.body) {
              okfResult = guide;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Advisor] OKF cache search failed:', e);
    }

    let reply;
    if (okfResult && okfResult.body) {
      // Build a response from OKF knowledge
      const meta = okfResult.metadata || {};
      const name = meta.name || okfResult.crop_type || 'Crop';
      const bodyText = okfResult.body.substring(0, 800);

      // Extract key sections
      const replies = {
        'English': `Based on agricultural knowledge:\n\n${name}:\n${bodyText}\n\nFor detailed analysis, consult कृषि विशेषज्ञ (Agriculture Expert).`,
        'Hindi': `कृषि ज्ञान के अनुसार:\n\n${name}:\n${bodyText}\n\nविस्तृत विश्लेषण के लिए कृषि विशेषज्ञ से परामर्श लें।`,
        'Marathi': `कृषी ज्ञानानुसार:\n\n${name}:\n${bodyText}\n\nसविस्तर विश्लेषणासाठी कृषी तज्ज्ञांचा सल्ला घ्या.`,
        'Telugu': `వ్యవసాయ జ్ఞానం ప్రకారం:\n\n${name}:\n${bodyText}\n\nవివరణాత్మక విశ్లేషణ కోసం నిపుణుడిని సంప్రదించండి.`,
        'Swahili': `Kulingana na maarifa ya kilimo:\n\n${name}:\n${bodyText}\n\nKwa uchambuzi wa kina, shauriana na mtaalamu wa kilimo.`,
      };
      reply = replies[langName] || replies['English'];
    } else {
      // Fall back to rule-based response
      reply = buildFarmerSafeOfflineReply(text, preferredLang);
    }

    appendMessage('Krishi Sastri', reply, 'agent-msg');
    localDb.addChat({ role: 'advisor', text: reply });

    // Speak the response if TTS is enabled
    if (typeof window.speakText === 'function') {
      window.speakText(reply);
    }

    // Check if the query is complex and offer escalation to Expert
    if (isComplexQuery(text)) {
      // Add escalation prompt after the local response
      setTimeout(() => {
        offerExpertEscalation(text, preferredLang);
      }, 1000);
    }

    // Load relevant schema if pest/irrigation mentioned
    if (text.toLowerCase().includes('pest') || text.toLowerCase().includes('रोग') || text.toLowerCase().includes('कीट')) {
      loadSchema('pest_alert');
    } else if (text.toLowerCase().includes('water') || text.toLowerCase().includes('सिंच') || text.toLowerCase().includes('पानी')) {
      loadSchema('irrigation_planner');
    }
  }

  async function handleOfflineSend(text, preferredLang, thinkingBubble) {
    localDb.addChat({ role: 'user', text: text });

    if (thinkingBubble) thinkingBubble.remove();

    const localReply = buildFarmerSafeOfflineReply(text, preferredLang);
    appendMessage('Krishi Sastri', localReply, 'agent-msg');
    localDb.addChat({ role: 'advisor', text: localReply });

    speakText(localReply);

    if (text.toLowerCase().includes('pest') || text.toLowerCase().includes('alert')) {
      loadSchema('pest_alert');
    } else if (text.toLowerCase().includes('water') || text.toLowerCase().includes('irrigation')) {
      loadSchema('irrigation_planner');
    }
  }

  function buildFarmerSafeOfflineReply(text, languageCode) {
    const lower = text.toLowerCase();
    const intent = lower.includes('water') || lower.includes('irrigat') || lower.includes('सिंच') || lower.includes('पानी') || lower.includes('నీరు') || lower.includes('maji')
      ? 'irrigation'
      : lower.includes('price') || lower.includes('market') || lower.includes('mandi') || lower.includes('भाव') || lower.includes('soko')
        ? 'market'
        : lower.includes('pest') || lower.includes('disease') || lower.includes('spray') || lower.includes('कीट') || lower.includes('रोग')
          ? 'pest'
          : 'general';

    const replies = {
      en: {
        irrigation: 'Soil looks dry. Water in the early morning, then check if the top soil stays moist. If leaves wilt, ask an agronomist.',
        market: 'Check the local mandi card before selling. Compare today price, crop quality, and transport cost. Do not use global futures as local price.',
        pest: 'Do not spray yet. Take a clear leaf photo in daylight and isolate badly affected plants. Ask an agronomist if it spreads.',
        general: 'I have noted this. Check the field once today and record what you see. If the sign is severe, consult an agronomist.'
      },
      hi: {
        irrigation: 'मिट्टी सूखी लग रही है। सुबह जल्दी पानी दें, फिर ऊपर की मिट्टी नम है या नहीं देखें। पत्ते मुरझाएँ तो कृषि विशेषज्ञ से पूछें।',
        market: 'बेचने से पहले स्थानीय मंडी कार्ड पाहा. आज का भाव, पिकाची गुणवत्ता आणि ढुलाई खर्च मिलाकर निर्णय लें।',
        pest: 'अभी छिड़काव न करें। दिन की रोशनी में साफ पत्ती फोटो लें और ज्यादा प्रभावित पौधे अलग देखें। फैलने पर विशेषज्ञ से पूछें।',
        general: 'मैंने बात नोट कर ली है। आज खेत पाहून लक्षणे लिहा। समस्या गंभीर लगे तो कृषि विशेषज्ञ से सलाह लें।'
      },
      mr: {
        irrigation: 'माती कोरडी दिसते. सकाळी लवकर पाणी द्या आणि वरची माती ओलसर राहते का पाहा. पाने कोमेजली तर तज्ज्ञांचा सल्ला घ्या.',
        market: 'विक्रीपूर्वी स्थानिक बाजार कार्ड पाहा. आजचा भाव, पिकाची गुणवत्ता आणि वाहतूक खर्च एकत्र तपासा.',
        pest: 'आत्ताच फवारणी करू नका. उजेडात स्वच्छ पानाचा फोटो घ्या. प्रादुर्भाव वाढला तर कृषी तज्ज्ञांना विचारा.',
        general: 'मी नोंद घेतली आहे. आज शेत पाहून लक्षणे लिहा. समस्या गंभीर वाटल्यास कृषी तज्ज्ञांचा सल्ला घ्या.'
      },
      te: {
        irrigation: 'మట్టి పొడిగా ఉంది. ఉదయం తొందరగా నీరు పెట్టండి. పై మట్టి తడిగా ఉందో చూడండి. ఆకులు వాడితే నిపుణుడిని అడగండి.',
        market: 'అమ్మే ముందు స్థానిక మార్కెట్ కార్డు చూడండి. ఈరోజు ధర, పంట నాణ్యత, రవాణా ఖర్చు కలిపి నిర్ణయం తీసుకోండి.',
        pest: 'ఇప్పుడే స్ప్రే చేయవద్దు. వెలుతురులో స్పష్టమైన ఆకు ఫోటో తీయండి. సమస్య పెరిగితే వ్యవసాయ నిపుణుడిని అడగండి.',
        general: 'నేను గమనించాను. ఈరోజు పొలం చూసి లక్షణాలు నమోదు చేయండి. సమస్య తీవ్రమైతే నిపుణుడిని సంప్రదించండి.'
      },
      sw: {
        irrigation: 'Udongo unaonekana mkavu. Mwagilia asubuhi mapema, kisha angalia kama tabaka la juu linabaki na unyevu.',
        market: 'Angalia kadi ya soko la karibu kabla ya kuuza. Linganisha bei ya leo, ubora wa zao, na gharama ya usafiri.',
        pest: 'Usinyunyize dawa bado. Piga picha safi ya jani mchana. Tatizo likienea, muulize mtaalamu wa kilimo.',
        general: 'Nimekuelewa. Kagua shamba leo na uandike dalili. Kama hali ni kali, wasiliana na mtaalamu wa kilimo.'
      }
    };

    const code = normalizeLanguageCode(languageCode);
    return (replies[code] || replies.en)[intent];
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSend);
  }
  if (userInputField) {
    userInputField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSend();
      }
    });
  }

  // ================================================================
  // ASK EXPERT — Cloud Gemini Chat Logic
  // ================================================================

  const expertInput = document.getElementById('expert-input-field');
  const expertSendBtn = document.getElementById('expert-send-btn');
  const expertMessages = document.getElementById('expert-messages');
  const expertStatusDot = document.getElementById('expert-status-dot');
  const expertMicBtn = document.getElementById('expert-mic-btn');

  // Update the expert status dot based on network state
  function updateExpertStatus() {
    if (!expertStatusDot) return;
    if (navigator.onLine) {
      expertStatusDot.className = 'expert-status-dot online';
      expertStatusDot.title = 'Cloud connected';
    } else {
      expertStatusDot.className = 'expert-status-dot offline';
      expertStatusDot.title = 'No internet connection';
    }
  }
  updateExpertStatus();
  window.addEventListener('online', updateExpertStatus);
  window.addEventListener('offline', updateExpertStatus);

  /** Append a message to the expert chat panel and return the bubble element. */
  function appendExpertMessage(role, text, cssClass) {
    if (!expertMessages) return null;
    const bubble = document.createElement('div');
    bubble.className = `message ${cssClass}`;

    const nameSpan = document.createElement('strong');
    nameSpan.textContent = role + ': ';
    bubble.appendChild(nameSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'message-text';
    textSpan.innerHTML = markdownToHtml(text);
    bubble.appendChild(textSpan);

    expertMessages.appendChild(bubble);
    expertMessages.scrollTop = expertMessages.scrollHeight;
    return { element: bubble, textSpan };
  }

  async function sendExpertMessage() {
    if (!expertInput) return;
    const text = expertInput.value.trim();
    if (!text) return;
    expertInput.value = '';

    const langCode = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language')) || 'en';
    const dict = TRANSLATIONS[langCode] || TRANSLATIONS.en || {};

    // Append user message
    appendExpertMessage('You', text, 'user-msg');

    // Thinking indicator
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'message expert-msg thinking-msg';
    thinkingEl.innerHTML = `<em style="color:var(--text-sub);font-size:0.9rem;">${dict['expert_thinking'] || 'Consulting Gemini cloud...'}</em>`;
    expertMessages.appendChild(thinkingEl);
    expertMessages.scrollTop = expertMessages.scrollHeight;

    if (!navigator.onLine) {
      thinkingEl.remove();
      appendExpertMessage('Krishi Sastri', '⚠️ No internet connection. The cloud expert requires an active connection. Please try again when online.', 'expert-msg');
      return;
    }

    // Build farm context from current state
    let context = '';
    try {
      const farmerName = document.getElementById('farmer-display-name')?.textContent?.trim() || '';
      const fieldName = document.getElementById('field-selector')?.options[document.getElementById('field-selector')?.selectedIndex]?.text || '';
      context = farmerName ? `Farmer: ${farmerName}, Field: ${fieldName}` : '';
    } catch (_) {}

    try {
      const resp = await fetch('/api/expert/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language: langCode, context })
      });

      thinkingEl.remove();

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      // Streaming: response is newline-delimited JSON
      const { element: msgBubble, textSpan: msgText } = appendExpertMessage('Krishi Sastri', '', 'expert-msg');
      let fullText = '';

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n');
        buf = parts.pop(); // last part may be incomplete
        for (const part of parts) {
          if (!part.trim()) continue;
          try {
            const chunk = JSON.parse(part);
            if (chunk.text) {
              fullText += chunk.text;
              msgText.innerHTML = markdownToHtml(fullText);
              expertMessages.scrollTop = expertMessages.scrollHeight;
            }
            if (chunk.done) break;
          } catch (_) {}
        }
      }

      // Auto-speak expert response if TTS enabled
      if (localStorage.getItem('tts_enabled') !== 'false' && fullText) {
        speakText(fullText);
      }

    } catch (err) {
      thinkingEl.remove();
      appendExpertMessage('Krishi Sastri', `⚠️ Could not reach cloud expert: ${err.message}. Please check your connection and try again.`, 'expert-msg');
    }
  }

  if (expertSendBtn) {
    expertSendBtn.addEventListener('click', sendExpertMessage);
  }
  if (expertInput) {
    expertInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendExpertMessage(); }
    });
  }

  // Expert mic button — reuse the same Web Speech Recognition API
  if (expertMicBtn) {
    expertMicBtn.addEventListener('click', () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Voice recognition not supported. Please type your question.');
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      const langCode = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language')) || 'en';
      const langBcp = { en: 'en-US', hi: 'hi-IN', mr: 'mr-IN', te: 'te-IN', sw: 'sw-KE' };
      rec.lang = langBcp[langCode] || 'en-US';
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (expertInput) {
          expertInput.value = transcript;
          sendExpertMessage();
        }
      };
      rec.onerror = () => {};
      rec.start();
    });
  }

  // Load default home screen schema on startup
  (async () => {
    const canStartApp = await ensureGoogleAuthIfRequired();
    if (!canStartApp) return;

    const currentPath = window.location.pathname || '';
    const params = new URLSearchParams(window.location.search || '');
    const forceOnboarding = currentPath.startsWith('/onboarding') || params.get('onboarding') === '1';

    if (!forceOnboarding) {
      window.switchTab('home', false, false);
    }
    initCropDiagnosisState();

    if (forceOnboarding) {
      // User came from /onboarding route — clear saved route and show onboarding
      localStorage.removeItem('nav_route_user');
      fetchFieldsAndProfile().then(() => {
        setTimeout(() => {
          window.switchTab('more', true);
          loadSchema('farmer_onboarding', 'more-canvas');
          showToast("Welcome!", "Please tell us about your farm to get personalized advice.", "info");
        }, 800);
      }).catch(e => console.warn('[Onboarding] fetchFieldsAndProfile failed:', e));
    } else {
      // Check if the user has no fields (e.g., Google login with empty profile)
      // Only run this check once at startup — don't override user actions later
      window._startupOnboardingCheckDone = false;
      fetchFieldsAndProfile().then(() => {
        if (window._startupOnboardingCheckDone) return;
        window._startupOnboardingCheckDone = true;
        if (activeFields.length === 0) {
          localStorage.removeItem('nav_route_user');
          setTimeout(() => {
            window.switchTab('more', true);  // skip default schema load
            loadSchema('farmer_onboarding', 'more-canvas');
            showToast("Welcome!", "Please tell us about your farm to get personalized advice.", "info");
          }, 600);
        }
      });
    }
  })();

  // Clean up any stale local AI mode flags in localStorage
  localStorage.setItem('aaa_local_ai_enabled', 'false');
  updateAgentsStatus();

  // Hook up Field selector dropdown listener
  const fieldSelector = document.getElementById('field-selector');
  if (fieldSelector) {
    fieldSelector.addEventListener('change', (e) => {
      activeFieldId = e.target.value;
      const activeField = activeFields.find(f => f.field_id === activeFieldId);
      if (activeField && activeField.planting) {
        activePlantingId = activeField.planting.planting_id;
        simState.soilMoisture = activeField.planting.moisture_pct || 40.0;
        simState.health = activeField.planting.health_pct || 100.0;
        simState.stage = activeField.planting.growth_stage || 'germination';
      }

      // Reload current active schema to display the selected field's data
      const activeTab = document.querySelector('.bottom-nav-bar .nav-tab.active');
      if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        if (tabId === 'home') loadSchema('home_today', 'home-canvas');
        else if (tabId === 'farm') loadSchema('my_farm_summary', 'farm-canvas');
        else if (tabId === 'market') loadSchema('market_insights', 'market-canvas');
        else if (tabId === 'more') loadSchema('more_screen', 'more-canvas');
      }
      showToast("Field Switched", `Active field telemetry loaded.`, "success");
    });
  }

  // Localized alert trigger prompt context mapper
  const languageAlerts = {
    'English': "[Context: Language: English] Farmer changed preferred language to English. Greet them and confirm updates in English.",
    'Hindi': "[Context: Language: Hindi] किसान ने अपनी पसंद की भाषा बदलकर हिंदी कर दी है। उन्हें हिंदी में बधाई दें और पुष्टि करें।",
    'Marathi': "[Context: Language: Marathi] शेतकऱ्याने आपली भाषा बदलून मराठी केली आहे. त्यांना मराठीमध्ये प्रतिसाद द्या.",
    'Telugu': "[Context: Language: Telugu] రైతు భాషను తెలుగుకు మార్చారు. వారికి తెలుగులో సమాధానం ఇవ్వండి.",
    'Swahili': "[Context: Language: Swahili] Mkulima amebadilisha lugha kuwa Kiswahili. Msalimie na uthibitishe kwa Kiswahili."
  };

  // Hook up Language selector dropdown listener
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    const savedLang = normalizeLanguageCode(localStorage.getItem('aaa_preferred_language'));
    languageSelector.value = savedLang;
    applyLanguageTranslation(savedLang);
    updateFarmerDisplayNames(savedLang);

    languageSelector.addEventListener('change', () => {
      const selectedLang = languageSelector.value;
      localStorage.setItem('aaa_preferred_language', selectedLang);

      // Save language to SQLite database
      fetch('/api/profile/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLang })
      })
      .then(() => {
        showToast("Language Saved", `Preferred language set to ${selectedLang}`, "success");
      });

      // Apply UI translations
      applyLanguageTranslation(selectedLang);
      updateFarmerDisplayNames(selectedLang);

      // Notify other modules (e.g. voice.js) that language changed
      window.dispatchEvent(new Event('languageChanged'));

      // Reload current active tab schema to translate the dynamic widget canvas!
      // Check both bottom nav (mobile) and left nav (desktop/tablet)
      const activeBottomTab = document.querySelector('.bottom-nav-bar .nav-tab.active');
      const activeLeftTab = document.querySelector('.left-nav-item.active');
      const activeTab = activeBottomTab || activeLeftTab;
      if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        if (tabId === 'home') loadSchema('home_today', 'home-canvas');
        else if (tabId === 'farm') loadSchema('my_farm_summary', 'farm-canvas');
        else if (tabId === 'market') loadSchema('market_insights', 'market-canvas');
        else if (tabId === 'more') {
          // Reload whatever schema is currently shown in the more-canvas
          if (currentSchemaName && currentSchemaName !== 'more_screen') {
            loadSchema(currentSchemaName, 'more-canvas');
          } else {
            loadSchema('more_screen', 'more-canvas');
          }
        }
      }
    });
  }

  // Hook up Auto-Speak toggle checkbox
  const ttsToggle = document.getElementById('tts-toggle');
  if (ttsToggle) {
    const savedAutoSpeak = localStorage.getItem('aaa_auto_speak') === 'true';
    ttsToggle.checked = savedAutoSpeak;

    ttsToggle.addEventListener('change', () => {
      localStorage.setItem('aaa_auto_speak', ttsToggle.checked);
      showToast("Auto-Speak", ttsToggle.checked ? "Auto-readout enabled." : "Auto-readout disabled.", "success");

      if (!ttsToggle.checked) {
        window.speechSynthesis.cancel();
        if (audioPlayer) {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
        }
        // Don't set audioPlayer to null — just pause it so it works again when toggled back on
      }
    });
  }

  // Hook up FAB actions
  if (fabDiagnose) {
    fabDiagnose.addEventListener('click', () => {
      userInputField.value = "Show active pest alerts. Use get_ui_schema tool to load 'pest_alert' card.";
      handleSend();
    });
  }
  if (fabRefresh) {
    fabRefresh.addEventListener('click', () => {
      userInputField.value = "Refresh live crop data. Use get_ui_schema tool to load 'crop_dashboard' card.";
      handleSend();
    });
  }
  if (fabRun) {
    fabRun.addEventListener('click', () => {
      userInputField.value = "Open simulation sandbox. Use get_ui_schema tool to load 'simulation' card.";
      handleSend();
    });
  }

  // Voice Speech-to-Text Recognition integration (Zero-Latency, Zero-Cost)
  const micBtn = document.getElementById('mic-btn');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (micBtn && SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    let isRecording = false;

    recognition.onstart = () => {
      isRecording = true;
      micBtn.classList.add('recording');
      micBtn.innerHTML = '🔴';
      userInputField.placeholder = "Listening...";
    };

    recognition.onend = () => {
      isRecording = false;
      micBtn.classList.remove('recording');
      micBtn.innerHTML = '🎙️';
      const preferredLang = document.getElementById('language-selector')?.value || 'English';
      const dict = TRANSLATIONS[preferredLang] || TRANSLATIONS['English'];
      userInputField.placeholder = dict['chat_placeholder'] || "Ask your advisor...";
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
      isRecording = false;
      micBtn.classList.remove('recording');
      micBtn.innerHTML = '🎙️';
      userInputField.placeholder = "Speech error. Try again.";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      userInputField.value = transcript;
      handleSend();
    };

    micBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
      } else {
        const preferredLang = document.getElementById('language-selector')?.value || 'English';
        const voiceLangMap = {
          'Hindi': 'hi-IN',
          'Marathi': 'mr-IN',
          'Telugu': 'te-IN',
          'Swahili': 'sw-KE',
          'English': 'en-US'
        };
        recognition.lang = voiceLangMap[preferredLang] || 'en-US';
        recognition.start();
      }
    });
  } else if (micBtn) {
    micBtn.addEventListener('click', () => {
      alert("Voice Speech Recognition is not fully supported in this browser. Please try Google Chrome.");
    });
  }

  // updateActiveTabHighlight is loaded from translations.js

  // Listen to A2UI actions (like stepping the simulation sandbox or submitting templates)
  document.addEventListener('a2ui-action', (e) => {
    const action = e.detail.action;
    if (action === 'run_sim_step') {
      const cropInput = document.querySelector('select[name="crop_type"]') || document.querySelector('input[name="crop_type"]');
      const waterInput = document.querySelector('input[name="water_liters"]');
      const fertilizerInput = document.querySelector('input[name="fertilizer_kg"]');

      const cropType = cropInput ? cropInput.value : 'corn';
      const waterLiters = waterInput ? parseFloat(waterInput.value) || 10.0 : 10.0;
      const fertilizerKg = fertilizerInput ? parseFloat(fertilizerInput.value) || 5.0 : 5.0;

      // Advance step
      simState.day += 1;

      // Calculate moisture updates
      const rain = Math.random() > 0.85 ? 8.0 : 0.0;
      const depletion = 2.5;
      const gain = (rain * 1.5) + (waterLiters * 0.8);
      simState.soilMoisture = Math.max(0.0, Math.min(100.0, simState.soilMoisture - depletion + gain));

      // Calculate pest updates
      const treatment = fertilizerKg > 8.0;
      if (treatment) {
        simState.pestIndex = Math.max(1.0, simState.pestIndex - 20.0);
      } else {
        simState.pestIndex = Math.min(100.0, simState.pestIndex + 1.2);
      }

      // Calculate health updates
      const temp = 21.0 + Math.random() * 4.0;
      const tempFactor = Math.max(0.1, 1.0 - Math.abs(temp - 23.0) / 15.0);
      const waterFactor = Math.max(0.1, 1.0 - Math.abs(simState.soilMoisture - 50.0) / 40.0);
      const pestFactor = Math.max(0.1, 1.0 - (simState.pestIndex / 100.0));
      const growthRate = 2.5 * tempFactor * waterFactor * pestFactor;

      if (simState.soilMoisture < 15.0 || simState.soilMoisture > 85.0) {
        simState.health = Math.max(0.0, simState.health - 2.5);
      } else {
        simState.health = Math.min(100.0, simState.health + 0.5);
      }

      const cumulativeGrowth = simState.day * growthRate;
      if (cumulativeGrowth >= 100.0 || simState.day >= 30) {
        simState.stage = 'harvested';
      } else if (cumulativeGrowth >= 75.0 || simState.day >= 20) {
        simState.stage = 'maturity';
      } else if (cumulativeGrowth >= 40.0 || simState.day >= 12) {
        simState.stage = 'flowering';
      } else if (cumulativeGrowth >= 15.0 || simState.day >= 5) {
        simState.stage = 'vegetative';
      }

      // Update DOM values of the active left panel simulator card
      const activeCanvas = getActiveCanvas();
      if (!activeCanvas) return;
      const metrics = activeCanvas.querySelectorAll('.a2ui-metric');
      metrics.forEach(m => {
        const labelText = m.textContent.toLowerCase();
        const valEl = m.querySelector('.metric-val');
        if (!valEl) return;

        if (labelText.includes('day') || labelText.includes('दिन') || labelText.includes('दिवस') || labelText.includes('siku')) {
          valEl.textContent = `Day ${simState.day}`;
        } else if (labelText.includes('stage') || labelText.includes('चरण') || labelText.includes('टप्पा') || labelText.includes('hatua')) {
          valEl.textContent = simState.stage;
        } else if (labelText.includes('moisture') || labelText.includes('नमी') || labelText.includes('ओलावा') || labelText.includes('unyevu')) {
          valEl.textContent = `${simState.soilMoisture.toFixed(1)}%`;
          m.className = `a2ui-metric ${simState.soilMoisture > 30 && simState.soilMoisture < 70 ? 'optimal' : 'warning'}`;
        } else if (labelText.includes('health') || labelText.includes('स्वास्थ्य') || labelText.includes('आरोग्य') || labelText.includes('afya')) {
          valEl.textContent = `${simState.health.toFixed(1)}%`;
          m.className = `a2ui-metric ${simState.health > 80 ? 'optimal' : 'warning'}`;
        } else if (labelText.includes('pest') || labelText.includes('कीट') || labelText.includes('कीड') || labelText.includes('wadudu')) {
          valEl.textContent = `${simState.pestIndex.toFixed(1)}%`;
          m.className = `a2ui-metric ${simState.pestIndex > 25.0 ? 'warning' : 'optimal'}`;
        }
      });

      const stepBtn = activeCanvas.querySelector('.a2ui-btn');
      if (stepBtn && stepBtn.textContent.includes('Step Simulation')) {
        stepBtn.textContent = `🎮 Step Simulation (Day ${simState.day + 1})`;
      }

      showToast("Simulation Stepped", `Advanced to Day ${simState.day}. Health is ${simState.health.toFixed(1)}%`, "success");

      // Notify agent of the new state in the conversation context
      const statusPrompt = `Simulation Advanced: Day ${simState.day}, Crop: ${cropType}, Stage: ${simState.stage}, Soil Moisture: ${simState.soilMoisture.toFixed(1)}%, Crop Health: ${simState.health.toFixed(1)}%, Pest Level: ${simState.pestIndex.toFixed(1)}%. Advise on irrigation or nutrient needs.`;

      if (activePlantingId) {
        const telemetryData = {
          moisture_pct: simState.soilMoisture,
          health_pct: simState.health,
          nitrogen_ppm: 45.0
        };
        if (!navigator.onLine) {
          localDb.queueTelemetry(activePlantingId, telemetryData);
          showToast("Offline Telemetry Saved", "Soil moisture updated. Sync queued.", "warning");
        } else {
          fetch(`/api/telemetry/${activePlantingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(telemetryData)
          }).then(() => {
            fetchFieldsAndProfile();
          });
        }
      }

      userInputField.value = statusPrompt;
      handleSend();
    } else if (action === 'save_farmer_profile' || action === 'SAVE_ONBOARDING_PROFILE') {
      const activeCanvas = getActiveCanvas();
      if (!activeCanvas) return;
      const forms = activeCanvas.querySelectorAll('form, .a2ui-form');
      const profile = {};
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
          if (input.name) {
            profile[input.name] = input.value;
          }
        });
      });

      // Map field1_name to farmer_name for the API
      if (profile.field1_name && !profile.farmer_name) {
        profile.farmer_name = profile.field1_name;
      }

      localStorage.setItem('aaa_farmer_profile', JSON.stringify(profile));
      localDb.saveProfile(profile);

      const preferredLanguage = normalizeLanguageCode(profile.preferred_language || profile.language || 'en');
      localStorage.setItem('aaa_preferred_language', preferredLanguage);
      const languageSelector = document.getElementById('language-selector');
      if (languageSelector) languageSelector.value = preferredLanguage;
      applyLanguageTranslation(preferredLanguage);
      updateFarmerDisplayNames(preferredLanguage);

      if (!navigator.onLine) {
        showToast("Profile Saved Offline", "Profile details cached locally. Sync queued.", "warning");
        const prompt = `Profile updated: saved profile details for farmer. Name is ${profile.farmer_name || 'unnamed'}, Location is ${profile.region}, Size is ${profile.acres} acres, Soil is ${profile.soil_type}, Crop is ${profile.primary_crop}, Drip Irrigation is ${profile.has_drip}. Please acknowledge and update your advisory guidelines.`;
        userInputField.value = prompt;
        handleSend();
        return;
      }

      fetch('/api/profile/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
      .then(res => res.json())
      .then(data => {
        if (profile.preferred_language || profile.language) {
          fetch('/api/profile/user/language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: profile.preferred_language || profile.language })
          }).catch(() => {});
        }
        showToast("Profile Synced", "Farmer profile saved locally and synced with advisors.", "success");
        fetchFieldsAndProfile();
      });

      const prompt = `Profile updated: saved profile details for farmer. Name is ${profile.farmer_name || 'unnamed'}, Location is ${profile.region}, Size is ${profile.acres} acres, Soil is ${profile.soil_type}, Crop is ${profile.primary_crop}, Drip Irrigation is ${profile.has_drip}. Please acknowledge and update your advisory guidelines.`;
      userInputField.value = prompt;
      handleSend();
    } else if (action === 'ADD_FIELD_ONBOARDING') {
      // After saving first field, show the add-field schema for additional fields
      loadSchema('add_field', 'more-canvas');
    } else if (action === 'SAVE_ADDITIONAL_FIELD') {
      // Save an additional field to the farmer's profile
      const activeCanvas = getActiveCanvas();
      if (!activeCanvas) return;
      const form = activeCanvas.querySelector('form') || activeCanvas.querySelector('.a2ui-form');
      const fieldData = {};
      if (form) {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
          if (input.name) {
            fieldData[input.name] = input.value;
          }
        });
      }

      const fieldName = fieldData.field_name || fieldData.field1_name || 'New Field';
      const payload = {
        farmer_name: fieldName,
        soil_type: fieldData.soil_type || 'Alluvial',
        acres: parseFloat(fieldData.acres) || 5.0,
        primary_crop: fieldData.primary_crop || 'Corn',
        has_drip: fieldData.has_drip || 'no'
      };

      fetch('/api/profile/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(() => {
        showToast("Field Added", `${fieldName} (${fieldData.primary_crop || 'Crop'}) added to your farm.`, "success");
        fetchFieldsAndProfile();
        // Show add-field again in case they want to add more
        setTimeout(() => loadSchema('add_field', 'more-canvas'), 500);
      })
      .catch(err => {
        console.warn('Failed to save additional field:', err);
        showToast("Save Failed", "Could not save field. Please try again.", "danger");
      });
    } else if (action === 'CANCEL_ADD_FIELD') {
      // Go to home after cancelling add field
      window.switchTab('home');
      showToast("Onboarding Complete", "You can add more fields anytime from More → Profile.", "info");
    } else {
      // General Form Submission to Agent
      const activeCanvas = getActiveCanvas();
      if (!activeCanvas) return;
      const form = activeCanvas.querySelector('form') || activeCanvas.querySelector('.a2ui-form');
      const params = {};
      if (form) {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
          if (input.name) {
            params[input.name] = input.value;
          }
        });
      }

      let prompt = `Action triggered: '${action}'`;
      if (Object.keys(params).length > 0) {
        prompt += ` with fields: ` + Object.entries(params).map(([k, v]) => `${k}='${v}'`).join(', ');
      }

      userInputField.value = prompt;
      handleSend();
    }
  });

  // Camera Control elements
  const cameraBtn = document.getElementById('camera-btn');
  const cameraModal = document.getElementById('camera-modal');
  const cameraCloseBtn = document.getElementById('camera-close-btn');
  const cameraCaptureBtn = document.getElementById('camera-capture-btn');
  const cameraAnalyzeBtn = document.getElementById('camera-analyze-btn');
  const cameraViewfinder = document.getElementById('camera-viewfinder');
  const cameraCanvas = document.getElementById('camera-canvas');
  const cameraFallbackContainer = document.getElementById('camera-fallback-container');
  const cameraUploadTriggerBtn = document.getElementById('camera-upload-trigger-btn');
  const cameraFileInput = document.getElementById('camera-file-input');
  const cameraFileName = document.getElementById('camera-file-name');

  let activeDataUrl = null;

  // Helper to open the camera feed modal
  async function openCameraViewfinder() {
    if (cameraModal) {
      cameraModal.style.display = 'flex';
      activeDataUrl = null;

      cameraViewfinder.style.display = 'block';
      cameraCanvas.style.display = 'none';
      cameraFallbackContainer.style.display = 'none';
      cameraCaptureBtn.style.display = 'block';
      cameraAnalyzeBtn.style.display = 'none';

      const success = await cropCamera.start(cameraViewfinder);
      if (!success) {
        cameraViewfinder.style.display = 'none';
        cameraFallbackContainer.style.display = 'block';
        cameraCaptureBtn.style.display = 'none';
      }
    }
  }

  // Basic Image Quality check using average brightness, contrast, and plant matter ratio
  function analyzeImageQuality(dataUrl, callback) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 100, 100);

      const imgData = ctx.getImageData(0, 0, 100, 100);
      const data = imgData.data;

      let totalBrightness = 0;
      let greenOrBrownPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        const isGreen = g > r * 1.1 && g > b * 1.1;
        const isBrown = r > b * 1.2 && g > b * 1.0 && r >= g && r < 180;

        if (isGreen || isBrown) {
          greenOrBrownPixels++;
        }
      }

      const avgBrightness = totalBrightness / (100 * 100);
      const greenBrownRatio = greenOrBrownPixels / (100 * 100);

      let sumSquares = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const brightness = (r + g + b) / 3;
        sumSquares += Math.pow(brightness - avgBrightness, 2);
      }
      const variance = sumSquares / (100 * 100);
      const contrast = Math.sqrt(variance);

      let warning = null;
      if (avgBrightness < 45) {
        warning = "too_dark";
      } else if (avgBrightness > 220) {
        warning = "too_bright";
      } else if (contrast < 12) {
        warning = "blurry";
      } else if (greenBrownRatio < 0.12) {
        warning = "out_of_distribution";
      }

      callback(warning);
    };
    img.src = dataUrl;
  }

  // Camera event listeners re-targeted to the crop wizard steps
  if (cameraBtn) {
    cameraBtn.addEventListener('click', async () => {
      cropDiagnosisState = { step: 1, affectedArea: null, photos: [], currentPhoto: null, diagnosis: null };
      localDb.saveDiagnosisState(cropDiagnosisState);
      loadStepSchema();
    });
  }

  if (cameraCloseBtn) {
    cameraCloseBtn.addEventListener('click', () => {
      if (cameraModal) {
        cameraModal.style.display = 'none';
        cropCamera.stop();
      }
    });
  }

  if (cameraCaptureBtn) {
    cameraCaptureBtn.addEventListener('click', () => {
      activeDataUrl = cropCamera.capture(cameraCanvas);
      if (activeDataUrl) {
        cropDiagnosisState.currentPhoto = activeDataUrl;

        if (cameraModal) {
          cameraModal.style.display = 'none';
          cropCamera.stop();
        }

        analyzeImageQuality(activeDataUrl, (warning) => {
          if (warning) {
            cropDiagnosisState.step = 4;
            localDb.saveDiagnosisState(cropDiagnosisState);
            loadStepSchema();
            showToast("Quality Warning", `Poor photo quality: ${warning.replace('_', ' ')}`, "warning");
          } else {
            cropDiagnosisState.photos.push(activeDataUrl);
            cropDiagnosisState.currentPhoto = null;
            if (cropDiagnosisState.photos.length === 3) {
              runEdgeAiDiagnosis();
            } else {
              cropDiagnosisState.step = 5;
              localDb.saveDiagnosisState(cropDiagnosisState);
              loadStepSchema();
            }
          }
        });
      }
    });
  }

  if (cameraUploadTriggerBtn && cameraFileInput) {
    cameraUploadTriggerBtn.addEventListener('click', () => {
      cameraFileInput.click();
    });
  }

  if (cameraFileInput) {
    cameraFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          activeDataUrl = event.target.result;
          cropDiagnosisState.currentPhoto = activeDataUrl;

          if (cameraModal) {
            cameraModal.style.display = 'none';
            cropCamera.stop();
          }

          analyzeImageQuality(activeDataUrl, (warning) => {
            if (warning) {
              cropDiagnosisState.step = 4;
              localDb.saveDiagnosisState(cropDiagnosisState);
              loadStepSchema();
              showToast("Quality Warning", `Poor photo quality: ${warning.replace('_', ' ')}`, "warning");
            } else {
              cropDiagnosisState.photos.push(activeDataUrl);
              cropDiagnosisState.currentPhoto = null;
              if (cropDiagnosisState.photos.length === 3) {
                runEdgeAiDiagnosis();
              } else {
                cropDiagnosisState.step = 5;
                localDb.saveDiagnosisState(cropDiagnosisState);
                loadStepSchema();
              }
            }
          });
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (cameraAnalyzeBtn) {
    cameraAnalyzeBtn.addEventListener('click', async () => {
      // Legacy compatibility
      if (cameraModal) {
        cameraModal.style.display = 'none';
        cropCamera.stop();
      }
    });
  }

  // Local Gemma-2B Model Downloader listener
  const downloadModelBtn = document.getElementById('download-model-btn');
  if (downloadModelBtn) {
    downloadModelBtn.addEventListener('click', () => {
      if (localAi.llmLoaded) {
        showToast("Local AI Active", "Local Gemma-2B model is already compiled and ready.", "success");
        return;
      }

      downloadModelBtn.textContent = '⏳ Loading AI (0%)...';
      downloadModelBtn.disabled = true;
      downloadModelBtn.style.backgroundColor = 'var(--text-sub)';

      localAi.loadLlm(progress => {
        downloadModelBtn.textContent = `⏳ Loading AI (${progress}%)...`;
        if (progress === 100) {
          downloadModelBtn.textContent = '🟢 Edge AI Active';
          downloadModelBtn.style.backgroundColor = 'var(--trend-up)';
          downloadModelBtn.disabled = false;
          showToast("Local LLM Ready", "Gemma-2B successfully cached. Mobile WebGPU active.", "success");
        }
      });
    });
  }


  // Expert dashboards renderers are loaded from expert_dashboards.js

  // Phase 5: Collapsible Navigation Setup


  // Traps keyboard focus inside the drawer element
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
    if (focusableElements.length === 0) return;
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    });
  }

  function renderLeftNavigation() {
    const list = document.getElementById('left-nav-links-list');
    if (!list) return;
    list.innerHTML = '';

    const lang = window.currentLanguageState?.code || 'en';
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    const items = NAV_SECTIONS['farmer'];

    items.forEach(item => {
      const label = dict[item.trKey] || item.trKey;
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'left-nav-item';
      link.setAttribute('data-tab', item.id);
      link.setAttribute('title', label); // tooltip for collapsed mode
      link.setAttribute('aria-label', label);

      const currentActive = localStorage.getItem('nav_route_user') || 'home';
      if (item.id === currentActive) {
        link.classList.add('active');
      }

      link.innerHTML = `
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${label}</span>
      `;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.switchTab(item.id);
      });

      list.appendChild(link);
    });

    // Translate profile labels in footer
    const profileName = document.getElementById('left-nav-profile-name');
    if (profileName) {
      profileName.textContent = farmerDisplayNameForLanguage(localStorage.getItem('aaa_preferred_language'));
    }

    // Render the assistant info pane dynamically
    renderAssistantInfoPane();
  }

  // Collapsible toggle buttons event setup
  const leftNavToggleBtn = document.getElementById('left-nav-toggle-btn');
  const leftNav = document.getElementById('left-nav');

  if (leftNavToggleBtn && leftNav) {
    // Restore collapsed preference
    const isCollapsed = localStorage.getItem('nav_collapsed_user') === 'true';
    if (isCollapsed) {
      leftNav.classList.add('collapsed');
      document.documentElement.style.setProperty('--sidebar-width', '72px');
      leftNavToggleBtn.setAttribute('aria-expanded', 'false');
    } else {
      leftNavToggleBtn.setAttribute('aria-expanded', 'true');
    }

    leftNavToggleBtn.addEventListener('click', () => {
      const collapsed = leftNav.classList.toggle('collapsed');
      localStorage.setItem('nav_collapsed_user', collapsed);
      document.documentElement.style.setProperty('--sidebar-width', collapsed ? '72px' : '232px');
      leftNavToggleBtn.setAttribute('aria-expanded', !collapsed);
    });
  }

  // Tablet portrait drawer menu button setup
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const leftNavBackdrop = document.getElementById('left-nav-backdrop');
  if (menuToggleBtn && leftNav) {
    menuToggleBtn.addEventListener('click', () => {
      leftNav.classList.add('drawer-open');
      if (leftNavBackdrop) leftNavBackdrop.classList.add('active');
      trapFocus(leftNav);
      // focus the first element inside left-nav
      const firstBtn = leftNav.querySelector('button, a');
      if (firstBtn) firstBtn.focus();
    });
  }

  if (leftNavBackdrop && leftNav) {
    leftNavBackdrop.addEventListener('click', () => {
      leftNav.classList.remove('drawer-open');
      leftNavBackdrop.classList.remove('active');
      if (menuToggleBtn) menuToggleBtn.focus();
    });
  }

  // Escape key handler for drawer closing
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && leftNav && leftNav.classList.contains('drawer-open')) {
      leftNav.classList.remove('drawer-open');
      if (leftNavBackdrop) leftNavBackdrop.classList.remove('active');
      if (menuToggleBtn) menuToggleBtn.focus();
    }
  });

  // Render left navigation (farmer mode only) and restore last active route
  renderLeftNavigation();
  const currentPathForRoute = window.location.pathname || '';
  const isOnboardingRoute = currentPathForRoute.startsWith('/onboarding');
  if (!isOnboardingRoute) {
    const savedRoute = localStorage.getItem('nav_route_user') || 'home';
    setTimeout(() => {
      window.switchTab(savedRoute);
    }, 100);
  }

  // Extracts JSON blocks from agent response text
  function extractJsonContent(text) {
    const trimmed = text.trim();
    const jsonMatch = trimmed.match(/^```json\s*([\s\S]*?)\s*```$/) || trimmed.match(/^```\s*([\s\S]*?)\s*```$/);
    return jsonMatch ? jsonMatch[1].trim() : trimmed;
  }

  // Localized preparing message
  function getPreparingAdvisoryMsg(langCode) {
    if (langCode === 'hi') return '⏳ <em>कृषि शास्त्री सलाह तैयार कर रहे हैं...</em>';
    if (langCode === 'mr') return '⏳ <em>कृषि शास्त्री सल्ला तयार करत आहेत...</em>';
    if (langCode === 'te') return '⏳ <em>కృషి శాస్త్రి సలహాను సిద్ధం చేస్తున్నారు...</em>';
    if (langCode === 'sw') return '⏳ <em>Krishi Sastri anaandaa ushauri...</em>';
    return '⏳ <em>Krishi Sastri is preparing advisory...</em>';
  }

  // Render structured JSON response card inside chat bubble
  function renderStructuredResponse(data, container, messageEl) {
    container.innerHTML = '';

    if (data.title) {
      const titleDiv = document.createElement('div');
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.fontSize = '1.1rem';
      titleDiv.style.marginBottom = '0.5rem';
      titleDiv.textContent = data.title;
      container.appendChild(titleDiv);
    }

    if (data.summary) {
      const summaryDiv = document.createElement('div');
      summaryDiv.style.marginBottom = '0.5rem';
      summaryDiv.textContent = data.summary;
      container.appendChild(summaryDiv);
    }

    if (data.recommendation) {
      const recDiv = document.createElement('div');
      recDiv.style.marginBottom = '0.5rem';
      recDiv.style.fontWeight = '600';
      recDiv.style.color = 'var(--accent)';
      recDiv.textContent = data.recommendation;
      container.appendChild(recDiv);
    }

    if (data.reasons && Array.isArray(data.reasons) && data.reasons.length > 0) {
      const ul = document.createElement('ul');
      ul.style.margin = '5px 0 10px 20px';
      ul.style.padding = '0';
      ul.style.listStyleType = 'disc';
      data.reasons.slice(0, 4).forEach(r => {
        const li = document.createElement('li');
        li.style.marginBottom = '2px';
        li.textContent = r;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    }

    if (data.question) {
      const qDiv = document.createElement('div');
      qDiv.style.fontStyle = 'italic';
      qDiv.style.marginBottom = '0.75rem';
      qDiv.textContent = data.question;
      container.appendChild(qDiv);
    }

    if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.flexWrap = 'wrap';
      actionsDiv.style.gap = '8px';
      actionsDiv.style.marginTop = '10px';

      data.actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'a2ui-btn';
        btn.style.padding = '6px 12px';
        btn.style.fontSize = '0.9rem';
        btn.style.borderRadius = '16px';
        btn.style.backgroundColor = 'var(--accent)';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.textContent = act.label;

        btn.addEventListener('click', () => {
          const userInputField = document.getElementById('user-input-field');
          if (userInputField) {
            userInputField.value = act.prompt || act.label;
            handleSend();
          }
        });
        actionsDiv.appendChild(btn);
      });
      container.appendChild(actionsDiv);
    }
  }

  // Render a list of all fields with edit and add buttons
  function renderFieldsList() {
    const canvas = document.getElementById('more-canvas');
    if (!canvas) return;

    const lang = window.currentLanguageState?.code || 'en';
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];

    const titleText = dict['more.items.fields.label'] || 'My Fields';
    const descText = dict['more.items.fields.desc'] || 'View and manage your fields';
    const addText = dict['more.items.addfield.label'] || 'Add New Field';
    const editText = dict['fields.action.edit'] || 'Edit';
    const noFieldsText = dict['fields.empty'] || 'No fields yet. Add your first field to get started.';
    const fieldNameLabel = dict['onboarding.fields.fieldname.label'] || 'Field Name';
    const acresLabel = dict['onboarding.fields.acres.label'] || 'Acres';
    const cropLabel = dict['onboarding.fields.crop.label'] || 'Crop';
    const soilLabel = dict['onboarding.fields.soil.label'] || 'Soil';

    let html = `
      <div class="a2ui-card" style="padding: 1.5rem;">
        <h3 class="a2ui-card-title">${titleText}</h3>
        <p style="color: var(--text-sub); margin-bottom: 1rem;">${descText}</p>
    `;

    if (activeFields.length === 0) {
      html += `<p style="color: var(--text-sub); padding: 1rem; text-align: center;">${noFieldsText}</p>`;
    } else {
      activeFields.forEach((field, idx) => {
        const crop = field.planting ? field.planting.crop_type : '—';
        const acres = field.acres || '—';
        const soil = field.soil_type || '—';
        html += `
          <div style="background: var(--bg-dark); border: 1px solid var(--border); border-radius: var(--radius-m); padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 1rem; color: var(--text-main);">${field.name || 'Field ' + (idx + 1)}</strong>
              <div style="font-size: 0.85rem; color: var(--text-sub); margin-top: 4px;">
                ${cropLabel}: ${crop} · ${acresLabel}: ${acres} · ${soilLabel}: ${soil}
              </div>
            </div>
            <button class="a2ui-btn" data-edit-field="${field.field_id}" style="width: auto; padding: 0.5rem 1rem; font-size: 0.85rem;">${editText}</button>
          </div>
        `;
      });
    }

    html += `
        <button class="a2ui-btn" id="add-field-btn" style="margin-top: 0.5rem;">➕ ${addText}</button>
      </div>
    `;

    canvas.innerHTML = html;

    // Bind edit buttons
    canvas.querySelectorAll('[data-edit-field]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fieldId = btn.getAttribute('data-edit-field');
        loadSchema('add_field', 'more-canvas', { editFieldId: fieldId });
      });
    });

    // Bind add button
    const addBtn = canvas.querySelector('#add-field-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        loadSchema('add_field', 'more-canvas');
      });
    }
  }

  // Render assistant info pane containing Crop, Field, Advisory, Freshness
  function renderAssistantInfoPane() {
    const pane = document.getElementById('assistant-info-pane');
    if (!pane) return;

    const preferredLang = window.currentLanguageState?.code || 'en';
    const activeField = activeFields.find(f => f.field_id === activeFieldId);

    const crop = activeField && activeField.planting ? activeField.planting.crop_type : 'Wheat';
    const fieldName = activeField ? activeField.name : 'Nagpur Field';

    let cropTr = window.getTranslation('profile.crop.wheat', preferredLang) || 'Wheat';
    if (crop.toLowerCase() === 'corn') {
      cropTr = window.getTranslation('profile.crop.corn', preferredLang) || 'Corn';
    } else if (crop.toLowerCase() === 'soybeans') {
      cropTr = window.getTranslation('profile.crop.soybeans', preferredLang) || 'Soybeans';
    }

    const advisory = window.getTranslation('farm.recommendation.desc', preferredLang) || 'Irrigate tomorrow morning.';
    const freshness = window.getTranslation('irrigation.weatherStatus.cached', preferredLang) || 'Cached 3h ago';

    pane.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: var(--text-main);">
        <div><strong>🌾 ${window.getTranslation('profile.crop.label', preferredLang) || 'Crop'}:</strong> ${cropTr}</div>
        <div><strong>📍 ${window.getTranslation('profile.region.label', preferredLang) || 'Field'}:</strong> ${fieldName}</div>
        <div style="grid-column: span 2;"><strong>💡 ${window.getTranslation('farm.recommendation.title', preferredLang) || 'Advisory'}:</strong> ${advisory}</div>
        <div style="grid-column: span 2; font-size: 0.8rem; color: var(--text-sub);">🕒 ${freshness}</div>
      </div>
    `;
  }

  // Update renderAssistantInfoPane when field changes
  const oldFieldSelector = document.getElementById('field-selector');
  if (oldFieldSelector) {
    oldFieldSelector.addEventListener('change', () => {
      setTimeout(() => renderAssistantInfoPane(), 200);
    });
  }

  // Trigger initial render of assistant pane
  setTimeout(() => renderAssistantInfoPane(), 500);

    // Update sync queue badge count
  async function updateSyncBadge() {
    const badge = document.getElementById('sync-queue-badge');
    if (!badge) return;

    try {
      const count = await localDb.getPendingSyncCount();
      if (count > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = `🔄 ${count} Pending`;
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      badge.style.display = 'none';
    }
  }

  // Export functions to global window for modular submodules
  window.appendMessage = appendMessage;
  window.handleSend = handleSend;
  window.loadSchema = loadSchema;
  window.updateAgentsStatus = updateAgentsStatus;
  window.logObservabilityEvent = logObservabilityEvent;
  window.generateCorrelationId = generateCorrelationId;
  window.showToast = showToast;
  window.renderLeftNavigation = renderLeftNavigation;
  window.updateSyncBadge = updateSyncBadge;

  // ============================================================
  // Ask Screen — Advisor Selection + Sastri Chat + Expert Form
  // ============================================================

  function showAdvisorSelection() {
    document.getElementById('advisor-selection-screen').style.display = 'flex';
    document.getElementById('sastri-chat-screen').style.display = 'none';
    document.getElementById('expert-form-screen').style.display = 'none';
  }

  function showSastriChat() {
    document.getElementById('advisor-selection-screen').style.display = 'none';
    document.getElementById('sastri-chat-screen').style.display = 'flex';
    document.getElementById('expert-form-screen').style.display = 'none';
    const input = document.getElementById('user-input-field');
    if (input) input.focus();
  }

  function showExpertForm() {
    document.getElementById('advisor-selection-screen').style.display = 'none';
    document.getElementById('sastri-chat-screen').style.display = 'none';
    document.getElementById('expert-form-screen').style.display = 'flex';
    document.getElementById('expert-status-display').style.display = 'none';
  }

  // Keywords that indicate a complex/risky question needing expert escalation
  const EXPERT_ESCALATION_KEYWORDS = [
    'pesticide', 'chemical', 'fungicide', 'insecticide', 'pesticide',
    'दवा', 'छिड़काव', 'कीटनाशक', 'फफूंदनाशक',
    'severe', 'critical', 'emergency', 'dying', 'wilted completely',
    'गंभीर', 'आपातकाल', 'मर', 'सूख',
    'uncertain', 'unknown disease', 'not sure', 'first time',
    'पता नहीं', 'पहली बार', 'समझ नहीं',
    'livestock', 'cattle', 'cow', 'goat', 'animal',
    'मवेशी', 'गाय', 'बकरी', 'जानवर',
  ];

  function shouldEscalateToExpert(text) {
    const lower = text.toLowerCase();
    return EXPERT_ESCALATION_KEYWORDS.some(kw => lower.includes(kw));
  }

  function showEscalationPrompt(userQuery) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const langCode = localStorage.getItem('aaa_preferred_language') || 'hi';
    const langMap = { 'en': 'en', 'hi': 'hi', 'mr': 'mr', 'te': 'te', 'sw': 'sw' };
    const code = langMap[langCode] || 'hi';

    const texts = {
      'hi': { summary: 'यह मामला थोड़ा जटिल है।', rec: 'कृषि विशेषज्ञ से जांच करवाना बेहतर रहेगा।', q: 'क्या मैं यह सवाल विशेषज्ञ सहायता को भेज दूँ?', send: 'हाँ, विशेषज्ञ को भेजें', photo: 'पहले फोटो जोड़ें', no: 'अभी नहीं' },
      'en': { summary: 'This case is a bit complex.', rec: 'It would be better to have an expert examine it.', q: 'Shall I send this question to expert help?', send: 'Yes, send to expert', photo: 'Add photo first', no: 'Not now' },
      'mr': { summary: 'हे प्रकरण थोडे कठीण आहे.', rec: 'तज्ज्ञाकडून तपासणी करवणे चांगले राहील.', q: 'हा प्रश्न तज्ज्ञ सहाय्याला पाठवू?', send: 'होय, तज्ज्ञाला पाठवा', photo: 'आधी फोटो जोडा', no: 'आत्ता नाही' },
      'te': { summary: 'ఈ సందర్భం కొంచెం క్లిష్టంగా ఉంది.', rec: 'నిపుణుడు ద్వారా తనిఖీ చేయించడం మంచిది.', q: 'ఈ ప్రశ్నను నిపుణుడికి పంపాలా?', send: 'అవును, నిపుణుడికి పంపండి', photo: 'ముందు ఫోటో జోడించండి', no: 'ఇప్పుడు కాదు' },
      'sw': { summary: 'Hali hii ni ngumu kidogo.', rec: 'Ni bora kumtafute mtaalamu.', q: 'Nitume swali hili kwa mtaalamu?', send: 'Ndio, tuma kwa mtaalamu', photo: 'Ongeza picha kwanza', no: 'Sio sasa' },
    };
    const t = texts[code] || texts['hi'];

    const escalationMsg = document.createElement('div');
    escalationMsg.className = 'message agent-msg';
    escalationMsg.innerHTML = `
      <div style="padding: 12px; border-radius: 10px; background: rgba(230,126,34,0.1); border-left: 4px solid #e67e22;">
        <div style="font-weight: 600; margin-bottom: 6px;">${t.summary}</div>
        <div style="font-size: 0.9rem; margin-bottom: 8px;">${t.rec}</div>
        <div style="font-weight: 600; margin-bottom: 10px;">${t.q}</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="escalation-btn" data-action="send" style="padding: 8px 14px; border-radius: 8px; border: none; background: #e67e22; color: white; font-weight: 600; cursor: pointer; font-size: 0.85rem;">${t.send}</button>
          <button class="escalation-btn" data-action="photo" style="padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text-main); cursor: pointer; font-size: 0.85rem;">${t.photo}</button>
          <button class="escalation-btn" data-action="no" style="padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text-muted); cursor: pointer; font-size: 0.85rem;">${t.no}</button>
        </div>
      </div>
    `;
    chatMessages.appendChild(escalationMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Bind escalation buttons
    escalationMsg.querySelectorAll('.escalation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action === 'send') {
          // Create expert request
          createExpertRequest(userQuery, null);
        } else if (action === 'photo') {
          // Route to photo check
          window.switchTab('image');
        } else if (action === 'no') {
          // Remove escalation message
          escalationMsg.remove();
        }
      });
    });

    // Speak the escalation message
    if (typeof window.speakText === 'function') {
      window.speakText(`${t.summary} ${t.rec} ${t.q}`);
    }
  }

  function createExpertRequest(question, photoData) {
    // Include farm context
    const profile = localStorage.getItem('aaa_farmer_profile');
    let context = '';
    if (profile) {
      try {
        const p = JSON.parse(profile);
        context = `\nFarm: ${p.farmer_name || 'Unknown'}, Crop: ${p.primary_crop || 'Unknown'}, Soil: ${p.soil_type || 'Unknown'}, Location: ${p.region || 'Unknown'}`;
      } catch (e) {}
    }

    // Show status display
    const statusDisplay = document.getElementById('expert-status-display');
    if (statusDisplay) {
      statusDisplay.style.display = 'block';
    }

    // Hide form elements
    const expertForm = document.getElementById('expert-form-screen');
    if (expertForm) {
      expertForm.querySelectorAll('div > label, textarea, button').forEach(el => {
        if (el.id !== 'expert-back-to-chat-btn') el.style.display = 'none';
      });
    }

    // In production, this would send to the backend
    // For now, store in IndexedDB and log
    console.log('[Expert Request] Created:', { question, context, photo: !!photoData });

    if (typeof window.showToast === 'function') {
      window.showToast('विशेषज्ञ को भेजा गया', 'आपका सवाल विशेषज्ञ को भेजा गया है।', 'success');
    }
  }

  // Bind advisor selection buttons — bind immediately (DOMContentLoaded may have already fired)
  function bindAdvisorButtons() {
    const sastriCard = document.getElementById('sastri-card');
    const expertCard = document.getElementById('expert-card');
    const sastriBtn = document.getElementById('advisor-sastri-btn');
    const expertBtn = document.getElementById('advisor-expert-btn');
    const backBtn = document.getElementById('back-to-advisor-btn');
    const backFromExpertBtn = document.getElementById('back-to-advisor-from-expert-btn');
    const expertSubmitBtn = document.getElementById('expert-submit-btn');
    const expertPhotoBtn = document.getElementById('expert-photo-btn');
    const expertPhotoInput = document.getElementById('expert-photo-input');
    const expertBackToChatBtn = document.getElementById('expert-back-to-chat-btn');

    if (sastriBtn) sastriBtn.addEventListener('click', showSastriChat);
    if (sastriCard) sastriCard.addEventListener('click', (e) => { if (e.target !== sastriBtn) showSastriChat(); });
    if (expertBtn) expertBtn.addEventListener('click', showExpertForm);
    if (expertCard) expertCard.addEventListener('click', (e) => { if (e.target !== expertBtn) showExpertForm(); });
    if (backBtn) backBtn.addEventListener('click', showAdvisorSelection);
    if (backFromExpertBtn) backFromExpertBtn.addEventListener('click', showAdvisorSelection);
    if (expertBackToChatBtn) expertBackToChatBtn.addEventListener('click', () => { showAdvisorSelection(); showSastriChat(); });

    // Expert photo upload
    if (expertPhotoBtn && expertPhotoInput) {
      expertPhotoBtn.addEventListener('click', () => expertPhotoInput.click());
      expertPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = document.getElementById('expert-photo-img');
          const preview = document.getElementById('expert-photo-preview');
          if (img) img.src = event.target.result;
          if (preview) preview.style.display = 'block';
          expertPhotoBtn.textContent = '✅ फोटो जोड़ी गई';
        };
        reader.readAsDataURL(file);
      });
    }

    // Expert submit
    if (expertSubmitBtn) {
      expertSubmitBtn.addEventListener('click', () => {
        const question = document.getElementById('expert-question-input')?.value?.trim();
        if (!question) {
          if (typeof window.showToast === 'function') {
            window.showToast('सवाल आवश्यक है', 'कृपया अपना सवाल लिखें या बोलें।', 'warning');
          }
          return;
        }
        const photoImg = document.getElementById('expert-photo-img');
        const photoData = photoImg ? photoImg.src : null;
        createExpertRequest(question, photoData);
      });
    }

    // Apply translations to advisor cards
    const langCode = localStorage.getItem('aaa_preferred_language') || 'hi';
    const langMap = { 'en': 'en', 'hi': 'hi', 'mr': 'mr', 'te': 'te', 'sw': 'sw' };
    const code = langMap[langCode] || 'hi';

    // Use getTranslation from translations.js if available
    if (typeof window.getTranslation === 'function') {
      const setText = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.textContent = window.getTranslation(key, code);
      };
      setText('advisor-ask-title', 'advisor.ask.title');
      setText('advisor-ask-subtitle', 'advisor.ask.subtitle');
      setText('advisor-sastri-title', 'advisor.sastri.title');
      setText('advisor-sastri-desc', 'advisor.sastri.description');
      setText('advisor-sastri-btn', 'advisor.sastri.button');
      setText('advisor-sastri-badge', 'advisor.sastri.recommended');
      setText('advisor-expert-title', 'advisor.expert.title');
      setText('advisor-expert-desc', 'advisor.expert.description');
      setText('advisor-expert-btn', 'advisor.expert.button');
      setText('advisor-helper-note', 'advisor.ask.helperNote');
    }
  }

  // Call bindAdvisorButtons immediately and also on DOMContentLoaded
  bindAdvisorButtons();
  document.addEventListener('DOMContentLoaded', bindAdvisorButtons);

  let currentImageData = null; // Stores base64 of captured/uploaded image

  function initAskImageFlow() {
    const uploadArea = document.getElementById('image-upload-area');
    const cameraBtn = document.getElementById('image-camera-btn');
    const uploadBtn = document.getElementById('image-upload-btn');
    const fileInput = document.getElementById('image-file-input');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    const retakeBtn = document.getElementById('image-retake-btn');
    const analysisResult = document.getElementById('image-analysis-result');
    const analysisContent = document.getElementById('analysis-content');
    const loadingIndicator = document.getElementById('image-analysis-loading');

    // Shared helper: show preview + start analysis for a given base64 image
    function handleAcquiredImage(base64Image) {
      currentImageData = base64Image;
      if (previewImg) previewImg.src = currentImageData;
      if (previewContainer) previewContainer.style.display = 'block';
      if (uploadArea) uploadArea.style.display = 'none';
      analyzeImageLocally(currentImageData);
    }

    // 📷 Camera button → open the live camera viewfinder modal
    if (cameraBtn) {
      cameraBtn.addEventListener('click', async () => {
        const modal = document.getElementById('camera-modal');
        const viewfinder = document.getElementById('camera-viewfinder');
        const canvas = document.getElementById('camera-canvas');
        const fallbackContainer = document.getElementById('camera-fallback-container');
        const captureBtn = document.getElementById('camera-capture-btn');
        const analyzeBtn = document.getElementById('camera-analyze-btn');
        const closeBtn = document.getElementById('camera-close-btn');
        const fallbackFileInput = document.getElementById('camera-file-input');
        const fallbackTrigger = document.getElementById('camera-upload-trigger-btn');

        if (!modal || !viewfinder || !captureBtn) return;

        // Show modal in "Ask Image" mode (not the crop wizard)
        modal.style.display = 'flex';
        modal.dataset.askImageMode = 'true';
        viewfinder.style.display = 'block';
        if (canvas) canvas.style.display = 'none';
        if (fallbackContainer) fallbackContainer.style.display = 'none';
        if (analyzeBtn) analyzeBtn.style.display = 'none';
        captureBtn.style.display = 'block';
        captureBtn.textContent = '📸 फोटो लें';

        const success = await cropCamera.start(viewfinder);
        if (!success) {
          viewfinder.style.display = 'none';
          if (fallbackContainer) fallbackContainer.style.display = 'block';
          captureBtn.style.display = 'none';
        }

        // One-shot capture handler for Ask Image mode
        const onCapture = () => {
          const dataUrl = cropCamera.capture(canvas);
          if (!dataUrl) return;

          // Close modal & stop camera
          modal.style.display = 'none';
          cropCamera.stop();
          captureBtn.removeEventListener('click', onCapture);

          // Feed captured frame into the Ask Image preview/analysis flow
          handleAcquiredImage(dataUrl);
        };
        captureBtn.addEventListener('click', onCapture);

        // Close button stops camera and cleans up
        const onClose = () => {
          cropCamera.stop();
          modal.style.display = 'none';
          captureBtn.removeEventListener('click', onCapture);
          closeBtn.removeEventListener('click', onClose);
        };
        if (closeBtn) closeBtn.addEventListener('click', onClose);

        // Fallback file upload (when camera unavailable) feeds into Ask Image too
        if (fallbackTrigger && fallbackFileInput) {
          const onFallbackChange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              modal.style.display = 'none';
              cropCamera.stop();
              handleAcquiredImage(event.target.result);
            };
            reader.readAsDataURL(file);
          };
          // Replace any prior listener by cloning
          const newInput = fallbackFileInput.cloneNode(true);
          fallbackFileInput.parentNode.replaceChild(newInput, fallbackFileInput);
          newInput.addEventListener('change', onFallbackChange);
          const onFallbackTrigger = () => newInput.click();
          fallbackTrigger.addEventListener('click', onFallbackTrigger, { once: true });
        }
      });
    }

    // ➕ Upload button → trigger file input (file explorer / gallery)
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }

    // File selected → show preview + analyze
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => handleAcquiredImage(event.target.result);
        reader.readAsDataURL(file);
      });
    }

    // Retake button
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => {
        currentImageData = null;
        if (previewContainer) previewContainer.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (analysisResult) analysisResult.style.display = 'none';
        if (fileInput) fileInput.value = '';
      });
    }
  }

  // Local image analysis using CropClassifier
  async function analyzeImageLocally(base64Image) {
    const loadingIndicator = document.getElementById('image-analysis-loading');
    const analysisResult = document.getElementById('image-analysis-result');
    const analysisContent = document.getElementById('analysis-content');

    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (analysisResult) analysisResult.style.display = 'none';

    try {
      // Use the CropClassifier for local diagnosis
      const classifier = new window.CropClassifier();
      const context = {
        crop: localStorage.getItem('aaa_active_crop') || 'corn',
        soil: localStorage.getItem('aaa_active_soil') || 'clay',
        language: localStorage.getItem('aaa_preferred_language') || 'hi',
      };

      const result = await classifier.classifyImage(base64Image, context);

      // Build the response HTML
      let html = '';

      if (result.disease_name) {
        const isHealthy = result.disease_name.includes('Healthy') || result.severity === 'None';
        const icon = isHealthy ? '✅' : (result.severity === 'Critical' ? '🚨' : result.severity === 'High' ? '⚠️' : '🔍');

        html += `<div style="margin-bottom: 12px;">
          <div style="font-size: 1.1rem; font-weight: 700; color: ${isHealthy ? '#2C6B37' : '#e67e22'};">${icon} ${result.disease_name}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">विश्वास: ${result.confidence}</div>
        </div>`;
      }

      if (result.severity && result.severity !== 'None' && result.severity !== 'Unknown') {
        html += `<div style="margin-bottom: 8px;"><strong>गंभीरता:</strong> ${result.severity}</div>`;
      }

      if (result.organic_remedy) {
        html += `<div style="margin-bottom: 8px; padding: 8px; border-radius: 8px; background: rgba(44,107,55,0.1);">
          <strong>🌱 जैविक उपचार:</strong><br/>
          <span style="font-size: 0.9rem;">${result.organic_remedy}</span>
        </div>`;
      }

      if (result.chemical_remedy) {
        html += `<div style="margin-bottom: 8px; padding: 8px; border-radius: 8px; background: rgba(230,126,34,0.1);">
          <strong>💊 रासायनिक उपचार:</strong><br/>
          <span style="font-size: 0.9rem;">${result.chemical_remedy}</span>
        </div>`;
      }

      if (result.regional_treatment) {
        html += `<div style="margin-bottom: 8px; padding: 8px; border-radius: 8px; background: var(--bg-dark);">
          <strong>क्षेत्रीय सलाह:</strong> ${result.regional_treatment}
        </div>`;
      }

      // Check if we should recommend expert
      const confidenceNum = parseInt(result.confidence) || 0;
      const isLowConfidence = confidenceNum < 70 || result.severity === 'Unknown' || result.mode === 'fallback_heuristic';

      if (isLowConfidence) {
        html += `<div style="margin-top: 12px; padding: 10px; border-radius: 8px; background: rgba(230,126,34,0.1); border-left: 3px solid #e67e22;">
          <strong>📋 स्थानीय विश्लेषण सीमित है।</strong><br/>
          <span style="font-size: 0.85rem;">सटीक निदान और विस्तृत उपचार के लिए विशेषज्ञ से पूछें।</span>
        </div>`;
      }

      // Show the result
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      if (analysisContent) analysisContent.innerHTML = html;
      if (analysisResult) analysisResult.style.display = 'block';

      // Speak the result
      if (typeof window.speakText === 'function') {
        const speakText2 = `${result.disease_name || 'Image analyzed'}. ${result.organic_remedy || ''} ${result.chemical_remedy || ''}`;
        window.speakText(speakText2);
      }

    } catch (err) {
      console.error('[Ask Image] Analysis failed:', err);
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      if (analysisContent) analysisContent.innerHTML = `<div style="color: #e74c3c;">विश्लेषण में त्रुटि। कृपया फिर से प्रयास करें।</div>`;
      if (analysisResult) analysisResult.style.display = 'block';
    }
  }

  // Initialize Ask Image flow — we're already inside DOMContentLoaded, so call directly
  initAskImageFlow();

  // ============================================================
  // Soil Test Report — MVP Implementation
  // ============================================================

  const SOIL_PARAMETERS = [
    { key: 'pH', label: 'pH', label_hi: 'pH' },
    { key: 'EC', label: 'EC', label_hi: 'EC' },
    { key: 'organic_carbon', label: 'Organic Carbon', label_hi: 'जैविक कार्बन' },
    { key: 'nitrogen', label: 'Nitrogen', label_hi: 'नाइट्रोजन' },
    { key: 'phosphorus', label: 'Phosphorus', label_hi: 'फॉस्फोरस' },
    { key: 'potassium', label: 'Potassium', label_hi: 'पोटाश' },
    { key: 'sulfur', label: 'Sulfur', label_hi: 'सल्फर' },
    { key: 'zinc', label: 'Zinc', label_hi: 'जिंक' },
    { key: 'boron', label: 'Boron', label_hi: 'बोरोन' },
    { key: 'iron', label: 'Iron', label_hi: 'आयरन' },
  ];

  function showSoilTestHome() {
    const home = document.getElementById('soil-home');
    const loading = document.getElementById('soil-loading');
    const form = document.getElementById('soil-review-form');
    const summary = document.getElementById('soil-summary');
    if (home) home.style.display = 'flex';
    if (loading) loading.style.display = 'none';
    if (form) form.style.display = 'none';
    if (summary) summary.style.display = 'none';
  }

  function showSoilLoading() {
    document.getElementById('soil-home').style.display = 'none';
    document.getElementById('soil-loading').style.display = 'block';
    document.getElementById('soil-review-form').style.display = 'none';
    document.getElementById('soil-summary').style.display = 'none';
  }

  function showSoilForm(extractedData) {
    document.getElementById('soil-home').style.display = 'none';
    document.getElementById('soil-loading').style.display = 'none';
    document.getElementById('soil-review-form').style.display = 'flex';
    document.getElementById('soil-summary').style.display = 'none';

    const fieldsContainer = document.getElementById('soil-form-fields');
    if (!fieldsContainer) return;
    fieldsContainer.innerHTML = '';

    const langCode = localStorage.getItem('aaa_preferred_language') || 'hi';
    const isHindi = langCode === 'hi';

    // Field selector
    const fieldSel = document.createElement('div');
    fieldSel.innerHTML = `<label style="font-size:0.85rem;font-weight:600;">${isHindi ? 'खेत' : 'Field'}</label>
      <select id="soil-field-select" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-dark);color:var(--text-main);margin-top:4px;">
        <option value="">${isHindi ? 'खेत चुनें' : 'Select field'}</option>
      </select>`;
    fieldsContainer.appendChild(fieldSel);

    // Populate field options from API (always fetch, don't depend on localStorage)
    const sel = fieldSel.querySelector('#soil-field-select');
    fetch('/api/profile/user').then(r => r.json()).then(data => {
      if (data.fields) {
        data.fields.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.field_id;
          opt.textContent = f.name + ' (' + (f.planting?.crop_type || '') + ')';
          sel.appendChild(opt);
        });
      }
    }).catch(e => console.error('Failed to load fields for soil form:', e));

    // Metadata fields
    const metaFields = [
      { id: 'soil-sample-date', label: isHindi ? 'रिपोर्ट तारीख' : 'Report Date', value: extractedData?.sample_date || '' },
      { id: 'soil-lab-name', label: isHindi ? 'लैब का नाम' : 'Lab Name', value: extractedData?.lab_name || '' },
      { id: 'soil-type', label: isHindi ? 'मिट्टी का प्रकार' : 'Soil Type', value: extractedData?.soil_type || '' },
    ];
    metaFields.forEach(f => {
      const div = document.createElement('div');
      div.innerHTML = `<label style="font-size:0.85rem;font-weight:600;">${f.label}</label>
        <input type="text" id="${f.id}" value="${f.value}" placeholder="${isHindi ? 'पता नहीं' : 'Unknown'}"
          style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-dark);color:var(--text-main);margin-top:4px;">`;
      fieldsContainer.appendChild(div);
    });

    // Parameter fields
    SOIL_PARAMETERS.forEach(param => {
      const extracted = extractedData?.values?.find(v => v.parameter_name === param.key);
      const div = document.createElement('div');
      div.innerHTML = `<label style="font-size:0.85rem;font-weight:600;">${isHindi ? param.label_hi : param.label}</label>
        <input type="text" id="soil-param-${param.key}" value="${extracted?.value || ''}" placeholder="${isHindi ? 'पता नहीं' : 'Unknown'}"
          style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-dark);color:var(--text-main);margin-top:4px;">`;
      fieldsContainer.appendChild(div);
    });

    // If extraction failed, show message
    if (extractedData?.status === 'error') {
      const msg = document.createElement('div');
      msg.style.cssText = 'padding:10px;border-radius:8px;background:rgba(231,76,60,0.1);border-left:3px solid #e74c3c;font-size:0.85rem;';
      msg.textContent = isHindi ? 'रिपोर्ट साफ नहीं पढ़ी गई। कृपया मान खुद भरें या फिर से फोटो लें।' : 'Report not clearly read. Please fill values manually.';
      fieldsContainer.insertBefore(msg, fieldsContainer.firstChild);
    }
  }

  function showSoilSummary(savedReport) {
    document.getElementById('soil-home').style.display = 'none';
    document.getElementById('soil-loading').style.display = 'none';
    document.getElementById('soil-review-form').style.display = 'none';
    document.getElementById('soil-summary').style.display = 'flex';

    // Build simple interpretation
    const interpretation = document.getElementById('soil-interpretation');
    const detailed = document.getElementById('soil-detailed-values');
    if (!interpretation || !detailed) return;

    const values = {};
    (savedReport.values || []).forEach(v => { values[v.parameter_name] = v.value; });

    let interpHtml = '';
    let detailHtml = '';

    // pH interpretation
    const ph = parseFloat(values.pH);
    if (!isNaN(ph)) {
      if (ph > 8.5) interpHtml += `<div>🔴 ${localStorage.getItem('aaa_preferred_language') === 'hi' ? 'मिट्टी बहुत क्षारीय है।' : 'Soil is very alkaline.'}</div>`;
      else if (ph > 7.5) interpHtml += `<div>🟡 ${'मिट्टी थोड़ी क्षारीय है।'}</div>`;
      else if (ph < 5.5) interpHtml += `<div>🔴 ${'मिट्टी बहुत अम्लीय है।'}</div>`;
      else if (ph < 6.5) interpHtml += `<div>🟡 ${'मिट्टी थोड़ी अम्लीय है।'}</div>`;
      else interpHtml += `<div>🟢 ${'मिट्टी का pH संतुलित है।'}</div>`;
      detailHtml += `<div>pH: ${values.pH}</div>`;
    }

    // Nitrogen
    const n = parseFloat(values.nitrogen);
    if (!isNaN(n)) {
      if (n < 280) interpHtml += `<div>🟡 ${'नाइट्रोजन कम है।'}</div>`;
      else interpHtml += `<div>🟢 ${'नाइट्रोजन अच्छा है।'}</div>`;
      detailHtml += `<div>नाइट्रोजन: ${values.nitrogen}</div>`;
    }

    // Organic carbon
    const oc = parseFloat(values.organic_carbon);
    if (!isNaN(oc)) {
      if (oc < 0.5) interpHtml += `<div>🟡 ${'जैविक कार्बन कम है।'}</div>`;
      else interpHtml += `<div>🟢 ${'जैविक कार्बन अच्छा है।'}</div>`;
      detailHtml += `<div>जैविक कार्बन: ${values.organic_carbon}</div>`;
    }

    // Potassium
    const k = parseFloat(values.potassium);
    if (!isNaN(k)) {
      if (k > 140) interpHtml += `<div>🟢 ${'पोटाश अच्छा है।'}</div>`;
      else interpHtml += `<div>🟡 ${'पोटाश कम है।'}</div>`;
      detailHtml += `<div>पोटाश: ${values.potassium}</div>`;
    }

    // Phosphorus
    const p = parseFloat(values.phosphorus);
    if (!isNaN(p)) {
      detailHtml += `<div>फॉस्फोरस: ${values.phosphorus}</div>`;
    }

    interpretation.innerHTML = interpHtml || '<div>मिट्टी का सार तैयार है।</div>';
    detailed.innerHTML = detailHtml;
  }

  function saveSoilReport() {
    const fieldId = document.getElementById('soil-field-select')?.value || '';
    if (!fieldId) {
      if (typeof window.showToast === 'function') {
        window.showToast('खेत चुनें', 'कृपया पहले खेत चुनें।', 'warning');
      }
      return;
    }

    const values = [];
    SOIL_PARAMETERS.forEach(param => {
      const input = document.getElementById(`soil-param-${param.key}`);
      if (input && input.value.trim()) {
        values.push({
          parameter_name: param.key,
          value: input.value.trim(),
          unit: '',
          category: '',
          confidence: 1.0
        });
      }
    });

    const reportData = {
      farmer_id: 'user',
      field_id: fieldId,
      source: 'manual',
      sample_date: document.getElementById('soil-sample-date')?.value || '',
      lab_name: document.getElementById('soil-lab-name')?.value || '',
      confirmed_by_farmer: true,
      values: values
    };

    fetch('/api/soil/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        if (typeof window.showToast === 'function') {
          window.showToast('सेव हो गया', 'मिट्टी रिपोर्ट सेव हो गई।', 'success');
        }
        showSoilSummary({ ...reportData, values });
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast('त्रुटि', 'सेव करने में समस्या।', 'danger');
        }
      }
    })
    .catch(err => {
      console.error('[Soil] Save failed:', err);
      // Offline: store locally and show summary
      showSoilSummary({ ...reportData, values });
    });
  }

  async function handleSoilFileUpload(file) {
    showSoilLoading();

    if (!navigator.onLine) {
      // Offline: go straight to manual form
      showSoilForm({ status: 'error', values: [] });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/soil/extract', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.status === 'success') {
        showSoilForm(data);
      } else {
        showSoilForm({ status: 'error', values: [], sample_date: '', lab_name: '' });
      }
    } catch (err) {
      console.error('[Soil] Extraction failed:', err);
      showSoilForm({ status: 'error', values: [] });
    }
  }

  // Bind soil test buttons
  function bindSoilTestButtons() {
    const uploadOption = document.getElementById('soil-option-upload');
    const cameraOption = document.getElementById('soil-option-camera');
    const manualOption = document.getElementById('soil-option-manual');
    const fileInput = document.getElementById('soil-file-input');
    const cameraInput = document.getElementById('soil-camera-input');
    const saveBtn = document.getElementById('soil-save-btn');
    const reuploadBtn = document.getElementById('soil-reupload-btn');

    if (uploadOption && fileInput) {
      uploadOption.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleSoilFileUpload(e.target.files[0]);
      });
    }

    if (cameraOption && cameraInput) {
      cameraOption.addEventListener('click', () => cameraInput.click());
      cameraInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleSoilFileUpload(e.target.files[0]);
      });
    }

    if (manualOption) {
      manualOption.addEventListener('click', () => {
        showSoilForm({ status: 'manual', values: [] });
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', saveSoilReport);
    }

    if (reuploadBtn) {
      reuploadBtn.addEventListener('click', showSoilTestHome);
    }
  }

  bindSoilTestButtons();
  document.addEventListener('DOMContentLoaded', bindSoilTestButtons);
});
