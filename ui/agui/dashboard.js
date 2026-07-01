document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chat-messages');
  const userInputField = document.getElementById('user-input-field');
  const sendBtn = document.getElementById('send-btn');
  const aguiCanvas = document.getElementById('agui-canvas');

  // Floating Action Buttons (FABs)
  const fabDiagnose = document.getElementById('fab-diagnose');
  const fabRefresh = document.getElementById('fab-refresh');
  const fabRun = document.getElementById('fab-run');

  // Multilingual translation maps for UI localization (tabs, placeholders, titles)
  const TRANSLATIONS = {
    'English': {
      'nav_crop_dashboard': '🌾 Health',
      'nav_irrigation_planner': '💧 Irrigation',
      'nav_pest_alert': '🐛 Pests',
      'nav_market_insights': '📈 Markets',
      'nav_simulation': '🎮 Simulator',
      'nav_farmer_profile': '🧬 Profile',
      'status_online': 'Agents Online',
      'chat_placeholder': 'Ask Krishi Sastri a question...',
      'btn_send': 'Send',
      'btn_speak': 'Auto-Speak',
      'title_chat': 'Krishi Sastri Chat Portal'
    },
    'Hindi': {
      'nav_crop_dashboard': '🌾 स्वास्थ्य',
      'nav_irrigation_planner': '💧 सिंचाई',
      'nav_pest_alert': '🐛 कीट',
      'nav_market_insights': '📈 मंडी भाव',
      'nav_simulation': '🎮 सिमुलेटर',
      'nav_farmer_profile': '🧬 प्रोफाइल',
      'status_online': 'सलाहकार ऑनलाइन हैं',
      'chat_placeholder': 'कृषि शास्त्री से पूछें...',
      'btn_send': 'भेजें',
      'btn_speak': 'ऑटो-बोलें',
      'title_chat': 'कृषि शास्त्री चैट पोर्टल'
    },
    'Marathi': {
      'nav_crop_dashboard': '🌾 पिकाची तब्येत',
      'nav_irrigation_planner': '💧 पाणी नियोजन',
      'nav_pest_alert': '🐛 कीड नियंत्रण',
      'nav_market_insights': '📈 बाजार भाव',
      'nav_simulation': '🎮 सिम्युलेटर',
      'nav_farmer_profile': '🧬 प्रोफाइल',
      'status_online': 'सल्लागार ऑनलाइन आहेत',
      'chat_placeholder': 'कृषि शास्त्रींना विचारा...',
      'btn_send': 'पाठवा',
      'btn_speak': 'ऑटो-बोला',
      'title_chat': 'कृषि शास्त्री चॅट पोर्टल'
    },
    'Swahili': {
      'nav_crop_dashboard': '🌾 Afya ya Mazao',
      'nav_irrigation_planner': '💧 Umwagiliaji',
      'nav_pest_alert': '🐛 Wadudu',
      'nav_market_insights': '📈 Soko',
      'nav_simulation': '🎮 Kifanisi',
      'nav_farmer_profile': '🧬 Wasifu',
      'status_online': 'Washauri Wapo Mtandaoni',
      'chat_placeholder': 'Uliza Krishi Sastri...',
      'btn_send': 'Tuma',
      'btn_speak': 'Soma Kiotomatiki',
      'title_chat': 'Krishi Sastri Portal ya Mazungumzo'
    },
    'Telugu': {
      'nav_crop_dashboard': '🌾 ఆరోగ్యం',
      'nav_irrigation_planner': '💧 నీటి నిర్వహణ',
      'nav_pest_alert': '🐛 పురుగుల నివారణ',
      'nav_market_insights': '📈 మార్కెట్ ధరలు',
      'nav_simulation': '🎮 సిమ్యులేటర్',
      'nav_farmer_profile': '🧬 ప్రొఫైల్',
      'status_online': 'సలహాదారులు ఆన్‌లైన్',
      'chat_placeholder': 'వ్యవసాయ సలహాదారుడిని అడగండి...',
      'btn_send': 'పంపించు',
      'btn_speak': 'ఆటో-స్పీక్',
      'title_chat': 'సలహాదారు చాట్ పోర్టల్'
    }
  };

  const SCHEMA_TRANSLATIONS = {
    'Hindi': {
      'Crop Health Telemetry': 'फसल स्वास्थ्य टेलीमेट्री',
      'Interactive Irrigation Planner': 'इंटरैक्टिव सिंचाई योजनाकार',
      'Real-time Pest & Disease Alert': 'वास्तविक समय कीट और रोग चेतावनी',
      'Mandi Market Price Insights': 'मंडी बाजार भाव जानकारी',
      'Interactive Crop Growth Simulator': 'इंटरैक्टिव फसल विकास सिमुलेटर',
      'Voice-First Agronomic Assistant': 'आवाज-आधारित कृषि सहायक',
      'Farmer Digital Twin Profile': 'किसान डिजिटल ट्विन प्रोफाइल',
      'Soil Moisture': 'मिट्टी की नमी',
      'Soil Temperature': 'मिट्टी का तापमान',
      'Nitrogen Level (N)': 'नाइट्रोजन स्तर (N)',
      'Crop Health Index': 'फसल स्वास्थ्य सूचकांक',
      'Weather Risk': 'मौसम का जोखिम',
      'Water Balance': 'जल संतुलन',
      'Soil Dryness': 'मिट्टी का सूखापन',
      'Target Moisture': 'लक्षित नमी',
      'Pest Risk Index': 'कीट जोखिम सूचकांक',
      'Critical Crop Stage': 'महत्वपूर्ण फसल चरण',
      'Active Pest Type': 'सक्रिय कीट प्रकार',
      'Recommended Action': 'अनुशंसित कार्रवाई',
      'Wheat Mandi Price': 'गेहूं मंडी मूल्य',
      'Market Trend': 'बाजार का रुख',
      'Arrival Volume (Tons)': 'आवक मात्रा (टन)',
      'Demand Level': 'मांग का स्तर',
      'Simulation Day': 'सिमुलेशन दिन',
      'Growth Stage': 'विकास का चरण',
      'Crop Type': 'फसल का प्रकार',
      'Water applied today (Liters)': 'आज डाला गया पानी (लीटर)',
      'Fertilizer applied today (Kg)': 'आज डाला गया उर्वरक (किलोग्राम)',
      'Select Field': 'खेत चुनें',
      'Farmer Name': 'किसान का नाम',
      'Farm Location / District': 'खेत का स्थान / जिला',
      'Farm Size (Acres)': 'खेत का आकार (एकड़)',
      'Soil Composition': 'मिट्टी की संरचना',
      'Current Crop Type': 'वर्तमान फसल का प्रकार',
      'Has Drip Irrigation System?': 'क्या ड्रिप सिंचाई प्रणाली है?',
      'e.g. 5': 'उदा. 5',
      'Enter your name': 'अपना नाम दर्ज करें',
      '🎮 Step Simulation': '🎮 सिमुलेशन आगे बढ़ाएं',
      '💾 Save & Sync Profile': '💾 प्रोफाइल सहेजें',
      '🎮 Run Simulation': '🎮 सिमुलेशन चलाएं',
      '💧 Log Irrigation Action': '💧 सिंचाई कार्रवाई दर्ज करें',
      '🐛 Trigger Treatment': '🐛 उपचार शुरू करें'
    },
    'Marathi': {
      'Crop Health Telemetry': 'पिकाचे आरोग्य निरीक्षण',
      'Interactive Irrigation Planner': 'पाणी नियोजन सल्ला',
      'Real-time Pest & Disease Alert': 'कीड व रोग चेतावणी',
      'Mandi Market Price Insights': 'बाजार भाव माहिती',
      'Interactive Crop Growth Simulator': 'पीक वाढ सिम्युलेटर',
      'Voice-First Agronomic Assistant': 'आवाज-आधारित कृषी सहाय्यक',
      'Farmer Digital Twin Profile': 'शेतकरी डिजिटल प्रोफाइल',
      'Soil Moisture': 'जमीन ओलावा',
      'Soil Temperature': 'जमिनीचे तापमान',
      'Nitrogen Level (N)': 'नायट्रोजन पातळी (N)',
      'Crop Health Index': 'पीक आरोग्य निर्देशांक',
      'Weather Risk': 'हवामान धोका',
      'Water Balance': 'पाणी शिल्लक',
      'Soil Dryness': 'जमिनीचा सुकेपणा',
      'Target Moisture': 'लक्षित ओलावा',
      'Pest Risk Index': 'कीड धोका निर्देशांक',
      'Critical Crop Stage': 'महत्त्वाचा पीक टप्पा',
      'Active Pest Type': 'सक्रिय कीड प्रकार',
      'Recommended Action': 'शिफारस केलेली कृती',
      'Wheat Mandi Price': 'गेहू बाजार भाव',
      'Market Trend': 'बाजार कल',
      'Arrival Volume (Tons)': 'आवक प्रमाण (टन)',
      'Demand Level': 'मागणी पातळी',
      'Simulation Day': 'सिम्युलेशन दिवस',
      'Growth Stage': 'वाढीचा टप्पा',
      'Crop Type': 'पिकाचा प्रकार',
      'Water applied today (Liters)': 'आज दिलेले पाणी (लिटर)',
      'Fertilizer applied today (Kg)': 'आज दिलेले खत (किलो)',
      'Select Field': 'शेत निवडा',
      'Farmer Name': 'शेतकऱ्याचे नाव',
      'Farm Location / District': 'शेताचे ठिकाण / जिल्हा',
      'Farm Size (Acres)': 'शेताचा आकार (एकड)',
      'Soil Composition': 'मातीचा प्रकार',
      'Current Crop Type': 'चालू पिकाचा प्रकार',
      'Has Drip Irrigation System?': 'ठिबक सिंचन आहे का?',
      'e.g. 5': 'उदा. ५',
      'Enter your name': 'तुमचे नाव टाका',
      '🎮 Step Simulation': '🎮 सिम्युलेशन पुढे न्या',
      '💾 Save & Sync Profile': '💾 प्रोफाइल जतन करा',
      '🎮 Run Simulation': '🎮 सिम्युलेशन सुरू करा',
      '💧 Log Irrigation Action': '💧 पाणी नोंदणी करा',
      '🐛 Trigger Treatment': '🐛 कीड उपचार करा'
    },
    'Swahili': {
      'Crop Health Telemetry': 'Vipimo vya Afya ya Mazao',
      'Interactive Irrigation Planner': 'Kipanga Umwagiliaji',
      'Real-time Pest & Disease Alert': 'Tahadhari ya Wadudu na Magonjwa',
      'Mandi Market Price Insights': 'Bei za Soko la Mandi',
      'Interactive Crop Growth Simulator': 'Kifanisi cha Ukuaji wa Mazao',
      'Voice-First Agronomic Assistant': 'Msaidizi wa Kilimo wa Sauti',
      'Farmer Digital Twin Profile': 'Wasifu wa Kidijitali wa Mkulima',
      'Soil Moisture': 'Unyevu wa Udongo',
      'Soil Temperature': 'Joto la Udongo',
      'Nitrogen Level (N)': 'Kiwango cha Nitrojeni (N)',
      'Crop Health Index': 'Kielezo cha Afya ya Mazao',
      'Weather Risk': 'Hatari ya Hali ya Hawa',
      'Water Balance': 'Mizani ya Maji',
      'Soil Dryness': 'Ukame wa Udongo',
      'Target Moisture': 'Unyevu Lengwa',
      'Pest Risk Index': 'Kielezo cha Wadudu',
      'Critical Crop Stage': 'Hatua Muhimu ya Zao',
      'Active Pest Type': 'Aina ya Mdudu Aliyepo',
      'Recommended Action': 'Hatua Inayopendekezwa',
      'Wheat Mandi Price': 'Bei ya Ngano Soko Kuu',
      'Market Trend': 'Mwelekeo wa Soko',
      'Arrival Volume (Tons)': 'Kiasi Kilichofika (Tani)',
      'Demand Level': 'Kiwango cha Mahitaji',
      'Simulation Day': 'Siku ya Kifanisi',
      'Growth Stage': 'Hatua ya Ukuaji',
      'Crop Type': 'Aina ya Zao',
      'Water applied today (Liters)': 'Maji yaliyowekwa leo (Lita)',
      'Fertilizer applied today (Kg)': 'Mbolea iliyowekwa leo (Kilo)',
      'Select Field': 'Chagua Shamba',
      'Farmer Name': 'Jina la Mkulima',
      'Farm Location / District': 'Mahali / Wilaya ya Shamba',
      'Farm Size (Acres)': 'Ukubwa wa Shamba (Acres)',
      'Soil Composition': 'Aina ya Udongo',
      'Current Crop Type': 'Aina ya Zao la Sasa',
      'Has Drip Irrigation System?': 'Je, una Umwagiliaji wa Matone?',
      'e.g. 5': 'mfano 5',
      'Enter your name': 'Weka jina lako',
      '🎮 Step Simulation': '🎮 Sogeza Kifanisi Siku Moja',
      '💾 Save & Sync Profile': '💾 Hifadhi Wasifu',
      '🎮 Run Simulation': '🎮 Endesha Kifanisi',
      '💧 Log Irrigation Action': '💧 Rekodi Umwagiliaji',
      '🐛 Trigger Treatment': '🐛 Anzisha Matibabu'
    },
    'Telugu': {
      'Crop Health Telemetry': 'పంట ఆరోగ్య సమాచారం',
      'Interactive Irrigation Planner': 'నీటి యాజమాన్య ప్రణాళిక',
      'Real-time Pest & Disease Alert': 'సమయానికి తెగుళ్లు & వ్యాధుల హెచ్చరిక',
      'Mandi Market Price Insights': 'మార్కెట్ ధరల వివరాలు',
      'Interactive Crop Growth Simulator': 'పంట పెరుగుదల సిమ్యులేటర్',
      'Voice-First Agronomic Assistant': 'వాయిస్ వ్యవసాయ సహాయకుడు',
      'Farmer Digital Twin Profile': 'రైతు డిజిటల్ ప్రొఫైల్',
      'Soil Moisture': 'నేల తేమ శాతం',
      'Soil Temperature': 'నేల ఉష్ణోగ్రత',
      'Nitrogen Level (N)': 'నత్రజని స్థాయి (N)',
      'Crop Health Index': 'పంట ఆరోగ్య సూచిక',
      'Weather Risk': 'వాతావరణ ముప్పు',
      'Water Balance': 'నీటి సమతుల్యత',
      'Soil Dryness': 'నేల పొడిబారడం',
      'Target Moisture': 'లక్ష్య తేమ',
      'Pest Risk Index': 'పురుగుల ముప్పు సూచిక',
      'Critical Crop Stage': 'ముఖ్యమైన పంట దశ',
      'Active Pest Type': 'ప్రస్తుత పురుగు రకం',
      'Recommended Action': 'సిఫార్సు చేసిన చర్య',
      'Wheat Mandi Price': 'గోధుమ మార్కెట్ ధర',
      'Market Trend': 'మార్కెట్ ట్రెండ్',
      'Arrival Volume (Tons)': 'వచ్చిన సరుకు (టన్నులు)',
      'Demand Level': 'డిమాండ్ స్థాయి',
      'Simulation Day': 'సిమ్యులేషన్ రోజు',
      'Growth Stage': 'పెరుగుదల దశ',
      'Crop Type': 'పంట రకం',
      'Water applied today (Liters)': 'ఈరోజు పోసిన నీరు (లీటర్లు)',
      'Fertilizer applied today (Kg)': 'ఈరోజు వేసిన ఎరువు (కేజీలు)',
      'Select Field': 'పొలాన్ని ఎంచుకోండి',
      'Farmer Name': 'రైతు పేరు',
      'Farm Location / District': 'పొలం ఉన్న ప్రాంతం / జిల్లా',
      'Farm Size (Acres)': 'పొలం పరిమాణం (ఎకరాలు)',
      'Soil Composition': 'నేల రకం',
      'Current Crop Type': 'ప్రస్తుత పంట రకం',
      'Has Drip Irrigation System?': 'డ్రిప్ ఇరిగేషన్ ఉందా?',
      'e.g. 5': 'ఉదా. 5',
      'Enter your name': 'మీ పేరు నమోదు చేయండి',
      '🎮 Step Simulation': '🎮 సిమ्यులేషన్ ముందుకు జరపండి',
      '💾 Save & Sync Profile': '💾 ప్రొఫైల్ సేవ్ చేయి',
      '🎮 Run Simulation': '🎮 సిమ్యులేషన్‌ను రన్ చేయి',
      '💧 Log Irrigation Action': '💧 నీటి యాక్షన్ ను నమోదు చేయి',
      '🐛 Trigger Treatment': '🐛 ట్రీట్‌మెంట్ ప్రారంభించు'
    }
  };

  function translateSchemaData(obj, lang) {
    const dict = SCHEMA_TRANSLATIONS[lang];
    if (!dict) return;

    function recurse(o) {
      if (typeof o !== 'object' || o === null) return;
      
      // Translate in-place keys
      if (o.title && dict[o.title]) o.title = dict[o.title];
      if (o.value && typeof o.value === 'string' && dict[o.value]) o.value = dict[o.value];
      if (o.label && dict[o.label]) o.label = dict[o.label];
      if (o.placeholder && dict[o.placeholder]) o.placeholder = dict[o.placeholder];
      if (o.text && dict[o.text]) o.text = dict[o.text];
      
      // Check recursive children
      for (const k in o) {
        if (typeof o[k] === 'object') {
          recurse(o[k]);
        }
      }
    }
    recurse(obj);
  }

  function applyLanguageTranslation(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['English'];
    
    // 1. Translate workspace nav tabs
    const navLinks = document.querySelectorAll('#dashboard-nav .tab-btn');
    navLinks.forEach(link => {
      const schemaName = link.getAttribute('data-schema');
      const key = `nav_${schemaName}`;
      if (dict[key]) {
        link.textContent = dict[key];
      }
    });
    
    // 2. Translate Chat title
    const chatTitle = document.querySelector('.chat-header h2');
    if (chatTitle && dict['title_chat']) {
      chatTitle.textContent = dict['title_chat'];
    }
    
    // 3. Translate Chat input placeholder
    if (userInputField && dict['chat_placeholder']) {
      userInputField.placeholder = dict['chat_placeholder'];
    }
    
    // 4. Translate Send Button
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn && dict['btn_send']) {
      sendBtn.textContent = dict['btn_send'];
    }
    
    // 5. Translate Auto-Speak Toggle Label
    const ttsToggle = document.getElementById('tts-toggle');
    if (ttsToggle) {
      const label = ttsToggle.parentElement;
      if (label) {
        label.innerHTML = '';
        label.appendChild(ttsToggle);
        label.appendChild(document.createTextNode(' 🔊 ' + (dict['btn_speak'] || 'Auto-Speak')));
      }
    }
    
    // 6. Update online badge text
    updateAgentsStatus();
  }

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
    try {
      const resp = await fetch('http://127.0.0.1:8080/apps/app/users/user/sessions', {
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

  let audioPlayer = null;

  // Client-Side Speech Synthesis with Backend Neural Male Voice Fallback
  async function speakText(text) {
    const ttsToggle = document.getElementById('tts-toggle');
    if (ttsToggle && !ttsToggle.checked) return;

    // Instantly cancel any ongoing speech playback thread
    window.speechSynthesis.cancel();
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
    }

    const preferredLang = document.getElementById('language-selector')?.value || 'English';
    const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/[*#_]/g, '');

    const voiceLangMap = {
      'Hindi': 'hi-IN',
      'Marathi': 'mr-IN',
      'Telugu': 'te-IN',
      'Swahili': 'sw-KE',
      'English': 'en-US'
    };
    const targetLangCode = voiceLangMap[preferredLang] || 'en-US';

    // Scan for high-quality local system voice packs and prioritize male voices
    const voices = window.speechSynthesis.getVoices();
    const langVoices = voices.filter(v => v.lang.startsWith(targetLangCode));

    const maleKeywords = ['male', 'david', 'mark', 'ravi', 'rishi', 'mohan', 'karan', 'madhur', 'hemant', 'alex', 'fred', 'daniel', 'nathan', 'oliver', 'george', 'microsoft'];
    const femaleKeywords = ['samantha', 'siri', 'veena', 'heera', 'kalpana', 'neerja', 'zira', 'hazel', 'susan', 'linda', 'helen', 'zari', 'female'];

    let preferredVoice = langVoices.find(v => {
      const nameLower = v.name.toLowerCase();
      return maleKeywords.some(kw => nameLower.includes(kw)) && !femaleKeywords.some(fw => nameLower.includes(fw));
    });

    if (preferredVoice) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = targetLangCode;
      utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback: Fetch high-fidelity neural MALE voice from FastAPI backend /api/tts!
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: preferredLang, text: cleanText })
        });
        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          audioPlayer = new Audio(audioUrl);
          audioPlayer.play();
        } else {
          console.warn("Backend TTS responded with error status:", response.status);
        }
      } catch (err) {
        console.warn("Backend TTS playback failed:", err);
      }
    }
  }

  // Appends a new message bubble to the chat timeline, complete with a client-side speaker button
  function appendMessage(sender, text, type = 'msg') {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;

    const textSpan = document.createElement('span');
    textSpan.className = 'message-text';
    textSpan.innerHTML = text;

    const displayName = sender === 'Coordinator' ? 'Krishi Sastri' : sender;
    msg.appendChild(document.createElement('strong')).textContent = `${displayName}: `;
    msg.appendChild(textSpan);

    if (type === 'agent-msg' || type === 'user-msg') {
      const speakBtn = document.createElement('button');
      speakBtn.className = 'speak-msg-btn';
      speakBtn.innerHTML = '🔊';
      speakBtn.title = "Speak out loud (Client-side)";
      speakBtn.style.background = 'none';
      speakBtn.style.border = 'none';
      speakBtn.style.cursor = 'pointer';
      speakBtn.style.marginLeft = '0.5rem';
      speakBtn.addEventListener('click', () => speakText(textSpan.innerText));
      msg.appendChild(speakBtn);
    }

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
    
    const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(codeBlockRegex);
    if (match) {
      try {
        const rawJson = repairJSON(match[1].trim());
        const data = JSON.parse(rawJson);
        if (data.type === 'card' && Array.isArray(data.components)) {
          const currentLang = localStorage.getItem('aaa_preferred_language') || 'English';
          translateSchemaData(data, currentLang);

          if (data.title && data.title.toLowerCase().includes('simulator')) {
            bindSimulationState(data);
          }
          window.renderA2UIPayload(data, aguiCanvas);
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
          const currentLang = localStorage.getItem('aaa_preferred_language') || 'English';
          translateSchemaData(data, currentLang);

          if (data.title && data.title.toLowerCase().includes('simulator')) {
            bindSimulationState(data);
          }
          window.renderA2UIPayload(data, aguiCanvas);
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

  // Load static or stored schema
  async function loadSchema(schemaName) {
    try {
      const response = await fetch(`../schemas/${schemaName}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }
      const data = await response.json();
      
      const currentLang = localStorage.getItem('aaa_preferred_language') || 'English';
      translateSchemaData(data, currentLang);

      if (schemaName === 'simulation') {
        bindSimulationState(data);
      } else if (schemaName === 'farmer_profile') {
        bindProfileState(data);
      }
      window.renderA2UIPayload(data, aguiCanvas);
      updateActiveTabHighlight(schemaName);
    } catch (err) {
      aguiCanvas.innerHTML = `<div style="color:var(--trend-down);padding:1rem;">Error rendering panel: ${err.message}</div>`;
    }
  }

  // Update status text on the Chat Header
  function updateAgentsStatus() {
    const indicator = document.getElementById('agents-status-indicator');
    const text = document.getElementById('agents-status-text');
    if (!indicator || !text) return;
    
    const currentLang = localStorage.getItem('aaa_preferred_language') || 'English';
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['English'];
    
    indicator.className = 'status-indicator online';
    indicator.style.backgroundColor = 'var(--accent)';
    text.textContent = dict['status_online'] || 'Agents Online';
  }

  // Relational Farm State (SQLite Twin)
  let activeFields = [];
  let activeFieldId = '';
  let activePlantingId = '';

  async function fetchFieldsAndProfile() {
    try {
      const response = await fetch('/api/profile/user');
      if (!response.ok) throw new Error("Database not loaded");
      const profile = await response.json();
      
      activeFields = profile.fields || [];
      
      // Sync language selector with database value
      const languageSelector = document.getElementById('language-selector');
      if (languageSelector && profile.language) {
        languageSelector.value = profile.language;
        localStorage.setItem('aaa_preferred_language', profile.language);
        applyLanguageTranslation(profile.language);
      }
      
      // Populate field-selector dropdown
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
    } catch (e) {
      console.warn("SQLite database not accessible, running in purely local demo state.", e);
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

    const thinkingBubble = appendMessage('Coordinator', 'Thinking...', 'thinking-msg');

    // Context Enrichment: Grab the saved profile and prepend it to the text payload!
    const savedProfile = localStorage.getItem('aaa_farmer_profile');
    const preferredLang = document.getElementById('language-selector')?.value || 'English';
    let textToSend = text;
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        textToSend = `[Context: Farmer Name: ${profile.farmer_name || 'unnamed'}, Language: ${preferredLang}, Location: ${profile.region}, Acres: ${profile.acres}, Soil: ${profile.soil_type}, Crop: ${profile.primary_crop}, Drip Irrigation: ${profile.has_drip}]\n\n${text}`;
      } catch (e) {
        textToSend = `[Context: Language: ${preferredLang}]\n\n${text}`;
      }
    } else {
      textToSend = `[Context: Language: ${preferredLang}]\n\n${text}`;
    }

    try {
      const activeSessionId = await getSessionId();
      const response = await fetch('http://127.0.0.1:8080/run_sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: 'app',
          user_id: 'user',
          session_id: activeSessionId,
          new_message: {
            parts: [{ text: textToSend }]
          },
          streaming: true
        })
      });

      if (!response.ok) {
        throw new Error(`Agent response error: ${response.statusText}`);
      }

      thinkingBubble.remove();
      
      const responseMsg = appendMessage('Coordinator', '', 'agent-msg');
      const textContainer = responseMsg.querySelector('.message-text');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponseText = '';

      function getStreamingCleanText(text) {
        if (!text) return "";
        const fenceIndex = text.indexOf('```json');
        if (fenceIndex !== -1) {
          return text.substring(0, fenceIndex).trim();
        }
        const cardIndex = text.indexOf('"type": "card"');
        if (cardIndex !== -1) {
          const sub = text.substring(0, cardIndex);
          const braceIndex = sub.lastIndexOf('{');
          if (braceIndex !== -1) {
            return text.substring(0, braceIndex).trim();
          }
        }
        return text;
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.trim().substring(6));
              if (eventData.content && eventData.content.parts) {
                if (eventData.partial === false) {
                  // If it is the final consolidated message, overwrite the accumulator to prevent duplicate paragraph appends
                  let consolidatedText = "";
                  for (const part of eventData.content.parts) {
                    if (part.text) {
                      consolidatedText += part.text;
                    }
                  }
                  if (consolidatedText) {
                    fullResponseText = consolidatedText;
                  }
                } else {
                  // It's an incremental delta chunk, append it to the accumulator
                  for (const part of eventData.content.parts) {
                    if (part.text) {
                      fullResponseText += part.text;
                    }
                  }
                }
                textContainer.innerHTML = markdownToHtml(getStreamingCleanText(fullResponseText));
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            } catch (err) {
              // Ignore
            }
          }
        }
      }

      const cleanResponse = getStreamingCleanText(fullResponseText);
      textContainer.innerHTML = markdownToHtml(cleanResponse);

      // Trigger auto-speak if checked
      const ttsToggle = document.getElementById('tts-toggle');
      if (ttsToggle && ttsToggle.checked) {
        speakText(cleanResponse);
      }

      // Check if response contains raw JSON card
      const renderedInline = detectAndRenderA2UI(fullResponseText);
      
      if (!renderedInline && window.panelRouter) {
        const targetSchema = window.panelRouter.routeIntent(fullResponseText);
        if (targetSchema) {
          loadSchema(targetSchema);
          showToast("Workspace Synced", `Panel switched to ${targetSchema.replace('_', ' ')} based on advisor reply.`, "success");
        }
      }

      // Handle toast triggers
      if (fullResponseText.toLowerCase().includes('outbreak') || fullResponseText.toLowerCase().includes('disease')) {
        showToast("Pest Warning", "Regional active disease risk detected on leaf samples.", "danger");
      } else if (fullResponseText.toLowerCase().includes('water') && fullResponseText.toLowerCase().includes('critical')) {
        showToast("Irrigation Alert", "Soil moisture dropping below critical limit. Watering advised.", "warning");
      }

    } catch (err) {
      thinkingBubble.remove();
      appendMessage('System', `Connection failed: ${err.message}. Ensure agents-cli playground is running on port 8080.`, 'error-msg');
    }
  }

  // Load default crop dashboard schema on startup
  loadSchema('crop_dashboard');
  fetchFieldsAndProfile();
  
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
      const activeTab = document.querySelector('#dashboard-nav .tab-btn.active');
      if (activeTab) {
        loadSchema(activeTab.getAttribute('data-schema'));
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
    const savedLang = localStorage.getItem('aaa_preferred_language') || 'English';
    languageSelector.value = savedLang;
    applyLanguageTranslation(savedLang);
    
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
      
      // Reload current active tab schema to translate the dynamic widget canvas!
      const activeTab = document.querySelector('#dashboard-nav .tab-btn.active');
      if (activeTab) {
        const schemaName = activeTab.getAttribute('data-schema');
        loadSchema(schemaName);
      }
      
      // Notify the agent in the chat in the target language only
      const alertPrompt = languageAlerts[selectedLang] || languageAlerts["English"];
      userInputField.value = alertPrompt;
      handleSend();
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
          audioPlayer = null;
        }
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

  // Set up Segment tab click triggers
  const navTabs = document.querySelectorAll('#dashboard-nav .tab-btn');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const schemaName = tab.getAttribute('data-schema');
      loadSchema(schemaName);
    });
  });

  function updateActiveTabHighlight(schemaName) {
    navTabs.forEach(tab => {
      if (tab.getAttribute('data-schema') === schemaName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

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
      const metrics = aguiCanvas.querySelectorAll('.a2ui-metric');
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
      
      const stepBtn = aguiCanvas.querySelector('.a2ui-btn');
      if (stepBtn && stepBtn.textContent.includes('Step Simulation')) {
        stepBtn.textContent = `🎮 Step Simulation (Day ${simState.day + 1})`;
      }
      
      showToast("Simulation Stepped", `Advanced to Day ${simState.day}. Health is ${simState.health.toFixed(1)}%`, "success");
      
      // Notify agent of the new state in the conversation context
      const statusPrompt = `Simulation Advanced: Day ${simState.day}, Crop: ${cropType}, Stage: ${simState.stage}, Soil Moisture: ${simState.soilMoisture.toFixed(1)}%, Crop Health: ${simState.health.toFixed(1)}%, Pest Level: ${simState.pestIndex.toFixed(1)}%. Advise on irrigation or nutrient needs.`;
      
      if (activePlantingId) {
        fetch(`/api/telemetry/${activePlantingId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moisture_pct: simState.soilMoisture,
            health_pct: simState.health,
            nitrogen_ppm: 45.0
          })
        }).then(() => {
          fetchFieldsAndProfile();
        });
      }

      userInputField.value = statusPrompt;
      handleSend();
    } else if (action === 'save_farmer_profile') {
      const form = aguiCanvas.querySelector('form') || aguiCanvas.querySelector('.a2ui-form');
      const profile = {};
      if (form) {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
          if (input.name) {
            profile[input.name] = input.value;
          }
        });
      }
      
      localStorage.setItem('aaa_farmer_profile', JSON.stringify(profile));
      
      fetch('/api/profile/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
      .then(res => res.json())
      .then(data => {
        showToast("Profile Synced", "Farmer profile saved locally and synced with advisors.", "success");
        fetchFieldsAndProfile();
      });
      
      const prompt = `Profile updated: saved profile details for farmer. Name is ${profile.farmer_name || 'unnamed'}, Location is ${profile.region}, Size is ${profile.acres} acres, Soil is ${profile.soil_type}, Crop is ${profile.primary_crop}, Drip Irrigation is ${profile.has_drip}. Please acknowledge and update your advisory guidelines.`;
      userInputField.value = prompt;
      handleSend();
    } else {
      // General Form Submission to Agent
      const form = aguiCanvas.querySelector('form') || aguiCanvas.querySelector('.a2ui-form');
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

  // Event handlers
  sendBtn.addEventListener('click', handleSend);
  userInputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
});
