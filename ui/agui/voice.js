(function() {
  let audioPlayer = null;

  // Track active TTS source to prevent overlapping speech
  let ttsSource = null; // 'browser' | 'backend' | null
  let isSpeaking = false;

  async function speakText(text, lang) {
    // Cancel all active speech before starting new utterance
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }
    ttsSource = null;
    isSpeaking = false;

    const language = (lang || currentLang || 'en');
    const ttsToggle = document.getElementById('tts-toggle');
    if (!ttsToggle || !ttsToggle.checked) {
      const voiceBtn = document.getElementById('voice-btn');
      if (voiceBtn) voiceBtn.style.display = 'none';
      const badge = document.getElementById('tts-badge');
      if (badge) badge.style.display = 'none';
      return;
    }

    let usedBrowserTTS = false;

    if (window.speechSynthesis && preferredVoice) {
      ttsSource = 'browser';
      isSpeaking = true;
      usedBrowserTTS = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.voice = preferredVoice;
      utterance.onend = () => { isSpeaking = false; ttsSource = null; };
      utterance.onerror = () => { isSpeaking = false; ttsSource = null; };
      window.speechSynthesis.speak(utterance);
    }

    // Only play backend TTS if browser TTS was NOT used
    if (!usedBrowserTTS) {
      ttsSource = 'backend';
      isSpeaking = true;
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language })
      })
        .then(res => res.blob())
        .then(blob => {
          if (ttsSource !== 'backend') return; // Another speakText call may have cancelled this
          const url = URL.createObjectURL(blob);
          audioPlayer.src = url;
          audioPlayer.play();
          audioPlayer.onended = () => { isSpeaking = false; ttsSource = null; URL.revokeObjectURL(url); };
          audioPlayer.onerror = () => { isSpeaking = false; ttsSource = null; };
        })
        .catch(() => { isSpeaking = false; ttsSource = null; });
    }
  }

  function triggerMicrophoneListen() {
    const mainVoiceBtn = document.getElementById('main-voice-btn');
    const micWaveContainer = document.getElementById('mic-wave-container');
    const voiceStatusLabel = document.getElementById('voice-status-label');
    const userInputField = document.getElementById('user-input-field');

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      const currentLang = localStorage.getItem('aaa_preferred_language') || 'English';
      
      if (currentLang === 'Hindi') rec.lang = 'hi-IN';
      else if (currentLang === 'Marathi') rec.lang = 'mr-IN';
      else if (currentLang === 'Telugu') rec.lang = 'te-IN';
      else if (currentLang === 'Swahili') rec.lang = 'sw-KE';
      else rec.lang = 'en-US';

      window.recognitionInstance = rec;
      
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (userInputField) userInputField.value = transcript;
        if (mainVoiceBtn) mainVoiceBtn.classList.remove('listening');
        if (micWaveContainer) micWaveContainer.style.display = 'none';
        if (voiceStatusLabel) voiceStatusLabel.textContent = 'बोलकर पूछें';
        
        if (typeof window.appendMessage === 'function') {
          window.appendMessage('System', `मैंने सुना: "${transcript}"`, 'system-msg');
        }
        if (typeof window.handleSend === 'function') {
          window.handleSend();
        }
      };
      
      rec.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        if (mainVoiceBtn) mainVoiceBtn.classList.remove('listening');
        if (micWaveContainer) micWaveContainer.style.display = 'none';
        if (voiceStatusLabel) voiceStatusLabel.textContent = 'बोलकर पूछें';

        const errorMessages = {
          'no-speech': {
            'English': 'No sound detected. Please try again.',
            'Hindi': 'कोई आवाज़ नहीं मिली। कृपया फिर से कोशिश करें।',
            'Marathi': 'काहीही आवाज आला नाही. कृपया पुन्हा प्रयत्न करा.',
            'Telugu': 'ధ్వని ఏమీ వినిపించలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
            'Swahili': 'Hakuna sauti iliyopatikana. Tafadhali jaribu tena.'
          },
          'audio-not-captured': {
            'English': 'Microphone access denied. Please check your permissions.',
            'Hindi': 'माइक्रोफ़ोन एक्सेस वर्जित है। कृपया अपनी अनुमति जाँचें।',
            'Marathi': 'मायक्रोफोन प्रवेश नाकारला. कृपया तुमची परवानगी तपासा.',
            'Telugu': 'మైక్రోఫోన్ యాక్సెస్ నిరాకరించబడింది. దయచేసి మీ అనుమతులను తనిఖీ చేయండి.',
            'Swahili': 'Ufikiaji wa maikrofoni umekataliwa. Tafadhali angalia ruhusa zako.'
          },
          'not-allowed': {
            'English': 'Microphone permission denied.',
            'Hindi': 'माइक्रोफ़ोन अनुमति अस्वीकृत।',
            'Marathi': 'मायक्रोफोन परवानगी नाकारली.',
            'Telugu': 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది.',
            'Swahili': 'Ruhusa ya maikrofoni imekataliwa.'
          },
          'network': {
            'English': 'Network error. Please check your connection.',
            'Hindi': 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जाँचें।',
            'Marathi': 'नेटवर्क त्रुटी. कृपया तुमचे कनेक्शन तपासा.',
            'Telugu': 'నెట్‌వర్క్ లోపం. దయచేసి మీ కనెక్షన్‌ని తనిఖీ చేయండి.',
            'Swahili': 'Hitilafu ya mtandao. Tafadhali angalia muunganisho wako.'
          },
          'no-device-found': {
            'English': 'No microphone found.',
            'Hindi': 'कोई माइक्रोफ़ोन नहीं मिला।',
            'Marathi': 'मायक्रोफोन सापडला नाही.',
            'Telugu': 'మైక్రోఫోన్ దొరకలేదు.',
            'Swahili': 'Hakuna maikrofoni iliyopatikana.'
          }
        };

        const currentLang = localStorage.getItem('aaa_preferred_language') || 'English';
        const friendlyMessage = (errorMessages[e.error] && errorMessages[e.error][currentLang]) || `Speech error: ${e.error}`;

        if (typeof window.showToast === 'function') {
          window.showToast("Speech Error", friendlyMessage, "warning");
        }
      };
      
      rec.start();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const mainVoiceBtn = document.getElementById('main-voice-btn');
    const micWaveContainer = document.getElementById('mic-wave-container');
    const voiceStatusLabel = document.getElementById('voice-status-label');

    if (mainVoiceBtn) {
      mainVoiceBtn.addEventListener('click', () => {
        if (mainVoiceBtn.classList.contains('listening')) {
          mainVoiceBtn.classList.remove('listening');
          if (micWaveContainer) micWaveContainer.style.display = 'none';
          if (voiceStatusLabel) voiceStatusLabel.textContent = 'बोलकर पूछें';
          if (window.recognitionInstance) {
            window.recognitionInstance.stop();
          }
        } else {
          mainVoiceBtn.classList.add('listening');
          if (micWaveContainer) micWaveContainer.style.display = 'flex';
          if (voiceStatusLabel) voiceStatusLabel.textContent = 'मैं सुन रहा हूँ...';
          triggerMicrophoneListen();
        }
      });
    }
  });

  window.speakText = speakText;
  window.triggerMicrophoneListen = triggerMicrophoneListen;
})();
