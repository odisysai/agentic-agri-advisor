/**
 * pwa_config.js
 * Configuration and enhancements for the Krishi Sampark PWA.
 *
 * Features:
 * - Configurable backend URLs (auto-detects production vs dev)
 * - PWA install prompt (Add to Home Screen)
 * - Background sync registration for offline actions
 * - Push notification subscription for alerts
 * - Network status monitoring with toast notifications
 */

(function() {
  // ============================================================
  // Backend URL Configuration
  // ============================================================
  // Auto-detect: if served from localhost, use local dev servers.
  // In production, these would be set by the deployment environment.
  const isLocalhost = location.hostname === '127.0.0.1' || location.hostname === 'localhost';

  window.ADK_BACKEND_URL = isLocalhost ? 'http://127.0.0.1:8080' : '';  // Same origin in production
  window.ADK_APP_NAME = 'agents';
  window.API_BASE_URL = isLocalhost ? 'http://localhost:8000' : '';  // Same origin in production

  console.log('[PWA Config] Backend URL:', window.ADK_BACKEND_URL || 'same-origin');
  console.log('[PWA Config] App name:', window.ADK_APP_NAME);

  // ============================================================
  // PWA Install Prompt (Add to Home Screen)
  // ============================================================
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar from showing
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] Install prompt available');

    // Show custom install banner after 3 seconds
    setTimeout(() => {
      if (deferredInstallPrompt && !localStorage.getItem('pwa_install_dismissed')) {
        showInstallBanner();
      }
    }, 3000);
  });

  function showInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0;
      background: linear-gradient(135deg, #2C6B37, #3E8E41);
      color: white; padding: 12px 16px; display: flex;
      align-items: center; justify-content: space-between;
      z-index: 10000; box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
      font-size: 0.9rem;
    `;
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">🌾</span>
        <div>
          <strong>Install Krishi Sampark</strong><br/>
          <span style="opacity: 0.9; font-size: 0.8rem;">Add to home screen for offline access</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="pwa-install-yes" style="background: white; color: #2C6B37; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer;">Install</button>
        <button id="pwa-install-no" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.5); padding: 6px 10px; border-radius: 6px; cursor: pointer;">Later</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('pwa-install-yes').addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log('[PWA] Install outcome:', outcome);
        deferredInstallPrompt = null;
      }
      banner.remove();
    });

    document.getElementById('pwa-install-no').addEventListener('click', () => {
      localStorage.setItem('pwa_install_dismissed', 'true');
      banner.remove();
    });
  }

  // Track installed state
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    if (typeof window.showToast === 'function') {
      window.showToast('App Installed', 'Krishi Sampark is now available offline!', 'success');
    }
  });

  // ============================================================
  // Background Sync for Offline Actions
  // ============================================================
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(reg => {
      // Register background sync for pending telemetry
      reg.sync.register('sync-pending-telemetry').catch(err => {
        console.warn('[PWA] Background sync registration failed:', err);
      });
    });
  }

  // ============================================================
  // Push Notification Subscription (for alerts)
  // ============================================================
  async function subscribeToPushNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('[PWA] Push notifications not supported');
      return;
    }

    // Don't auto-prompt — wait for user to enable in settings
    const pushEnabled = localStorage.getItem('pwa_push_enabled') === 'true';
    if (!pushEnabled) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[PWA] Notification permission not granted');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      // In production, this would subscribe to a push server
      // const subscription = await reg.pushManager.subscribe({
      //   userVisibleOnly: true,
      //   applicationServerKey: VAPID_PUBLIC_KEY
      // });
      // await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) });
      console.log('[PWA] Push notification subscription ready');
    } catch (err) {
      console.warn('[PWA] Push subscription failed:', err);
    }
  }

  // Expose for settings page
  window.subscribeToPushNotifications = subscribeToPushNotifications;

  // ============================================================
  // Network Status with Toast Notifications
  // ============================================================
  let wasOffline = false;

  window.addEventListener('online', () => {
    if (wasOffline) {
      wasOffline = false;
      if (typeof window.showToast === 'function') {
        window.showToast(
          'Back Online',
          'Reconnected! Syncing your offline data...',
          'success'
        );
      }
      // Trigger sync of pending IndexedDB data
      if (typeof window.processSyncQueue === 'function') {
        window.processSyncQueue();
      }
    }
  });

  window.addEventListener('offline', () => {
    wasOffline = true;
    if (typeof window.showToast === 'function') {
      window.showToast(
        'Offline Mode',
        'You can still ask questions and diagnose crops. Data will sync when back online.',
        'warning'
      );
    }
  });

  // ============================================================
  // OKF Knowledge Pre-cache (download for offline use)
  // ============================================================
  async function precacheOKFKnowledge() {
    if (!navigator.onLine) return;
    if (localStorage.getItem('okf_precached') === 'true') return;

    try {
      const apiBase = window.API_BASE_URL || '';
      const resp = await fetch(`${apiBase}/api/okf/sync`);
      if (!resp.ok) return;
      const data = await resp.json();

      // Store in IndexedDB via LocalDb
      if (typeof window.LocalDb === 'function') {
        const db = new window.LocalDb();
        await db.init();

        // Cache each crop entity
        for (const crop of data.crops || []) {
          await db.saveOkfGuide(crop.id, crop);
        }

        localStorage.setItem('okf_precached', 'true');
        localStorage.setItem('okf_precache_date', new Date().toISOString());
        console.log(`[PWA] Pre-cached ${data.total_entities} OKF entities for offline use`);
      }
    } catch (err) {
      console.warn('[PWA] OKF pre-cache failed:', err);
    }
  }

  // Run OKF pre-cache after page load (non-blocking)
  window.addEventListener('load', () => {
    setTimeout(precacheOKFKnowledge, 2000);
    subscribeToPushNotifications();
  });

  // Expose for manual trigger
  window.precacheOKFKnowledge = precacheOKFKnowledge;

})();