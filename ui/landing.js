(() => {
  const modal = document.getElementById('guest-modal');
  const guestEmail = document.getElementById('guest-email');
  const guestName = document.getElementById('guest-name');
  const guestRegion = document.getElementById('guest-region');
  const guestSoil = document.getElementById('guest-soil');
  const guestAcres = document.getElementById('guest-acres');
  const guestCrop = document.getElementById('guest-crop');
  const guestError = document.getElementById('guest-error');
  const languageSelector = document.getElementById('language-selector');
  const headerGoogleFallback = document.getElementById('header-google-fallback');
  const heroGoogleFallback = document.getElementById('hero-google-fallback');
  const authStatus = document.getElementById('auth-status');

  const EN = {
    'landing.header.brandTitle': 'Krishi Sampark',
    'landing.header.brandSubtitle': 'Smart farming help in your language',
    'landing.header.navAbout': 'About',
    'landing.header.navFeatures': 'Features',
    'landing.header.navHowItWorks': 'How It Works',
    'landing.header.navSafetyTrust': 'Safety & Trust',
    'landing.header.navContact': 'Contact',

    'landing.hero.title': 'Your farming companion for better decisions',
    'landing.hero.description': 'Ask questions, check crop problems, understand soil reports, plan irrigation, and view mandi prices in your own language.',
    'landing.hero.continueAsGuest': 'Continue as Guest',
    'landing.hero.signInWithGoogle': 'Sign in with Google',
    'landing.hero.voiceAssistTitle': 'Voice Assist',
    'landing.hero.voiceAssistText': 'Tap mic and ask your farming question in your language',
    'landing.hero.trustNote': 'No technical knowledge required. Built for farmers, students, and agriculture advisors.',
    'landing.hero.chipVoice': 'Voice questions',
    'landing.hero.chipPhoto': 'Photo crop check',
    'landing.hero.chipMarket': 'Live mandi trends',
    'landing.hero.trustPanelTitle': 'Works even with limited internet',
    'landing.hero.trust1': 'Local language support (5+ languages)',
    'landing.hero.trust2': 'Offline-first - your data stays safe',
    'landing.hero.trust3': 'Safety-checked advice for fertilizers & pesticides',
    'landing.hero.trust4': 'Expert help for complex issues',
    'landing.hero.trust5': 'Privacy aware - your data is protected',

    'landing.auth.guestTitle': 'Tell us about your farm',
    'landing.auth.guestMessage': 'Just a few details so we can give you the best farming advice. Your data stays on this device.',
    'landing.auth.nameLabel': 'Your Name',
    'landing.auth.emailLabel': 'Email',
    'landing.auth.regionLabel': 'Location',
    'landing.auth.soilLabel': 'Soil Type',
    'landing.auth.acresLabel': 'Field Size (Acres)',
    'landing.auth.cropLabel': 'Primary Crop',
    'landing.auth.selectPlaceholder': 'Select...',
    'landing.auth.continue': 'Start Advising',
    'landing.auth.skip': 'Skip for now',
    'landing.auth.close': 'Close',
    'landing.auth.invalidEmail': 'Please enter a valid email or leave it blank.',
    'landing.auth.guestError': 'Unable to continue as guest. Please try again.',
    'landing.auth.signingInSecurely': 'Signing you in securely...',
    'landing.auth.nameRequired': 'Please enter your name.',
    'landing.auth.regionRequired': 'Please select your region.',
    'landing.auth.soilRequired': 'Please select your soil type.',
    'landing.auth.acresRequired': 'Please enter your field size in acres.',
    'landing.auth.cropRequired': 'Please select your primary crop.',

    'landing.features.askTitle': 'Ask or Speak to Krishi Sastri',
    'landing.features.askDescription': 'Ask by text or voice and get simple answers for crop, water, fertilizer, and pest questions.',
    'landing.features.photoTitle': 'Crop Photo Check',
    'landing.features.photoDescription': 'Take a photo and get guided help for crop health problems.',
    'landing.features.soilTitle': 'Soil Report',
    'landing.features.soilDescription': 'Upload a soil test report and understand what it means in simple words.',
    'landing.features.marketTitle': 'Mandi Prices',
    'landing.features.marketDescription': 'Check daily market prices and trends in your local market.',
    'landing.features.planTitle': "Today's Farm Plan",
    'landing.features.planDescription': "See simple recommended actions for today's farm activities.",
    'landing.features.expertTitle': 'Expert Help',
    'landing.features.expertDescription': 'Escalate complex issues to agriculture experts for support.',

    'landing.howItWorks.title': 'How it works',
    'landing.howItWorks.summary': 'Three quick steps to get simple farm guidance from a photo, voice, or text question.',
    'landing.howItWorks.step1Title': 'Tell us about your farm',
    'landing.howItWorks.step1Description': 'Add your crop, location, soil type, and farm details.',
    'landing.howItWorks.step2Title': 'Ask, upload, or take a photo',
    'landing.howItWorks.step2Description': 'Ask questions, upload soil report, or take a photo of your crop.',
    'landing.howItWorks.step3Title': 'Get simple guidance and next actions',
    'landing.howItWorks.step3Description': 'Receive easy advice, safety-checked recommendations, and follow next steps.',

    'landing.trust.title': 'Made for real farming conditions',
    'landing.trust.offlineTitle': 'Offline-first',
    'landing.trust.offlineDescription': 'Works with limited internet',
    'landing.trust.languageTitle': 'Local languages',
    'landing.trust.languageDescription': 'Speak your own language',
    'landing.trust.farmerFriendlyTitle': 'Farmer friendly',
    'landing.trust.farmerFriendlyDescription': 'Easy words, simple recommendations',
    'landing.trust.safetyTitle': 'Safety first',
    'landing.trust.safetyDescription': 'Checked advice for fertilizers and pesticides',
    'landing.trust.expertTitle': 'Expert network',
    'landing.trust.expertDescription': 'Human experts for complex cases',
    'landing.trust.privacyTitle': 'Privacy protected',
    'landing.trust.privacyDescription': 'Your data is safe and secure',

    'landing.capstone.title': 'Krishi Sampark Platform',
    'landing.capstone.description': 'Capstone demo platform for offline-first agriculture intelligence with multilingual guidance, safety-checked recommendations, and expert escalation support.',

    'landing.footer.brandTitle': 'Krishi Sampark',
    'landing.footer.brandSubtitle': 'Smart farming help in your language',
    'landing.footer.about': 'About Us',
    'landing.footer.privacy': 'Privacy Policy',
    'landing.footer.terms': 'Terms of Use',
    'landing.footer.help': 'Help',
    'landing.footer.contact': 'Contact Us',
    'landing.footer.copyright': '© 2025 Krishi Sampark. All rights reserved.'
  };

  const HI = {
    'landing.header.brandTitle': 'कृषि संपर्क',
    'landing.header.brandSubtitle': 'अपनी भाषा में स्मार्ट कृषि सहायता',
    'landing.header.navAbout': 'बारे में',
    'landing.header.navFeatures': 'विशेषताएँ',
    'landing.header.navHowItWorks': 'कैसे काम करता है',
    'landing.header.navSafetyTrust': 'सुरक्षा और विश्वास',
    'landing.header.navContact': 'संपर्क',

    'landing.hero.title': 'बेहतर निर्णयों के लिए आपका कृषि साथी',
    'landing.hero.description': 'अपनी भाषा में सवाल पूछें, फसल की समस्याएँ जानें, मिट्टी रिपोर्ट समझें, सिंचाई की योजना बनाएँ और मंडी भाव देखें।',
    'landing.hero.continueAsGuest': 'अतिथि के रूप में जारी रखें',
    'landing.hero.signInWithGoogle': 'Google से साइन इन करें',
    'landing.hero.voiceAssistTitle': 'वॉइस असिस्ट',
    'landing.hero.voiceAssistText': 'माइक दबाएँ और अपनी भाषा में कृषि सवाल पूछें',
    'landing.hero.trustNote': 'कोई तकनीकी ज्ञान आवश्यक नहीं। किसानों, छात्रों और कृषि सलाहकारों के लिए बनाया गया।',
    'landing.hero.chipVoice': 'वॉइस सवाल',
    'landing.hero.chipPhoto': 'फसल फोटो जांच',
    'landing.hero.chipMarket': 'लाइव मंडी रुझान',
    'landing.hero.trustPanelTitle': 'सीमित इंटरनेट पर भी काम करता है',
    'landing.hero.trust1': 'स्थानीय भाषा समर्थन (5+ भाषाएँ)',
    'landing.hero.trust2': 'ऑफलाइन-प्रथम - आपका डेटा सुरक्षित रहता है',
    'landing.hero.trust3': 'खाद और कीटनाशक के लिए सुरक्षित सलाह',
    'landing.hero.trust4': 'जटिल मुद्दों के लिए विशेषज्ञ सहायता',
    'landing.hero.trust5': 'गोपनीयता सुरक्षित - आपका डेटा संरक्षित',

    'landing.auth.guestTitle': 'अपने खेत के बारे में बताएं',
    'landing.auth.guestMessage': 'बेहतर कृषि सलाह के लिए कुछ जानकारी दें। आपका डेटा इस डिवाइस पर रहता है।',
    'landing.auth.nameLabel': 'आपका नाम',
    'landing.auth.emailLabel': 'ईमेल',
    'landing.auth.regionLabel': 'स्थान',
    'landing.auth.soilLabel': 'मिट्टी का प्रकार',
    'landing.auth.acresLabel': 'खेत का आकार (एकड़)',
    'landing.auth.cropLabel': 'मुख्य फसल',
    'landing.auth.selectPlaceholder': 'चुनें...',
    'landing.auth.continue': 'सलाह शुरू करें',
    'landing.auth.skip': 'अभी छोड़ें',
    'landing.auth.close': 'बंद करें',
    'landing.auth.invalidEmail': 'कृपया एक मान्य ईमेल दर्ज करें या खाली छोड़ दें।',
    'landing.auth.guestError': 'अतिथि के रूप में जारी नहीं रख सके। कृपया पुनः प्रयास करें।',
    'landing.auth.signingInSecurely': 'सुरक्षित रूप से साइन इन हो रहा है...',
    'landing.auth.nameRequired': 'कृपया अपना नाम दर्ज करें।',
    'landing.auth.regionRequired': 'कृपया अपना क्षेत्र चुनें।',
    'landing.auth.soilRequired': 'कृपया मिट्टी का प्रकार चुनें।',
    'landing.auth.acresRequired': 'कृपया खेत का आकार एकड़ में दर्ज करें।',
    'landing.auth.cropRequired': 'कृपया अपनी मुख्य फसल चुनें।',

    'landing.features.askTitle': 'कृषि शास्त्री से पूछें या बोलें',
    'landing.features.askDescription': 'टेक्स्ट या वॉइस से सवाल पूछें और फसल, पानी, खाद और कीट के सवालों के सरल उत्तर पाएं।',
    'landing.features.photoTitle': 'फसल फोटो जांच',
    'landing.features.photoDescription': 'फोटो लें और फसल स्वास्थ्य समस्याओं के लिए निर्देशित सहायता पाएं।',
    'landing.features.soilTitle': 'मिट्टी रिपोर्ट',
    'landing.features.soilDescription': 'मिट्टी परीक्षण रिपोर्ट अपलोड करें और सरल शब्दों में समझें।',
    'landing.features.marketTitle': 'मंडी भाव',
    'landing.features.marketDescription': 'अपनी स्थानीय मंडी के दैनिक भाव और रुझान देखें।',
    'landing.features.planTitle': 'आज का खेत कार्य योजना',
    'landing.features.planDescription': 'आज के खेत कार्यों के लिए सरल अनुशंसित कार्य देखें।',
    'landing.features.expertTitle': 'विशेषज्ञ सहायता',
    'landing.features.expertDescription': 'जटिल समस्याओं के लिए कृषि विशेषज्ञों को भेजें।',

    'landing.howItWorks.title': 'यह कैसे काम करता है',
    'landing.howItWorks.summary': 'फोटो, वॉइस या टेक्स्ट सवाल से सरल कृषि मार्गदर्शन पाने के तीन आसान कदम।',
    'landing.howItWorks.step1Title': 'अपने खेत के बारे में बताएं',
    'landing.howItWorks.step1Description': 'अपनी फसल, स्थान, मिट्टी प्रकार और खेत की जानकारी जोड़ें।',
    'landing.howItWorks.step2Title': 'पूछें, अपलोड करें या फोटो लें',
    'landing.howItWorks.step2Description': 'सवाल पूछें, मिट्टी रिपोर्ट अपलोड करें या फसल की फोटो लें।',
    'landing.howItWorks.step3Title': 'सरल मार्गदर्शन और अगले कदम पाएं',
    'landing.howItWorks.step3Description': 'आसान सलाह, सुरक्षित अनुशंसाएं और अगले कदम पाएं।',

    'landing.trust.title': 'वास्तविक कृषि परिस्थितियों के लिए बनाया गया',
    'landing.trust.offlineTitle': 'ऑफलाइन-प्रथम',
    'landing.trust.offlineDescription': 'सीमित इंटरनेट पर काम करता है',
    'landing.trust.languageTitle': 'स्थानीय भाषाएँ',
    'landing.trust.languageDescription': 'अपनी भाषा बोलें',
    'landing.trust.farmerFriendlyTitle': 'किसान के अनुकूल',
    'landing.trust.farmerFriendlyDescription': 'आसान शब्द, सरल अनुशंसाएं',
    'landing.trust.safetyTitle': 'सुरक्षा प्रथम',
    'landing.trust.safetyDescription': 'खाद और कीटनाशक के लिए जांची गई सलाह',
    'landing.trust.expertTitle': 'विशेषज्ञ नेटवर्क',
    'landing.trust.expertDescription': 'जटिल मामलों के लिए मानव विशेषज्ञ',
    'landing.trust.privacyTitle': 'गोपनीयता संरक्षित',
    'landing.trust.privacyDescription': 'आपका डेटा सुरक्षित और संरक्षित',

    'landing.capstone.title': 'कृषि संपर्क प्लेटफॉर्म',
    'landing.capstone.description': 'बहुभाषी मार्गदर्शन, सुरक्षित अनुशंसाएं और विशेषज्ञ सहायता के साथ ऑफलाइन-प्रथम कृषि बुद्धिमत्ता प्लेटफॉर्म।',

    'landing.footer.brandTitle': 'कृषि संपर्क',
    'landing.footer.brandSubtitle': 'अपनी भाषा में स्मार्ट कृषि सहायता',
    'landing.footer.about': 'हमारे बारे में',
    'landing.footer.privacy': 'गोपनीयता नीति',
    'landing.footer.terms': 'उपयोग की शर्तें',
    'landing.footer.help': 'सहायता',
    'landing.footer.contact': 'संपर्क करें',
    'landing.footer.copyright': '© 2025 कृषि संपर्क। सर्वाधिकार सुरक्षित।'
  };

  const MR = {
    'landing.header.brandTitle': 'कृषी संपर्क',
    'landing.header.brandSubtitle': 'तुमच्या भाषेत स्मार्ट शेती मदत',
    'landing.header.navAbout': 'बद्दल',
    'landing.header.navFeatures': 'वैशिष्ट्ये',
    'landing.header.navHowItWorks': 'कसे काम करते',
    'landing.header.navSafetyTrust': 'सुरक्षा आणि विश्वास',
    'landing.header.navContact': 'संपर्क',

    'landing.hero.title': 'चांगल्या निर्णयांसाठी तुमचा शेती सोबती',
    'landing.hero.description': 'तुमच्या भाषेत प्रश्न विचारा, पीक समस्या तपासा, माती अहवाल समजा, सिंचन नियोजन करा आणि मंडी भाव पहा.',
    'landing.hero.continueAsGuest': 'पाहुण्या म्हणून सुरू ठेवा',
    'landing.hero.signInWithGoogle': 'Google सह साइन इन करा',
    'landing.hero.voiceAssistTitle': 'व्हॉइस असिस्ट',
    'landing.hero.voiceAssistText': 'माइक दाबा आणि तुमच्या भाषेत शेती प्रश्न विचारा',
    'landing.hero.trustNote': 'कोणतेही तांत्रिक ज्ञान आवश्यक नाही. शेतकऱ्यांसाठी, विद्यार्थ्यांसाठी आणि कृषी सल्लागारांसाठी बनवले.',
    'landing.hero.chipVoice': 'व्हॉइस प्रश्न',
    'landing.hero.chipPhoto': 'पीक फोटो तपासणी',
    'landing.hero.chipMarket': 'लाइव्ह मंडी ट्रेंड',
    'landing.hero.trustPanelTitle': 'मर्यादित इंटरनेटवरही काम करते',
    'landing.hero.trust1': 'स्थानिक भाषा समर्थन (5+ भाषा)',
    'landing.hero.trust2': 'ऑफलाइन-फर्स्ट - तुमचा डेटा सुरक्षित',
    'landing.hero.trust3': 'खत आणि कीटकनाशकासाठी सुरक्षित सल्ला',
    'landing.hero.trust4': 'गुंतागुंतीच्या समस्यांसाठी तज्ज्ञ मदत',
    'landing.hero.trust5': 'गोपनीयता जपलेली - तुमचा डेटा संरक्षित',

    'landing.auth.guestTitle': 'तुमच्या शेताबद्दल सांगा',
    'landing.auth.guestMessage': 'चांगल्या कृषी सल्ल्यासाठी काही माहिती द्या. तुमचा डेटा या डिव्हाइसवर राहतो.',
    'landing.auth.nameLabel': 'तुमचे नाव',
    'landing.auth.emailLabel': 'ईमेल',
    'landing.auth.regionLabel': 'स्थान',
    'landing.auth.soilLabel': 'मातीचा प्रकार',
    'landing.auth.acresLabel': 'शेताचा आकार (एकर)',
    'landing.auth.cropLabel': 'मुख्य पीक',
    'landing.auth.selectPlaceholder': 'निवडा...',
    'landing.auth.continue': 'सल्ला सुरू करा',
    'landing.auth.skip': 'आत्ता सोडा',
    'landing.auth.close': 'बंद करा',
    'landing.auth.invalidEmail': 'कृपया वैध ईमेल टाका किंवा रिकामी सोडा.',
    'landing.auth.guestError': 'पाहुण्या म्हणून सुरू ठेवता आले नाही. पुन्हा प्रयत्न करा.',
    'landing.auth.signingInSecurely': 'सुरक्षितपणे साइन इन होत आहे...',
    'landing.auth.nameRequired': 'कृपया तुमचे नाव टाका.',
    'landing.auth.regionRequired': 'कृपया तुमचा प्रदेश निवडा.',
    'landing.auth.soilRequired': 'कृपया मातीचा प्रकार निवडा.',
    'landing.auth.acresRequired': 'कृपया शेताचा आकार एकरमध्ये टाका.',
    'landing.auth.cropRequired': 'कृपया तुमचे मुख्य पीक निवडा.',

    'landing.features.askTitle': 'कृषी शास्त्रीला विचारा किंवा बोला',
    'landing.features.askDescription': 'टेक्स्ट किंवा व्हॉइसने प्रश्न विचारा आणि पीक, पाणी, खत आणि कीटकांच्या प्रश्नांची सोपी उत्तरे मिळवा.',
    'landing.features.photoTitle': 'पीक फोटो तपासणी',
    'landing.features.photoDescription': 'फोटो घ्या आणि पीक आरोग्य समस्यांसाठी मार्गदर्शन मिळवा.',
    'landing.features.soilTitle': 'माती अहवाल',
    'landing.features.soilDescription': 'माती चाचणी अहवाल अपलोड करा आणि सोप्या शब्दांत समजा.',
    'landing.features.marketTitle': 'मंडी भाव',
    'landing.features.marketDescription': 'तुमच्या स्थानिक मंडीतील दैनिक भाव आणि ट्रेंड पहा.',
    'landing.features.planTitle': 'आजची शेत कार्य योजना',
    'landing.features.planDescription': 'आजच्या शेत कार्यांसाठी सोपी शिफारसी पहा.',
    'landing.features.expertTitle': 'तज्ज्ञ मदत',
    'landing.features.expertDescription': 'गुंतागुंतीच्या समस्यांसाठी कृषी तज्ज्ञांना पाठवा.',

    'landing.howItWorks.title': 'हे कसे काम करते',
    'landing.howItWorks.summary': 'फोटो, व्हॉइस किंवा टेक्स्ट प्रश्नातून सोपे कृषी मार्गदर्शन मिळवण्याचे तीन सोपे पाऊल.',
    'landing.howItWorks.step1Title': 'तुमच्या शेताबद्दल सांगा',
    'landing.howItWorks.step1Description': 'तुमचे पीक, स्थान, माती प्रकार आणि शेताची माहिती जोडा.',
    'landing.howItWorks.step2Title': 'विचारा, अपलोड करा किंवा फोटो घ्या',
    'landing.howItWorks.step2Description': 'प्रश्न विचारा, माती अहवाल अपलोड करा किंवा पिकाचा फोटो घ्या.',
    'landing.howItWorks.step3Title': 'सोपे मार्गदर्शन आणि पुढील पाऊल मिळवा',
    'landing.howItWorks.step3Description': 'सोपी सल्ला, सुरक्षित शिफारसी आणि पुढील पाऊल मिळवा.',

    'landing.trust.title': 'खऱ्या शेती परिस्थितीसाठी बनवले',
    'landing.trust.offlineTitle': 'ऑफलाइन-फर्स्ट',
    'landing.trust.offlineDescription': 'मर्यादित इंटरनेटवर काम करते',
    'landing.trust.languageTitle': 'स्थानिक भाषा',
    'landing.trust.languageDescription': 'तुमची भाषा बोला',
    'landing.trust.farmerFriendlyTitle': 'शेतकऱ्यांना अनुकूल',
    'landing.trust.farmerFriendlyDescription': 'सोपे शब्द, सरळ शिफारसी',
    'landing.trust.safetyTitle': 'सुरक्षा प्रथम',
    'landing.trust.safetyDescription': 'खत आणि कीटकनाशकासाठी तपासलेली सल्ला',
    'landing.trust.expertTitle': 'तज्ज्ञ नेटवर्क',
    'landing.trust.expertDescription': 'गुंतागुंतीच्या प्रकरणांसाठी मानवी तज्ज्ञ',
    'landing.trust.privacyTitle': 'गोपनीयता संरक्षित',
    'landing.trust.privacyDescription': 'तुमचा डेटा सुरक्षित',

    'landing.capstone.title': 'कृषी संपर्क प्लॅटफॉर्म',
    'landing.capstone.description': 'बहुभाषिक मार्गदर्शन, सुरक्षित शिफारसी आणि तज्ज्ञ सहाय्यासह ऑफलाइन-फर्स्ट कृषी बुद्धिमत्ता प्लॅटफॉर्म.',

    'landing.footer.brandTitle': 'कृषी संपर्क',
    'landing.footer.brandSubtitle': 'तुमच्या भाषेत स्मार्ट शेती मदत',
    'landing.footer.about': 'आमच्याबद्दल',
    'landing.footer.privacy': 'गोपनीयता धोरण',
    'landing.footer.terms': 'वापराच्या अटी',
    'landing.footer.help': 'मदत',
    'landing.footer.contact': 'संपर्क करा',
    'landing.footer.copyright': '© 2025 कृषी संपर्क. सर्व हक्क राखीव.'
  };

  const TE = {
    'landing.header.brandTitle': 'కృషి సంపర్క్',
    'landing.header.brandSubtitle': 'మీ భాషలో స్మార్ట్ వ్యవసాయ సహాయం',
    'landing.header.navAbout': 'గురించి',
    'landing.header.navFeatures': 'లక్షణాలు',
    'landing.header.navHowItWorks': 'ఎలా పనిచేస్తుంది',
    'landing.header.navSafetyTrust': 'భద్రత మరియు నమ్మకం',
    'landing.header.navContact': 'సంప్రదించండి',

    'landing.hero.title': 'మెరుగైన నిర్ణయాల కోసం మీ వ్యవసాయ సహచరుడు',
    'landing.hero.description': 'మీ భాషలో ప్రశ్నలు అడగండి, పంట సమస్యలు తెలుసుకోండి, నేల నివేదిక అర్థం చేసుకోండి, నీటి పారుదల ప్రణాళిక చేయండి మరియు మండి ధరలు చూడండి.',
    'landing.hero.continueAsGuest': 'అతిథిగా కొనసాగండి',
    'landing.hero.signInWithGoogle': 'Google తో సైన్ ఇన్ చేయండి',
    'landing.hero.voiceAssistTitle': 'వాయిస్ అసిస్ట్',
    'landing.hero.voiceAssistText': 'మైక్ నొక్కండి మరియు మీ భాషలో వ్యవసాయ ప్రశ్న అడగండి',
    'landing.hero.trustNote': 'సాంకేతిక పరిజ్ఞానం అవసరం లేదు. రైతులు, విద్యార్థులు మరియు వ్యవసాయ సలహాదారుల కోసం రూపొందించబడింది.',
    'landing.hero.chipVoice': 'వాయిస్ ప్రశ్నలు',
    'landing.hero.chipPhoto': 'పంట ఫోటో తనిఖీ',
    'landing.hero.chipMarket': 'లైవ్ మండి ట్రెండ్‌లు',
    'landing.hero.trustPanelTitle': 'పరిమిత ఇంటర్నెట్‌లో కూడా పనిచేస్తుంది',
    'landing.hero.trust1': 'స్థానిక భాష మద్దతు (5+ భాషలు)',
    'landing.hero.trust2': 'ఆఫ్‌లైన్-ఫస్ట్ - మీ డేటా సురక్షితం',
    'landing.hero.trust3': 'ఎరువులు మరియు పురుగుమందుల కోసం భద్రమైన సలహా',
    'landing.hero.trust4': 'క్లిష్ట సమస్యల కోసం నిపుణుల సహాయం',
    'landing.hero.trust5': 'గోప్యత పరిరక్షితం - మీ డేటా సురక్షితం',

    'landing.auth.guestTitle': 'మీ పొలం గురించి చెప్పండి',
    'landing.auth.guestMessage': 'ఉత్తమ వ్యవసాయ సలహా కోసం కొన్ని వివరాలు ఇవ్వండి. మీ డేటా ఈ పరికరంలోనే ఉంటుంది.',
    'landing.auth.nameLabel': 'మీ పేరు',
    'landing.auth.emailLabel': 'ఇమెయిల్',
    'landing.auth.regionLabel': 'ప్రాంతం',
    'landing.auth.soilLabel': 'నేల రకం',
    'landing.auth.acresLabel': 'పొలం పరిమాణం (ఎకరాలు)',
    'landing.auth.cropLabel': 'ప్రధాన పంట',
    'landing.auth.selectPlaceholder': 'ఎంచుకోండి...',
    'landing.auth.continue': 'సలహా ప్రారంభించండి',
    'landing.auth.skip': 'ఇప్పుడు వదిలేయండి',
    'landing.auth.close': 'మూసివేయండి',
    'landing.auth.invalidEmail': 'దయచేసి సరైన ఇమెయిల్ ఇవ్వండి లేదా ఖాళీ వదిలేయండి.',
    'landing.auth.guestError': 'అతిథిగా కొనసాగలేకపోయింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    'landing.auth.signingInSecurely': 'సురక్షితంగా సైన్ ఇన్ అవుతోంది...',
    'landing.auth.nameRequired': 'దయచేసి మీ పేరు ఇవ్వండి.',
    'landing.auth.regionRequired': 'దయచేసి మీ ప్రాంతం ఎంచుకోండి.',
    'landing.auth.soilRequired': 'దయచేసి నేల రకం ఎంచుకోండి.',
    'landing.auth.acresRequired': 'దయచేసి పొలం పరిమాణం ఎకరాలలో ఇవ్వండి.',
    'landing.auth.cropRequired': 'దయచేసి మీ ప్రధాన పంట ఎంచుకోండి.',

    'landing.features.askTitle': 'కృషి శాస్త్రిని అడగండి లేదా మాట్లాడండి',
    'landing.features.askDescription': 'టెక్స్ట్ లేదా వాయిస్‌తో ప్రశ్నలు అడగండి మరియు పంట, నీరు, ఎరువులు మరియు పురుగుల ప్రశ్నలకు సరళ సమాధానాలు పొందండి.',
    'landing.features.photoTitle': 'పంట ఫోటో తనిఖీ',
    'landing.features.photoDescription': 'ఫోటో తీసి పంట ఆరోగ్య సమస్యల కోసం మార్గదర్శక సహాయం పొందండి.',
    'landing.features.soilTitle': 'నేల నివేదిక',
    'landing.features.soilDescription': 'నేల పరీక్ష నివేదిక అప్‌లోడ్ చేసి సరళ పదాలలో అర్థం చేసుకోండి.',
    'landing.features.marketTitle': 'మండి ధరలు',
    'landing.features.marketDescription': 'మీ స్థానిక మండిలో రోజువారీ ధరలు మరియు ట్రెండ్‌లు చూడండి.',
    'landing.features.planTitle': 'నేటి పొలం కార్య ప్రణాళిక',
    'landing.features.planDescription': 'నేటి పొలం కార్యాల కోసం సరళ సిఫార్సులు చూడండి.',
    'landing.features.expertTitle': 'నిపుణుల సహాయం',
    'landing.features.expertDescription': 'క్లిష్ట సమస్యలను వ్యవసాయ నిపుణులకు పంపండి.',

    'landing.howItWorks.title': 'ఇది ఎలా పనిచేస్తుంది',
    'landing.howItWorks.summary': 'ఫోటో, వాయిస్ లేదా టెక్స్ట్ ప్రశ్న నుండి సరళ వ్యవసాయ మార్గదర్శకం పొందడానికి మూడు సులభ మెట్లు.',
    'landing.howItWorks.step1Title': 'మీ పొలం గురించి చెప్పండి',
    'landing.howItWorks.step1Description': 'మీ పంట, ప్రాంతం, నేల రకం మరియు పొలం వివరాలు జోడించండి.',
    'landing.howItWorks.step2Title': 'అడగండి, అప్‌లోడ్ చేయండి లేదా ఫోటో తీయండి',
    'landing.howItWorks.step2Description': 'ప్రశ్నలు అడగండి, నేల నివేదిక అప్‌లోడ్ చేయండి లేదా పంట ఫోటో తీయండి.',
    'landing.howItWorks.step3Title': 'సరళ మార్గదర్శకం మరియు తదుపరి మెట్లు పొందండి',
    'landing.howItWorks.step3Description': 'సులభ సలహా, భద్రమైన సిఫార్సులు మరియు తదుపరి మెట్లు పొందండి.',

    'landing.trust.title': 'నిజమైన వ్యవసాయ పరిస్థితుల కోసం రూపొందించబడింది',
    'landing.trust.offlineTitle': 'ఆఫ్‌లైన్-ఫస్ట్',
    'landing.trust.offlineDescription': 'పరిమిత ఇంటర్నెట్‌లో పనిచేస్తుంది',
    'landing.trust.languageTitle': 'స్థానిక భాషలు',
    'landing.trust.languageDescription': 'మీ భాష మాట్లాడండి',
    'landing.trust.farmerFriendlyTitle': 'రైతు స్నేహిత',
    'landing.trust.farmerFriendlyDescription': 'సులభ పదాలు, సరళ సిఫార్సులు',
    'landing.trust.safetyTitle': 'భద్రత మొదట',
    'landing.trust.safetyDescription': 'ఎరువులు మరియు పురుగుమందుల కోసం తనిఖీ చేసిన సలహా',
    'landing.trust.expertTitle': 'నిపుణుల నెట్‌వర్క్',
    'landing.trust.expertDescription': 'క్లిష్ట సందర్భాల కోసం మానవ నిపుణులు',
    'landing.trust.privacyTitle': 'గోప్యత పరిరక్షితం',
    'landing.trust.privacyDescription': 'మీ డేటా సురక్షితం',

    'landing.capstone.title': 'కృషి సంపర్క్ ప్లాట్‌ఫారమ్',
    'landing.capstone.description': 'బహుభాషా మార్గదర్శకం, భద్రమైన సిఫార్సులు మరియు నిపుణుల సహాయంతో ఆఫ్‌లైన్-ఫస్ట్ వ్యవసాయ మేధస్సు ప్లాట్‌ఫారమ్.',

    'landing.footer.brandTitle': 'కృషి సంపర్క్',
    'landing.footer.brandSubtitle': 'మీ భాషలో స్మార్ట్ వ్యవసాయ సహాయం',
    'landing.footer.about': 'మా గురించి',
    'landing.footer.privacy': 'గోప్యతా విధానం',
    'landing.footer.terms': 'వాడుక నిబంధనలు',
    'landing.footer.help': 'సహాయం',
    'landing.footer.contact': 'మమ్మల్ని సంప్రదించండి',
    'landing.footer.copyright': '© 2025 కృషి సంపర్క్. అన్ని హక్కులు అనుమతించబడ్డాయి.'
  };

  const SW = {
    'landing.header.brandTitle': 'Krishi Sampark',
    'landing.header.brandSubtitle': 'Msaada wa kilimo kwa lugha yako',
    'landing.header.navAbout': 'Kuhusu',
    'landing.header.navFeatures': 'Vipengele',
    'landing.header.navHowItWorks': 'Jinsi Inavyofanya Kazi',
    'landing.header.navSafetyTrust': 'Usalama na Uaminifu',
    'landing.header.navContact': 'Wasiliana',

    'landing.hero.title': 'Mshirika wako wa kilimo kwa maamuzi bora',
    'landing.hero.description': 'Uliza maswali kwa lugha yako, angalia matatizo ya mazao, elewa ripoti ya udongo, panga umwagiliaji, na angalia bei za soko.',
    'landing.hero.continueAsGuest': 'Endelea kama Mgeni',
    'landing.hero.signInWithGoogle': 'Ingia na Google',
    'landing.hero.voiceAssistTitle': 'Msaada wa Sauti',
    'landing.hero.voiceAssistText': 'Bonyeza maikrofoni na uliza swali lako la kilimo kwa lugha yako',
    'landing.hero.trustNote': 'Hakuna ujuzi wa kiufundi unahitajika. Imetengenezwa kwa wakulima, wanafunzi, na washauri wa kilimo.',
    'landing.hero.chipVoice': 'Maswali ya sauti',
    'landing.hero.chipPhoto': 'Angalia picha ya mazao',
    'landing.hero.chipMarket': 'Mwenendo wa soko moja kwa moja',
    'landing.hero.trustPanelTitle': 'Hufanya kazi hata na intaneti ndogo',
    'landing.hero.trust1': 'Msaada wa lugha za asili (lugha 5+)',
    'landing.hero.trust2': 'Nje ya mtandao kwanza - data yako inasalama',
    'landing.hero.trust3': 'Mashauri yaliyokaguliwa kwa mbolea na dawa za wadudu',
    'landing.hero.trust4': 'Msaada wa wataalamu kwa masuala magumu',
    'landing.hero.trust5': 'Faragha inalindwa - data yako ni salama',

    'landing.auth.guestTitle': 'Tueleze kuhusu shamba lako',
    'landing.auth.guestMessage': 'Toa maelezo machache ili tupate kukupa ushauri bora wa kilimo. Data yako inabakia kwenye kifaa hiki.',
    'landing.auth.nameLabel': 'Jina Lako',
    'landing.auth.emailLabel': 'Barua pepe',
    'landing.auth.regionLabel': 'Eneo',
    'landing.auth.soilLabel': 'Aina ya Udongo',
    'landing.auth.acresLabel': 'Ukubwa wa Shamba (Eka)',
    'landing.auth.cropLabel': 'Mazao Makuu',
    'landing.auth.selectPlaceholder': 'Chagua...',
    'landing.auth.continue': 'Anza Ushauri',
    'landing.auth.skip': 'Ruka kwa sasa',
    'landing.auth.close': 'Funga',
    'landing.auth.invalidEmail': 'Tafadhali weka barua pepe sahihi au iache wazi.',
    'landing.auth.guestError': 'Imeshindwa kuendelea kama mgeni. Tafadhali jaribu tena.',
    'landing.auth.signingInSecurely': 'Inakuingiza kwa usalama...',
    'landing.auth.nameRequired': 'Tafadhali weka jina lako.',
    'landing.auth.regionRequired': 'Tafadhali chagua eneo lako.',
    'landing.auth.soilRequired': 'Tafadhali chagua aina ya udongo.',
    'landing.auth.acresRequired': 'Tafadhali weka ukubwa wa shamba kwa eka.',
    'landing.auth.cropRequired': 'Tafadhali chagua mazao makuu.',

    'landing.features.askTitle': 'Uliza au Ongea na Krishi Sastri',
    'landing.features.askDescription': 'Uliza kwa maandishi au sauti na upate majibu rahisi kwa maswali ya mazao, maji, mbolea, na wadudu.',
    'landing.features.photoTitle': 'Angalia Picha ya Mazao',
    'landing.features.photoDescription': 'Piga picha na upate msaada wa kuongozwa kwa matatizo ya afya ya mazao.',
    'landing.features.soilTitle': 'Ripoti ya Udongo',
    'landing.features.soilDescription': 'Pakia ripoti ya kupima udongo na uelewe kwa maneno rahisi.',
    'landing.features.marketTitle': 'Bei za Soko',
    'landing.features.marketDescription': 'Angalia bei za kila siku na mwenendo katika soko lako la karibu.',
    'landing.features.planTitle': 'Mpango wa Leo wa Shamba',
    'landing.features.planDescription': 'Ona shughuli rahisi zinazopendekezwa kwa kazi za shamba za leo.',
    'landing.features.expertTitle': 'Msaada wa Wataalamu',
    'landing.features.expertDescription': 'Tuma masuala magumu kwa wataalamu wa kilimo kwa msaada.',

    'landing.howItWorks.title': 'Jinsi inavyofanya kazi',
    'landing.howItWorks.summary': 'Hatua tatu za haraka kupata mwongozo rahisi wa kilimo kupitia picha, sauti, au swali la maandishi.',
    'landing.howItWorks.step1Title': 'Tueleze kuhusu shamba lako',
    'landing.howItWorks.step1Description': 'Ongeza mazao yako, eneo, aina ya udongo, na maelezo ya shamba.',
    'landing.howItWorks.step2Title': 'Uliza, pakia, au piga picha',
    'landing.howItWorks.step2Description': 'Uliza maswali, pakia ripoti ya udongo, au piga picha ya mazao yako.',
    'landing.howItWorks.step3Title': 'Pata mwongozo rahisi na hatua zinazofuata',
    'landing.howItWorks.step3Description': 'Pokea ushauri rahisi, mapendekezo yaliyokaguliwa, na ufuate hatua zinazofuata.',

    'landing.trust.title': 'Imetengenezwa kwa hali halisi ya kilimo',
    'landing.trust.offlineTitle': 'Nje ya mtandao kwanza',
    'landing.trust.offlineDescription': 'Hufanya kazi na intaneti ndogo',
    'landing.trust.languageTitle': 'Lugha za asili',
    'landing.trust.languageDescription': 'Ongea kwa lugha yako',
    'landing.trust.farmerFriendlyTitle': 'Rahisi kwa wakulima',
    'landing.trust.farmerFriendlyDescription': 'Maneno rahisi, mapendekezo yasiyo magumu',
    'landing.trust.safetyTitle': 'Usalama kwanza',
    'landing.trust.safetyDescription': 'Mashauri yaliyokaguliwa kwa mbolea na dawa za wadudu',
    'landing.trust.expertTitle': 'Mtandao wa wataalamu',
    'landing.trust.expertDescription': 'Wataalamu wa kibinadamu kwa kesi ngumu',
    'landing.trust.privacyTitle': 'Faragha imelindwa',
    'landing.trust.privacyDescription': 'Data yako ni salama',

    'landing.capstone.title': 'Jukwaa la Krishi Sampark',
    'landing.capstone.description': 'Jukwaa la maonyesho la akili ya kilimo ya nje ya mtandao kwanza na mwongozo wa lugha nyingi, mapendekezo yaliyokaguliwa, na msaada wa wataalamu.',

    'landing.footer.brandTitle': 'Krishi Sampark',
    'landing.footer.brandSubtitle': 'Msaada wa kilimo kwa lugha yako',
    'landing.footer.about': 'Kuhusu Sisi',
    'landing.footer.privacy': 'Sera ya Faragha',
    'landing.footer.terms': 'Masharti ya Matumizi',
    'landing.footer.help': 'Msaada',
    'landing.footer.contact': 'Wasiliana Nasi',
    'landing.footer.copyright': '© 2025 Krishi Sampark. Haki zote zimehifadhiwa.'
  };

  const TRANSLATIONS = {
    en: EN,
    hi: HI,
    mr: MR,
    te: TE,
    sw: SW
  };

  let currentLang = 'en';

  function getText(key) {
    const pack = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    return pack[key] || TRANSLATIONS.en[key] || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!key) return;
      node.textContent = getText(key);
    });
  }

  function initHowItWorksVisual() {
    const section = document.getElementById('how-it-works');
    const image = document.getElementById('how-it-works-image');
    if (!section || !image) return;

    const showFallback = () => section.classList.add('how-show-fallback');
    const showImage = () => section.classList.remove('how-show-fallback');

    image.addEventListener('load', showImage);
    image.addEventListener('error', showFallback);

    if (image.complete) {
      if (image.naturalWidth > 0) {
        showImage();
      } else {
        showFallback();
      }
    }
  }

  // Update the how-it-works image based on selected language
  const HOW_IT_WORKS_IMAGES = {
    'en': '/assets/how-it-works-content.png?v=2',
    'hi': '/assets/how-it-works-content-hindi.png?v=1',
    'mr': '/assets/how-it-works-content-marathi.png?v=1',
    'te': '/assets/how-it-works-content-telugu.png?v=1',
    'sw': '/assets/how-it-works-content-swahili.png?v=1'
  };

  function updateHowItWorksImage(lang) {
    const image = document.getElementById('how-it-works-image');
    if (!image) return;
    const newSrc = HOW_IT_WORKS_IMAGES[lang] || HOW_IT_WORKS_IMAGES['en'];
    if (image.src.indexOf(newSrc) === -1) {
      image.src = newSrc;
    }
  }

  function setLanguage(lang) {
    currentLang = TRANSLATIONS[lang] ? lang : 'en';
    document.documentElement.lang = currentLang;
    if (languageSelector) languageSelector.value = currentLang;
    localStorage.setItem('aaa_preferred_language', currentLang);
    applyTranslations();
    updateHowItWorksImage(currentLang);
  }

  function openGuestModal() {
    modal.classList.remove('hidden');
    guestError.textContent = '';
    guestEmail.value = '';
    guestName.value = '';
    if (guestRegion) guestRegion.value = '';
    if (guestSoil) guestSoil.value = '';
    if (guestAcres) guestAcres.value = '';
    if (guestCrop) guestCrop.value = '';
    guestName.focus();
  }

  function closeGuestModal() {
    modal.classList.add('hidden');
  }

  function hasProfile(profile) {
    return Boolean(profile && Array.isArray(profile.fields) && profile.fields.length > 0);
  }

  async function routeAfterSession() {
    const profileRes = await fetch('/api/profile/user', { credentials: 'include' });
    if (!profileRes.ok) {
      window.location.href = '/onboarding';
      return;
    }
    const profile = await profileRes.json();
    if (hasProfile(profile)) {
      window.location.href = '/app/home';
      return;
    }
    window.location.href = '/onboarding';
  }

  async function startGuest(optionalEmail) {
    const email = (optionalEmail || '').trim().toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      guestError.textContent = getText('landing.auth.invalidEmail');
      return;
    }

    // Validate required farm info fields
    const name = (guestName?.value || '').trim();
    const region = guestRegion?.value || '';
    const soilType = guestSoil?.value || '';
    const acres = guestAcres?.value || '';
    const crop = guestCrop?.value || '';

    if (!name) {
      guestError.textContent = getText('landing.auth.nameRequired');
      guestName?.focus();
      return;
    }
    if (!region) {
      guestError.textContent = getText('landing.auth.regionRequired');
      guestRegion?.focus();
      return;
    }
    if (!soilType) {
      guestError.textContent = getText('landing.auth.soilRequired');
      guestSoil?.focus();
      return;
    }
    if (!acres || parseFloat(acres) <= 0) {
      guestError.textContent = getText('landing.auth.acresRequired');
      guestAcres?.focus();
      return;
    }
    if (!crop) {
      guestError.textContent = getText('landing.auth.cropRequired');
      guestCrop?.focus();
      return;
    }

    const response = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, name })
    });

    if (!response.ok) {
      guestError.textContent = getText('landing.auth.guestError');
      return;
    }

    // Save the farmer profile with the collected farm details
    const profilePayload = {
      farmer_name: name,
      region: region,
      soil_type: soilType,
      acres: parseFloat(acres),
      primary_crop: crop,
      has_drip: 'no',
      preferred_language: currentLang || 'en'
    };

    try {
      await fetch('/api/profile/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profilePayload)
      });
    } catch (e) {
      // Profile save failed — still proceed; user can update later
      console.warn('Profile save after guest login failed:', e);
    }

    // Also save the language preference
    try {
      await fetch('/api/profile/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: currentLang || 'en' })
      });
    } catch (e) {
      console.warn('Language save after guest login failed:', e);
    }

    await routeAfterSession();
  }

  async function googleLogin(credential) {
    if (authStatus) authStatus.textContent = getText('landing.auth.signingInSecurely');

    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential })
    });

    if (!response.ok) {
      if (authStatus) authStatus.textContent = '';
      alert('Google sign-in failed. Please try again.');
      return;
    }

    await routeAfterSession();
  }

  let googleClientId = null;
  let googleInitialized = false;

  function promptGoogle() {
    if (authStatus) authStatus.textContent = getText('landing.auth.signingInSecurely');
    if (!googleInitialized || !window.google?.accounts?.id) {
      // Google script not loaded yet or not initialized — try to initialize first
      if (googleClientId && window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp) => {
            if (!resp || !resp.credential) {
              if (authStatus) authStatus.textContent = '';
              return;
            }
            await googleLogin(resp.credential);
          }
        });
        googleInitialized = true;
      } else {
        // Google script not loaded — show alert
        if (authStatus) authStatus.textContent = '';
        alert('Google sign-in is not available. Please continue as guest.');
        return;
      }
    }
    window.google?.accounts?.id?.prompt();
  }

  function renderGoogleButtons(clientId) {
    if (!window.google?.accounts?.id || !clientId) return;

    googleClientId = clientId;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp) => {
        if (!resp || !resp.credential) {
          if (authStatus) authStatus.textContent = '';
          return;
        }
        await googleLogin(resp.credential);
      }
    });
    googleInitialized = true;

    const buttonTargets = [
      document.getElementById('hero-google-btn'),
      document.getElementById('header-google-btn')
    ];

    buttonTargets.forEach((node) => {
      if (!node) return;
      node.innerHTML = '';
      node.classList.add('ready');
      google.accounts.id.renderButton(node, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 220
      });
    });

    headerGoogleFallback?.classList.add('is-hidden');
    heroGoogleFallback?.classList.add('is-hidden');
  }

  async function loadAuth() {
    const configRes = await fetch('/api/auth/config', { credentials: 'include' });
    if (!configRes.ok) return;
    const config = await configRes.json();
    if (config?.enabled && config?.client_id) {
      googleClientId = config.client_id;
      // Wait for Google script to load, then render buttons
      const tryRender = (retries = 10) => {
        if (window.google?.accounts?.id) {
          renderGoogleButtons(config.client_id);
        } else if (retries > 0) {
          setTimeout(() => tryRender(retries - 1), 300);
        }
      };
      tryRender();
    }
  }

  document.getElementById('hero-guest-btn')?.addEventListener('click', openGuestModal);
  document.getElementById('header-guest-btn')?.addEventListener('click', openGuestModal);
  document.getElementById('guest-close')?.addEventListener('click', closeGuestModal);
  document.getElementById('guest-continue')?.addEventListener('click', () => startGuest(guestEmail.value));
  headerGoogleFallback?.addEventListener('click', promptGoogle);
  heroGoogleFallback?.addEventListener('click', promptGoogle);

  languageSelector?.addEventListener('change', (e) => setLanguage(e.target.value));

  // ── Hamburger menu for mobile/tablet ──────────────────────────
  const hamburger = document.getElementById('nav-hamburger');
  const navDrawer = document.getElementById('nav-drawer');
  const navBackdrop = document.getElementById('nav-drawer-backdrop');

  function openNavDrawer() {
    if (!navDrawer) return;
    navDrawer.classList.add('open');
    navBackdrop?.classList.add('active');
    hamburger?.setAttribute('aria-expanded', 'true');
  }

  function closeNavDrawer() {
    if (!navDrawer) return;
    navDrawer.classList.remove('open');
    navBackdrop?.classList.remove('active');
    hamburger?.setAttribute('aria-expanded', 'false');
  }

  hamburger?.addEventListener('click', () => {
    if (navDrawer?.classList.contains('open')) closeNavDrawer();
    else openNavDrawer();
  });

  navBackdrop?.addEventListener('click', closeNavDrawer);

  // Close drawer when a nav link is clicked
  navDrawer?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNavDrawer);
  });

  // Close drawer on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navDrawer?.classList.contains('open')) closeNavDrawer();
  });

  // Restore saved language or default to English
  const savedLang = localStorage.getItem('aaa_preferred_language') || 'en';
  setLanguage(savedLang);
  initHowItWorksVisual();
  loadAuth();
})();
