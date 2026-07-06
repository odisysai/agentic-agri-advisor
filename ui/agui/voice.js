/**
 * voice.js — Voice interface for Krishi Sampark PWA
 *
 * STT (Speech-to-Text): Uses Web Speech API (browser-native) for real-time
 *   voice recognition. Falls back to backend /api/stt if not supported.
 *
 * TTS (Text-to-Speech): Uses browser SpeechSynthesis API (free, offline).
 *   Falls back to backend /api/tts (edge-tts neural voices) if no system
 *   voice is available for the farmer's language.
 *
 * Both STT and TTS work in real-time on modern mobile browsers (Chrome, Safari).
 */

(function() {
  // ============================================================
  // State Variables
  // ============================================================
  let audioPlayer = document.createElement('audio');
  audioPlayer.style.display = 'none';
  document.body.appendChild(audioPlayer);

  let preferredVoice = null;
  let currentLang = 'en';
  let ttsSource = null;
  let isSpeaking = false;
  let voicesLoaded = false;

  // ============================================================
  // Voice Loading — load system TTS voices (async on Chrome)
  // ============================================================
  function loadVoices() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    voicesLoaded = true;
    const langName = localStorage.getItem('aaa_preferred_language') || 'English';

    // Map UI language to BCP-47 code
    const langMap = {
      'English': 'en',
      'Hindi': 'hi',
      'Marathi': 'mr',
      'Telugu': 'te',
      'Swahili': 'sw',
      'Zulu': 'zu'
    };
    currentLang = langMap[langName] || 'en';

    // Find the best voice for the language
    const langPrefix = currentLang + '-';
    const matchingVoices = voices.filter(v => v.lang && v.lang.startsWith(langPrefix));

    if (matchingVoices.length > 0) {
      // Prefer neural/natural voices if available
      const neural = matchingVoices.find(v =>
        v.name.includes('Neural') || v.name.includes('Natural') || v.name.includes('Google')
      );
      preferredVoice = neural || matchingVoices[0];
      console.log('[Voice] TTS voice selected:', preferredVoice.name, preferredVoice.lang);
    } else {
      // Fallback to any English voice
      preferredVoice = voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0];
      console.log('[Voice] No voice for', currentLang, '— using fallback:', preferredVoice?.name);
    }
  }

  // Chrome loads voices asynchronously
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Re-load voices when language changes
  window.addEventListener('languageChanged', () => {
    loadVoices();
  });

  // ============================================================
  // TTS — Text-to-Speech
  // ============================================================
  async function speakText(text, lang) {
    // Cancel any active speech first
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }
    ttsSource = null;
    isSpeaking = false;

    if (!text || text.trim().length === 0) return;

    // Strip markdown/JSON formatting for cleaner speech
    let cleanText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/["{}]/g, '')
      .replace(/\*/g, '')
      .replace(/###/g, '')
      .trim();

    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 500) + '...';
    }

    // Determine language — handle both full names ("Hindi") and BCP-47 codes ("hi")
    const rawLang = localStorage.getItem('aaa_preferred_language') || 'English';
    const nameToCode = {
      'English': 'en', 'Hindi': 'hi', 'Marathi': 'mr',
      'Telugu': 'te', 'Swahili': 'sw', 'Zulu': 'zu'
    };
    const codeToCode = {
      'en': 'en', 'en-US': 'en', 'en-IN': 'en',
      'hi': 'hi', 'hi-IN': 'hi',
      'mr': 'mr', 'mr-IN': 'mr',
      'te': 'te', 'te-IN': 'te',
      'sw': 'sw', 'sw-KE': 'sw',
      'zu': 'zu', 'zu-ZA': 'zu',
    };
    const language = lang || nameToCode[rawLang] || codeToCode[rawLang] || currentLang || 'en';

    // Check header speaker toggle
    const ttsEnabled = localStorage.getItem('tts_enabled') !== 'false';
    if (!ttsEnabled) {
      console.log('[Voice] TTS disabled by header toggle');
      return;
    }

    // Load voices if not already loaded
    if (!preferredVoice || !voicesLoaded) {
      loadVoices();
    }

    // Use backend TTS (edge-tts neural male voices) as primary — better quality + male voices
    // Browser TTS often lacks male voices for Indian/African languages
    const useBackendTTS = localStorage.getItem('tts_prefer_backend') !== 'false'; // default: true

    if (useBackendTTS) {
      backendTTS(cleanText, language);
      return;
    }

    // Fallback: Browser-native TTS (if backend fails or is disabled)
    if (window.speechSynthesis) {
      // Force load voices if empty
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Some browsers need a kick
        window.speechSynthesis.getVoices();
        voices = window.speechSynthesis.getVoices();
      }

      if (voices.length > 0) {
        // Find voice for the language — prefer male voices
        const langPrefix = language + '-';
        let voice = voices.find(v => v.lang && v.lang.startsWith(langPrefix) &&
          (v.name.includes('male') || v.name.includes('Male') || v.name.includes('Rishi') || v.name.includes('Madhur') || v.name.includes('Manohar') || v.name.includes('Mohan') || v.name.includes('Rafiki')));
        if (!voice) {
          voice = voices.find(v => v.lang && v.lang.startsWith(langPrefix));
        }
        if (!voice) {
          voice = voices.find(v => v.lang === language);
        }
        if (!voice) {
          voice = voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0];
        }

        if (voice) {
          preferredVoice = voice;
          ttsSource = 'browser';
          isSpeaking = true;
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = voice.lang;
          utterance.voice = voice;
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onstart = () => {
            console.log('[Voice] Browser TTS started:', voice.name, voice.lang);
            updateTTSIndicator(true);
          };
          utterance.onend = () => {
            isSpeaking = false;
            ttsSource = null;
            updateTTSIndicator(false);
          };
          utterance.onerror = (e) => {
            isSpeaking = false;
            ttsSource = null;
            updateTTSIndicator(false);
            console.warn('[Voice] Browser TTS error:', e.error);
            // Try backend TTS as fallback
            backendTTS(cleanText, language);
          };

          window.speechSynthesis.speak(utterance);
          return;
        }
      }
    }

    // Fallback: Backend TTS (neural voices via edge-tts)
    backendTTS(cleanText, language);
  }

  // Backend TTS using edge-tts neural voices
  async function backendTTS(text, language) {
    ttsSource = 'backend';
    isSpeaking = true;

    try {
      // Convert BCP-47 code to full language name for the backend VOICE_MAP
      const langNameMap = {
        'en': 'English', 'hi': 'Hindi', 'mr': 'Marathi',
        'te': 'Telugu', 'sw': 'Swahili', 'zu': 'Zulu',
        'English': 'English', 'Hindi': 'Hindi', 'Marathi': 'Marathi',
        'Telugu': 'Telugu', 'Swahili': 'Swahili', 'Zulu': 'Zulu',
      };
      const backendLang = langNameMap[language] || 'English';

      const apiBase = window.API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: backendLang })
      });

      if (!response.ok) throw new Error(`TTS API error: ${response.status}`);

      const blob = await response.blob();
      if (ttsSource !== 'backend') return; // Cancelled

      const url = URL.createObjectURL(blob);
      audioPlayer.src = url;
      updateTTSIndicator(true);

      await audioPlayer.play();
      console.log('[Voice] Backend TTS playing');

      audioPlayer.onended = () => {
        isSpeaking = false;
        ttsSource = null;
        updateTTSIndicator(false);
        URL.revokeObjectURL(url);
      };
      audioPlayer.onerror = () => {
        isSpeaking = false;
        ttsSource = null;
        updateTTSIndicator(false);
        console.warn('[Voice] Backend TTS audio error');
      };
    } catch (err) {
      isSpeaking = false;
      ttsSource = null;
      updateTTSIndicator(false);
      console.warn('[Voice] Backend TTS failed:', err);
    }
  }

  // Visual indicator for TTS active state
  function updateTTSIndicator(speaking) {
    document.querySelectorAll('.speak-msg-btn').forEach(btn => {
      btn.style.opacity = speaking ? '0.5' : '1.0';
    });
  }

  // ============================================================
  // STT — Speech-to-Text (Voice Recognition)
  // ============================================================
  function triggerMicrophoneListen() {
    // Use the new mic-input-btn from the input bar
    const mainVoiceBtn = document.getElementById('mic-input-btn') || document.getElementById('main-voice-btn-top') || document.getElementById('main-voice-btn');
    const micWaveContainer = document.getElementById('mic-wave-container-top') || document.getElementById('mic-wave-container');
    const voiceStatusLabel = document.getElementById('voice-status-label-top') || document.getElementById('voice-status-label');
    const userInputField = document.getElementById('user-input-field');

    const rawLang = localStorage.getItem('aaa_preferred_language') || 'English';
    // Handle both full names and BCP-47 codes
    const nameToBcp47 = {
      'English': 'en-US', 'Hindi': 'hi-IN', 'Marathi': 'mr-IN',
      'Telugu': 'te-IN', 'Swahili': 'sw-KE', 'Zulu': 'zu-ZA'
    };
    const codeToBcp47 = {
      'en': 'en-US', 'hi': 'hi-IN', 'mr': 'mr-IN',
      'te': 'te-IN', 'sw': 'sw-KE', 'zu': 'zu-ZA'
    };
    const recognitionLang = nameToBcp47[rawLang] || codeToBcp47[rawLang] || 'en-US';

    // Try Web Speech API first (works in Chrome, Safari mobile)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true; // Show interim results for real-time feedback
      rec.lang = recognitionLang;

      window.recognitionInstance = rec;

      let interimTranscript = '';

      rec.onstart = () => {
        console.log('[Voice] STT started — listening in', recognitionLang);
      };

      rec.onresult = (event) => {
        interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results in the input field for real-time feedback
        if (userInputField) {
          userInputField.value = finalTranscript || interimTranscript;
        }

        // Show interim text in the status label
        if (interimTranscript && voiceStatusLabel && !finalTranscript) {
          voiceStatusLabel.textContent = interimTranscript.substring(0, 50) + '...';
        }

        // When we have a final result, send it to the agent
        if (finalTranscript) {
          if (mainVoiceBtn) mainVoiceBtn.classList.remove('listening');
          if (micWaveContainer) micWaveContainer.style.display = 'none';
          if (voiceStatusLabel) voiceStatusLabel.textContent = 'बोलकर पूछें';

          if (typeof window.appendMessage === 'function') {
            window.appendMessage('System', `मैंने सुना: "${finalTranscript}"`, 'system-msg');
          }

          // Auto-send the transcribed text to the agent
          if (typeof window.handleSend === 'function') {
            window.handleSend();
          }
        }
      };

      rec.onerror = (e) => {
        console.warn('[Voice] STT error:', e.error);
        const btn = document.getElementById('mic-input-btn') || document.getElementById('main-voice-btn-top') || document.getElementById('main-voice-btn');
        const wave = document.getElementById('mic-wave-container-top') || document.getElementById('mic-wave-container');
        const label = document.getElementById('voice-status-label-top') || document.getElementById('voice-status-label');
        if (btn) btn.classList.remove('listening');
        if (wave) wave.style.display = 'none';
        if (label) { label.style.display = 'none'; label.textContent = ''; }

        const errorMessages = {
          'no-speech': {
            'English': 'No speech detected. Please try again.',
            'Hindi': 'कोई आवाज़ नहीं मिली। कृपया फिर से कोशिश करें।',
            'Marathi': 'काहीही आवाज आला नाही. कृपया पुन्हा प्रयत्न करा.',
            'Telugu': 'ధ్వని ఏమీ వినిపించలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
            'Swahili': 'Hakuna sauti iliyopatikana. Tafadhali jaribu tena.'
          },
          'network': {
            'English': 'Network error. Check your connection and try again.',
            'Hindi': 'नेटवर्क त्रुटि। कनेक्शन जांचें और फिर कोशिश करें।',
            'Marathi': 'नेटवर्क त्रुटी. कनेक्शन तपासा.',
            'Telugu': 'నెట్‌వర్క్ లోపం. దయచేసి మీ కనెక్షన్‌ను తనిఖీ చేయండి.',
            'Swahili': 'Hitilafu ya mtandao. Angalia muunganisho wako.'
          },
          'not-allowed': {
            'English': 'Microphone permission denied. Please allow microphone access.',
            'Hindi': 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया माइक्रोफ़ोन एक्सेस दें।',
            'Marathi': 'मायक्रोफोन परवानगी नाकारली. कृपया अनुमती द्या.',
            'Telugu': 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది.',
            'Swahili': 'Ruhusa ya maikrofoni imekataliwa.'
          },
          'audio-not-captured': {
            'English': 'Microphone not available. Check your device.',
            'Hindi': 'माइक्रोफ़ोन उपलब्ध नहीं। अपना डिवाइस जांचें।',
            'Marathi': 'मायक्रोफोन उपलब्ध नाही.',
            'Telugu': 'మైక్రోఫోన్ అందుబాటులో లేదు.',
            'Swahili': 'Maikrofoni haipatikani.'
          }
        };

        const friendlyMessage = (errorMessages[e.error] && errorMessages[e.error][rawLang]) || `Speech error: ${e.error}`;

        if (typeof window.showToast === 'function') {
          window.showToast("Voice Error", friendlyMessage, "warning");
        }

        // If network error in Electron, suggest using text input or a real browser
        if (e.error === 'network' && navigator.userAgent.includes('Electron')) {
          if (typeof window.showToast === 'function') {
            window.showToast(
              "Browser Limitation",
              "Voice recognition works in Chrome/Safari on mobile. Please test on your phone.",
              "info"
            );
          }
        }
      };

      rec.onend = () => {
        // Reset mic button state
        const btn = document.getElementById('mic-input-btn') || document.getElementById('main-voice-btn-top') || document.getElementById('main-voice-btn');
        const wave = document.getElementById('mic-wave-container-top') || document.getElementById('mic-wave-container');
        const label = document.getElementById('voice-status-label-top') || document.getElementById('voice-status-label');
        if (btn) btn.classList.remove('listening');
        if (wave) wave.style.display = 'none';
        if (label) { label.style.display = 'none'; label.textContent = ''; }
      };

      rec.start();
      return;
    }

    // Fallback: No Web Speech API support
    if (typeof window.showToast === 'function') {
      window.showToast(
        "Voice Not Supported",
        "Your browser doesn't support voice input. Please use Chrome or type your question.",
        "warning"
      );
    }
    if (mainVoiceBtn) mainVoiceBtn.classList.remove('listening');
    if (micWaveContainer) micWaveContainer.style.display = 'none';
  }

  // ============================================================
  // Event Bindings
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    // Header speaker toggle button (on/off)
    const speakToggleBtn = document.getElementById('speak-toggle-btn');
    let ttsEnabled = localStorage.getItem('tts_enabled') !== 'false'; // default: true

    function updateSpeakToggleUI() {
      if (speakToggleBtn) {
        if (ttsEnabled) {
          speakToggleBtn.style.opacity = '1.0';
          speakToggleBtn.title = 'Voice Output ON — tap to mute';
        } else {
          speakToggleBtn.style.opacity = '0.4';
          speakToggleBtn.title = 'Voice Output OFF — tap to enable';
        }
      }
    }
    updateSpeakToggleUI();

    if (speakToggleBtn) {
      speakToggleBtn.addEventListener('click', () => {
        ttsEnabled = !ttsEnabled;
        localStorage.setItem('tts_enabled', ttsEnabled ? 'true' : 'false');
        updateSpeakToggleUI();
        if (!ttsEnabled) {
          // Stop any current speech
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          if (audioPlayer) audioPlayer.pause();
        }
        if (typeof window.showToast === 'function') {
          window.showToast("Voice Output", ttsEnabled ? "Enabled — responses will be spoken" : "Disabled", "info");
        }
      });
    }

    // Mic button in the input bar
    const micInputBtn = document.getElementById('mic-input-btn');
    const micWaveContainer = document.getElementById('mic-wave-container-top');
    const voiceStatusLabel = document.getElementById('voice-status-label-top');

    if (micInputBtn) {
      micInputBtn.addEventListener('click', () => {
        if (micInputBtn.classList.contains('listening')) {
          micInputBtn.classList.remove('listening');
          if (micWaveContainer) micWaveContainer.style.display = 'none';
          if (voiceStatusLabel) { voiceStatusLabel.style.display = 'none'; voiceStatusLabel.textContent = ''; }
          if (window.recognitionInstance) window.recognitionInstance.stop();
        } else {
          micInputBtn.classList.add('listening');
          if (micWaveContainer) micWaveContainer.style.display = 'flex';
          if (voiceStatusLabel) { voiceStatusLabel.style.display = 'block'; voiceStatusLabel.textContent = 'मैं सुन रहा हूँ...'; }
          triggerMicrophoneListen();
        }
      });
    }

    // Camera button in the input bar
    const cameraInputBtn = document.getElementById('camera-input-btn');
    if (cameraInputBtn) {
      cameraInputBtn.addEventListener('click', () => {
        // Trigger the existing camera flow
        if (typeof window.startCameraCapture === 'function') {
          window.startCameraCapture();
        } else {
          // Fallback: open the camera screen
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'image/*';
          fileInput.capture = 'environment'; // Prefer rear camera on mobile
          fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target.result;
                // Add a message showing the photo was captured
                if (typeof window.appendMessage === 'function') {
                  window.appendMessage('User', '📷 [Photo captured — analyzing...]', 'user-msg');
                }
                // Trigger crop classification
                if (typeof window.classifyCapturedImage === 'function') {
                  window.classifyCapturedImage(base64);
                }
              };
              reader.readAsDataURL(file);
            }
          });
          fileInput.click();
        }
      });
    }

    // Load voices on page load
    loadVoices();
  });

  // ============================================================
  // Exports
  // ============================================================
  window.speakText = speakText;
  window.triggerMicrophoneListen = triggerMicrophoneListen;
  window.loadVoices = loadVoices;
})();
