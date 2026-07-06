/**
 * local_db.js
 * In-browser IndexedDB database layer for offline caching and synchronization queues.
 */

class LocalDb {
  constructor() {
    this.dbName = 'KrishiSamparkDB';
    this.dbVersion = 7;
    this.db = null;
  }

  /**
   * Initializes the IndexedDB database schema
   * @returns {Promise<IDBDatabase>} Opened DB instance
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        // Store for farmer profile digital twin
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'key' });
        }

        // Store for offline conversation records
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
        }

        // Queue for offline telemetry edits awaiting online sync
        if (!db.objectStoreNames.contains('pending_telemetry')) {
          db.createObjectStore('pending_telemetry', { keyPath: 'id', autoIncrement: true });
        }

        // Store for structured Open Knowledge Format crop parameters
        if (!db.objectStoreNames.contains('okf_knowledge')) {
          db.createObjectStore('okf_knowledge', { keyPath: 'crop_type' });
        }

        // Store for guided crop-photo diagnosis state persistence
        if (!db.objectStoreNames.contains('diagnosis_workflow')) {
          db.createObjectStore('diagnosis_workflow', { keyPath: 'key' });
        }

        // Store for pending activity logs awaiting online sync
        if (!db.objectStoreNames.contains('pending_activities')) {
          db.createObjectStore('pending_activities', { keyPath: 'id', autoIncrement: true });
        }

        // Store for cache of logged activities
        if (!db.objectStoreNames.contains('logged_activities')) {
          db.createObjectStore('logged_activities', { keyPath: 'activity_id', autoIncrement: true });
        }

        // Phase 4 Stores
        if (!db.objectStoreNames.contains('pending_plans')) {
          db.createObjectStore('pending_plans', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('logged_plans')) {
          db.createObjectStore('logged_plans', { keyPath: 'plan_id' });
        }
        if (!db.objectStoreNames.contains('pending_reminders')) {
          db.createObjectStore('pending_reminders', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('logged_reminders')) {
          db.createObjectStore('logged_reminders', { keyPath: 'reminder_id' });
        }
        if (!db.objectStoreNames.contains('pending_escalations')) {
          db.createObjectStore('pending_escalations', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('logged_escalations')) {
          db.createObjectStore('logged_escalations', { keyPath: 'escalation_id' });
        }
        if (!db.objectStoreNames.contains('logged_feedbacks')) {
          db.createObjectStore('logged_feedbacks', { keyPath: 'feedback_id' });
        }
        if (!db.objectStoreNames.contains('observability_logs')) {
          db.createObjectStore('observability_logs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('privacy_preferences')) {
          db.createObjectStore('privacy_preferences', { keyPath: 'user_id' });
        }
        if (!db.objectStoreNames.contains('sync_dlq')) {
          db.createObjectStore('sync_dlq', { keyPath: 'id', autoIncrement: true });
        }
        console.log('[IndexedDB] Schema upgraded successfully to version 7');
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        console.log('[IndexedDB] Database connection established');
        this.preseedOkf().then(() => {
          resolve(this.db);
        });
      };

      request.onerror = event => {
        console.error('[IndexedDB] Failed to open database:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Caches the farmer profile twin locally
   * @param {object} profileData
   */
  async saveProfile(profileData) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['profile'], 'readwrite');
      const store = transaction.objectStore('profile');
      const request = store.put({ key: 'farmer_profile', data: profileData });

      request.onsuccess = () => {
        console.log('[IndexedDB] Profile cached locally');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves the cached profile twin
   * @returns {Promise<object|null>} Profile data
   */
  async getProfile() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['profile'], 'readonly');
      const store = transaction.objectStore('profile');
      const request = store.get('farmer_profile');

      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Adds an offline chat message record
   * @param {object} message - { role, text, timestamp }
   */
  async addChat(message) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chats'], 'readwrite');
      const store = transaction.objectStore('chats');
      const request = store.add({ ...message, timestamp: new Date().toISOString() });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves all offline chat records
   * @returns {Promise<Array>} List of chats
   */
  async getChats() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queues a telemetry update to be synced when online
   * @param {string} plantingId
   * @param {object} telemetry - { moisture_pct, health_pct, nitrogen_ppm }
   */
  async queueTelemetry(plantingId, telemetry) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_telemetry'], 'readwrite');
      const store = transaction.objectStore('pending_telemetry');
      const request = store.add({ plantingId, telemetry, timestamp: new Date().toISOString() });

      request.onsuccess = () => {
        console.log('[IndexedDB] Telemetry update queued for online sync');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves all queued telemetry actions
   * @returns {Promise<Array>} List of updates
   */
  async getPendingTelemetry() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_telemetry'], 'readonly');
      const store = transaction.objectStore('pending_telemetry');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clears the pending telemetry queue after sync
   */
  async clearPendingTelemetry() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_telemetry'], 'readwrite');
      const store = transaction.objectStore('pending_telemetry');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[IndexedDB] Telemetry synchronization queue cleared');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queues an offline activity log awaiting online sync
   */
  async queueActivity(plantingId, activity) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_activities'], 'readwrite');
      const store = transaction.objectStore('pending_activities');
      const request = store.add({ plantingId, activity, timestamp: new Date().toISOString() });
      request.onsuccess = () => {
        console.log('[IndexedDB] Activity log queued for online sync');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves all queued activities
   */
  async getPendingActivities() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_activities'], 'readonly');
      const store = transaction.objectStore('pending_activities');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clears the pending activities queue after sync
   */
  async clearPendingActivities() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_activities'], 'readwrite');
      const store = transaction.objectStore('pending_activities');
      const request = store.clear();
      request.onsuccess = () => {
        console.log('[IndexedDB] Pending activities queue cleared');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Saves a confirmed activity locally
   */
  async saveConfirmedActivity(activity) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logged_activities'], 'readwrite');
      const store = transaction.objectStore('logged_activities');
      const request = store.put(activity);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets all logged activities
   */
  async getLoggedActivities() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logged_activities'], 'readonly');
      const store = transaction.objectStore('logged_activities');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Returns total count of all pending sync items
   */
  async getPendingSyncCount() {
    try {
      const telemetries = await this.getPendingTelemetry();
      const activities = await this.getPendingActivities();
      const plans = await this.getPendingPlans();
      const reminders = await this.getPendingReminders();
      const escalations = await this.getPendingEscalations();
      const feedbacks = await this.getPendingFeedbacks();
      return telemetries.length + activities.length + plans.length + reminders.length + escalations.length + feedbacks.length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Pre-seeds static agricultural knowledge guides in Open Knowledge Format (OKF)
   */
  async preseedOkf() {
    // Check if okf_knowledge has items
    const count = await new Promise((resolve) => {
      const transaction = this.db.transaction(['okf_knowledge'], 'readonly');
      const store = transaction.objectStore('okf_knowledge');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });

    // If schema version upgraded to 3, we force overwrite to apply the new multilingual format
    console.log('[IndexedDB] Pre-seeding OKF crop parameters with multilingual diagnostics...');
    const staticOkfData = [
      {
        crop_type: "wheat",
        metadata: {
          name: "Wheat (गेहूं / गहू)",
          category: "cereals",
          description: "Staple winter crop requiring moderate temperature and moisture."
        },
        specifications: {
          optimal_soil_ph: "6.0-7.0",
          npk_ratio: { nitrogen_ppm: 60, phosphorus_ppm: 30, potassium_ppm: 40 },
          soil_moisture: { min_pct: 35.0, max_pct: 65.0, optimal_pct: 45.0 },
          growth_stages: ["germination", "vegetative", "flowering", "maturity"]
        },
        diagnostics: {
          "Brown Leaf Rust": {
            symptom: {
              English: "Powdery brown spots spreading across the leaves.",
              Hindi: "पत्तियों पर भूरे रंग के धब्बे फैल रहे हैं।",
              Marathi: "पानांवर तांबूस तपकिरी ठिपके पसरणे.",
              Telugu: "ఆకులపై గోధుమ రంగు మచ్చలు వ్యాపించడం.",
              Swahili: "Madoa ya kahawia kwenye majani.",
              Zulu: "Amaphaphu ansundu asabalala emagxabini."
            },
            organic_remedy: {
              English: "Dissolve 5kg wood ash and 5L cow urine in 100L water, then spray.",
              Hindi: "5 किलो लकड़ी की राख और 5 लीटर गोमूत्र 100 लीटर पानी में मिलाकर छिड़काव करें।",
              Marathi: "५ किलो लाकडी राख आणि ५ लीटर गोमूत्र १०० लीटर पाण्यात विरघळवून फवारावे.",
              Telugu: "5 కిలోల కట్టె బూడిద మరియు 5 లీటర్ల గోమూత్రం 100 లీటర్ల నీటిలో కలిపి పిచారీ చేయండి.",
              Swahili: "Changanya jivu la kuni kilo 5 na mkojo wa ng'ombe lita 5 katika maji lita 100, kisha mwagilia.",
              Zulu: "Hlanganisa 5kg wamalahle kanye nochago lwenkomo 5L emanzini 100L, bese ununyiza."
            }
          },
          "Aphids": {
            symptom: {
              English: "Tiny green sap-suckers under leaves causing curling.",
              Hindi: "पत्तियों के नीचे छोटे हरे कीट रस चूसते हैं जिससे पत्तियां सिकुड़ जाती हैं।",
              Marathi: "पानांखालील बारीक हिरवे कीटक जे रस शोषून घेतात आणि पाने आकसतात.",
              Telugu: "ఆకుల క్రింద రసం పీల్చే చిన్న పచ్చటి పురుగులు.",
              Swahili: "Wadudu wadogo wa kijani chini ya majani.",
              Zulu: "Izinambuzane ezincane eziluhlaza ngaphansi kwamagxabi."
            },
            organic_remedy: {
              English: "Spray soap water emulsion mixed with crushed garlic extract onto the stems.",
              Hindi: "लहसुन के रस के साथ साबुन के पानी का घोल बनाकर तनों पर छिड़काव करें।",
              Marathi: "लसणाचा अर्क आणि साबणाच्या पाण्याचे द्रावण खोडांवर फवारावे.",
              Telugu: "వెల్లుల్లి రసం మరియు సబ్బు నీటి ద్రావణాన్ని కొమ్మలపై పిచికారీ చేయండి.",
              Swahili: "Nyunyizia mchanganyiko wa maji ya sabuni na kitunguu saumu kilichosagwa.",
              Zulu: "Nunyiza inhlanganisela yamanzi esabhuni kanye nesisuso segalikhi eshiqiwe emagxabenzi."
            }
          }
        }
      },
      {
        crop_type: "corn",
        metadata: {
          name: "Maize / Corn (मक्का / मका)",
          category: "cereals",
          description: "Warm season crop requiring high nitrogen and consistent watering."
        },
        specifications: {
          optimal_soil_ph: "5.8-7.0",
          npk_ratio: { nitrogen_ppm: 80, phosphorus_ppm: 40, potassium_ppm: 50 },
          soil_moisture: { min_pct: 40.0, max_pct: 70.0, optimal_pct: 55.0 },
          growth_stages: ["germination", "vegetative", "flowering", "maturity"]
        },
        diagnostics: {
          "Maize Stalk Borer Infestation": {
            symptom: {
              English: "Shot-holes on leaves and tunnel damage in stalks.",
              Hindi: "पत्तियों पर छोटे छिद्र और तनों में सुरंग जैसी क्षति।",
              Marathi: "पानांवर बारीक छिद्रे पडणे आणि खोडा पोखरले जाणे.",
              Telugu: "ఆకులపై రంధ్రాలు మరియు కాండం లోపల సొరంగం లాంటి నష్టం.",
              Swahili: "Mashimo kwenye majani na uharibifu wa mashimo kwenye mashina.",
              Zulu: "Amaphaphu emagxabini kanye nokulimala kwesiphango emagxabeni."
            },
            organic_remedy: {
              English: "Sprinkle dry wood ash or sand directly into the central leaf whorls to smother the larvae.",
              Hindi: "लार्वा को नष्ट करने के लिए सूखी लकड़ी की राख या सूखी रेत को सीधे पत्तियों के मध्य भाग में छिड़कें।",
              Marathi: "अळ्या गुदमरून मारण्यासाठी कोरडी लाकडी राख थेट पानाच्या पोंग्यात टाकावी.",
              Telugu: "లార్వాలను అణిచివేసేందుకు పొడి కట్టె బూడిదను నేరుగా ఆకుల మధ్య భాగంలో చల్లండి.",
              Swahili: "Nyunyizia jivu la kuni kavu au mchanga moja kwa moja kwenye majani ili kuua mabuu.",
              Zulu: "Thela amalahle omile noma usawoti ngqo emagxabeni aphakathi ukubulala amaphuphu."
            }
          },
          "Common Rust": {
            symptom: {
              English: "Elongated golden-brown pustules on both leaf surfaces.",
              Hindi: "पत्तियों की दोनों सतहों पर लंबे सुनहरे-भूरे रंग के धब्बे।",
              Marathi: "पानांच्या दोन्ही बाजूंवर तांबूस पिवळसर लांबट फोड येणे.",
              Telugu: "ఆకు రెండు వైపులా పొడుగుపాటి బంగారు-గోధుమ రంగు మచ్చలు.",
              Swahili: "Madoa marefu ya manjano-kahawia pande zote mbili za majani.",
              Zulu: "Amaphaphu amade ansundu-ogolide kumagxabi omabili."
            },
            organic_remedy: {
              English: "Spray neem oil solution (5ml/L) mixed with a mild soap surfactant.",
              Hindi: "हल्के साबुन के साथ नीम के तेल (5ml/L) के घोल का छिड़काव करें।",
              Marathi: "सौम्य साबण द्रावण आणि कडुनिंब तेल (५ मि.ली. प्रति लीटर) फवारावे.",
              Telugu: "వేప నూనె ద్రావణాన్ని (లీటరుకు 5 మి.లీ) సబ్బు నీటితో కలిపి పిచికారీ చేయండి.",
              Swahili: "Nyunyizia mchanganyiko wa mafuta ya mwarobaini (5ml kwa kila lita) na sabuni kidogo.",
              Zulu: "Nunyiza isisuso sehafu yomthi (5ml/L) esihlanganiswe nesabhuni esithile."
            }
          }
        }
      }
    ];

    const transaction = this.db.transaction(['okf_knowledge'], 'readwrite');
    const store = transaction.objectStore('okf_knowledge');
    store.clear(); // Ensure database rewrite to avoid old data structure caching
    staticOkfData.forEach(item => {
      store.put(item);
    });
    console.log('[IndexedDB] Pre-seeded 2 OKF crop guides with multilingual schemas.');
  }

  /**
   * Retrieves an OKF crop guide
   * @param {string} cropType
   * @returns {Promise<object|null>} OKF guide
   */
  async getOkfGuide(cropType) {
    if (!cropType) return null;
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['okf_knowledge'], 'readonly');
      const store = transaction.objectStore('okf_knowledge');
      const request = store.get(cropType.toLowerCase());
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Saves an OKF crop guide to IndexedDB for offline use
   * @param {string} cropType - Crop identifier
   * @param {object} data - OKF entity data (metadata, body, etc.)
   * @returns {Promise<boolean>} Success
   */
  async saveOkfGuide(cropType, data) {
    if (!cropType || !data) return false;
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['okf_knowledge'], 'readwrite');
      const store = transaction.objectStore('okf_knowledge');
      const record = {
        crop_type: cropType.toLowerCase(),
        ...data
      };
      const request = store.put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  /**
   * Persists guided photo diagnosis state in IndexedDB
   * @param {object} state
   */
  async saveDiagnosisState(state) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnosis_workflow'], 'readwrite');
      const store = transaction.objectStore('diagnosis_workflow');
      const request = store.put({ key: 'current_workflow', data: state });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves guided photo diagnosis state from IndexedDB
   * @returns {Promise<object|null>} workflow state
   */
  async getDiagnosisState() {
    await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['diagnosis_workflow'], 'readonly');
        const store = transaction.objectStore('diagnosis_workflow');
        const request = store.get('current_workflow');
        request.onsuccess = () => resolve(request.result ? request.result.data : null);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Clears persisted guided photo diagnosis state
   */
  async clearDiagnosisState() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnosis_workflow'], 'readwrite');
      const store = transaction.objectStore('diagnosis_workflow');
      const request = store.delete('current_workflow');
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Phase 4 Plans
  async queuePlan(plantingId, plan) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_plans'], 'readwrite');
      const store = transaction.objectStore('pending_plans');
      const request = store.add({ plantingId, plan, timestamp: new Date().toISOString() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getPendingPlans() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['pending_plans'], 'readonly');
        const store = transaction.objectStore('pending_plans');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }
  async clearPendingPlans() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_plans'], 'readwrite');
      const store = transaction.objectStore('pending_plans');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async saveConfirmedPlan(plan) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logged_plans'], 'readwrite');
      const store = transaction.objectStore('logged_plans');
      const request = store.put(plan);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getLoggedPlans() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['logged_plans'], 'readonly');
        const store = transaction.objectStore('logged_plans');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Phase 4 Reminders
  async queueReminder(plantingId, reminder) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_reminders'], 'readwrite');
      const store = transaction.objectStore('pending_reminders');
      const request = store.add({ plantingId, reminder, timestamp: new Date().toISOString() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getPendingReminders() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['pending_reminders'], 'readonly');
        const store = transaction.objectStore('pending_reminders');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }
  async clearPendingReminders() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_reminders'], 'readwrite');
      const store = transaction.objectStore('pending_reminders');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async saveConfirmedReminder(reminder) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logged_reminders'], 'readwrite');
      const store = transaction.objectStore('logged_reminders');
      const request = store.put(reminder);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getLoggedReminders() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['logged_reminders'], 'readonly');
        const store = transaction.objectStore('logged_reminders');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Phase 4 Escalations
  async queueEscalation(plantingId, escalation) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_escalations'], 'readwrite');
      const store = transaction.objectStore('pending_escalations');
      const request = store.add({ plantingId, escalation, timestamp: new Date().toISOString() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getPendingEscalations() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['pending_escalations'], 'readonly');
        const store = transaction.objectStore('pending_escalations');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }
  async clearPendingEscalations() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_escalations'], 'readwrite');
      const store = transaction.objectStore('pending_escalations');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async saveConfirmedEscalation(escalation) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logged_escalations'], 'readwrite');
      const store = transaction.objectStore('logged_escalations');
      const request = store.put(escalation);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getLoggedEscalations() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['logged_escalations'], 'readonly');
        const store = transaction.objectStore('logged_escalations');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Phase 4 Feedbacks
  async queueFeedback(plantingId, feedback) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_feedbacks'], 'readwrite');
      const store = transaction.objectStore('pending_feedbacks');
      const request = store.add({ plantingId, feedback, timestamp: new Date().toISOString() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getPendingFeedbacks() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['pending_feedbacks'], 'readonly');
        const store = transaction.objectStore('pending_feedbacks');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }
  async clearPendingFeedbacks() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_feedbacks'], 'readwrite');
      const store = transaction.objectStore('pending_feedbacks');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async saveConfirmedFeedback(feedback) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logged_feedbacks'], 'readwrite');
      const store = transaction.objectStore('logged_feedbacks');
      const request = store.put(feedback);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getLoggedFeedbacks() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['logged_feedbacks'], 'readonly');
        const store = transaction.objectStore('logged_feedbacks');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Phase 5 Observability Logs
  async saveObservabilityLog(log) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['observability_logs'], 'readwrite');
      const store = transaction.objectStore('observability_logs');
      const request = store.add(log);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getObservabilityLogs() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['observability_logs'], 'readonly');
        const store = transaction.objectStore('observability_logs');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }
  async clearObservabilityLogs() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['observability_logs'], 'readwrite');
      const store = transaction.objectStore('observability_logs');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Phase 5 Privacy Preferences
  async savePrivacyPreferences(prefs) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['privacy_preferences'], 'readwrite');
      const store = transaction.objectStore('privacy_preferences');
      const request = store.put(prefs);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getPrivacyPreferences(userId = 'user') {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['privacy_preferences'], 'readonly');
        const store = transaction.objectStore('privacy_preferences');
        const request = store.get(userId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Phase 5 Sync DLQ
  async saveToDLQ(plantingId, payload, errorMessage) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_dlq'], 'readwrite');
      const store = transaction.objectStore('sync_dlq');
      const request = store.add({
        plantingId,
        payload,
        errorMessage,
        retry_count: 3,
        timestamp: new Date().toISOString()
      });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  async getDLQ() {
    await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['sync_dlq'], 'readonly');
        const store = transaction.objectStore('sync_dlq');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        resolve([]);
      }
    });
  }
  async removeFromDLQ(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_dlq'], 'readwrite');
      const store = transaction.objectStore('sync_dlq');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}

// Bind to window
window.LocalDb = LocalDb;
