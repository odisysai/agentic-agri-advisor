class CropCamera {
  constructor() {
    this.stream = null;
    this.activeVideo = null;
  }

  /**
   * Starts the camera feed in the specified video element
   * @param {HTMLVideoElement} videoElement
   * @returns {Promise<boolean>} Success status
   */
  async start(videoElement) {
    if (!videoElement) return false;
    this.activeVideo = videoElement;

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[Camera] getUserMedia is not supported in this browser.');
      return false;
    }

    try {
      // Attempt to load rear camera first (environment)
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      videoElement.setAttribute('playsinline', true);
      videoElement.play();
      console.log('[Camera] Rear camera stream started successfully');
      return true;
    } catch (err) {
      console.warn('[Camera] Failed to open rear camera. Retrying with default camera...', err);
      try {
        // Fallback to any available video source
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoElement.srcObject = this.stream;
        videoElement.setAttribute('playsinline', true);
        videoElement.play();
        console.log('[Camera] Default camera stream started successfully');
        return true;
      } catch (fallbackErr) {
        console.warn('[Camera] Camera feed unavailable; using upload fallback:', fallbackErr);
        return false;
      }
    }
  }

  /**
   * Captures the current video frame and draws it onto a canvas
   * @param {HTMLCanvasElement} canvasElement
   * @returns {string|null} JPEG Base64 data URL
   */
  capture(canvasElement) {
    if (!this.stream || !this.activeVideo || !canvasElement) {
      console.warn('[Camera] Capture attempted but stream/video/canvas is not ready.');
      return null;
    }

    const context = canvasElement.getContext('2d');
    const width = this.activeVideo.videoWidth || 640;
    const height = this.activeVideo.videoHeight || 480;

    canvasElement.width = width;
    canvasElement.height = height;

    // Draw video frame to canvas
    context.drawImage(this.activeVideo, 0, 0, width, height);

    // Convert canvas image to base64 jpeg
    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.85);
    console.log('[Camera] Frame captured successfully, data URL size:', dataUrl.length);
    return dataUrl;
  }

  /**
   * Stops the active camera stream and releases media devices
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[Camera] Track stopped:', track.label);
      });
      this.stream = null;
    }
    if (this.activeVideo) {
      this.activeVideo.srcObject = null;
      this.activeVideo = null;
    }
    console.log('[Camera] Stream released and clean');
  }
}

// Bind to window for global access across dashboard scripts
window.CropCamera = CropCamera;
