# Krishi Sampark — Kaggle Capstone Video Screenplay

**Duration:** ~5 minutes
**Recording:** Cmd + Shift + 5 (screen recording on Mac)
**Upload:** YouTube as Public video

---

## Pre-Recording Checklist

1. ✅ Open `https://krishi.odisysai.com/` in Chrome (fullscreen)
2. ✅ Language set to **Hindi** (dropdown → Hindi)
3. ✅ Have a farmer profile saved (so onboarding doesn't block the demo)
4. ✅ Open the GitHub repo page in a separate tab: `https://github.com/girinalin/agentic-agri-advisor`
5. ✅ Hide bookmarks bar: **Cmd + Shift + B**
6. ✅ Close all other apps/notifications (Do Not Disturb mode)
7. ✅ Use a headset mic for clear audio
8. ✅ Start screen recording: **Cmd + Shift + 5** → Record Selected Portion → Select Chrome window

---

## SCREENPLAY

### SCENE 1 — THE PROBLEM & THE VISION (0:00 – 0:35)

**🎬 ON SCREEN:** Landing page, top — hero section. Let it sit still for a few seconds.

**🗣️ NARRATION:**

> "Over 500 million smallholder farmers across India and East Africa face a daily struggle — crop diseases, irrigation decisions, market volatility, and weather risks — all without access to agronomic expertise.
>
> I built Krishi Sampark — an offline-first, voice-first, multi-agent agriculture advisor that works in 6 languages, even without internet. Let me walk you through it."

---

### SCENE 2 — WHO IT'S FOR & VOICE-FIRST (0:35 – 1:05)

**🎬 ON SCREEN:** Stay on hero section. Point to the voice assist highlight and trust note.

**🗣️ NARRATION:**

> "The headline reads: 'Your agriculture companion for better decisions.' It's built for farmers, students, and agriculture advisors — no technical knowledge required.
>
> The voice assist feature lets farmers tap the mic and ask questions in their own language. This is critical because many smallholder farmers have low literacy — voice is their primary interface."

---

### SCENE 3 — OFFLINE, MULTILINGUAL, SAFE, EXPERT ESCALATION (1:05 – 1:35)

**🎬 ACTION:** Slowly scroll down to the trust badges section (सीमित इंटरनेट पर भी काम करता है)

**🗣️ NARRATION (while scrolling):**

> "On the right side, you can see what makes Krishi Sampark different from other agriculture apps.
>
> Local language support — 5+ languages including Hindi, Marathi, Telugu, Swahili, and Zulu.
>
> Offline-first — your data stays secure on your device, and the app works even with no internet.
>
> Safe advice — fertilizer and pesticide recommendations pass through a Safety Kernel that blocks banned chemicals and enforces dosage limits.
>
> Expert escalation — complex issues are sent to agriculture experts for deeper analysis.
>
> And privacy — your data is protected."

---

### SCENE 4 — SIX CORE FEATURES (1:35 – 2:10)

**🎬 ACTION:** Scroll down to the features cards section (विशेषताएँ)

**🗣️ NARRATION (while scrolling through cards):**

> "The features section shows six core capabilities.
>
> First — Ask Krishi Sastri by voice or text. Get simple answers for crop, water, fertilizer, and pest questions.
>
> Second — Crop Photo Check. Take a photo and get guided help for crop health problems.
>
> Third — Soil Report. Upload a soil test report and understand what it means in simple words.
>
> Fourth — Mandi Prices. Check daily market prices and trends in your local market.
>
> Fifth — Today's Farm Plan. See simple recommended actions for today's farm activities.
>
> Sixth — Expert Help. Escalate complex issues to agriculture experts."

---

### SCENE 5 — HOW IT WORKS (2:10 – 2:35)

**🎬 ACTION:** Scroll down to "यह कैसे काम करता है" (How it works) section

**🗣️ NARRATION:**

> "The 'How it works' section shows three simple steps.
>
> Step 1 — Tell us about your farm: your crop, location, soil type, and field details.
>
> Step 2 — Ask, upload, or take a photo: ask a question, upload a soil report, or take a crop photo.
>
> Step 3 — Get simple guidance: easy advice, safe recommendations, and next steps."

---

### SCENE 6 — ENTER THE APP & ARCHITECTURE (2:35 – 3:05)

**🎬 ACTION:** Scroll back up and click "अतिथि के रूप में जारी रखें" (Continue as Guest)

**🗣️ NARRATION:**

> "Let me enter the app and show you the architecture in action.
>
> Behind this simple interface is a multi-agent system built on Google ADK. A Coordinator Agent receives the farmer's query, triages the intent, and routes to one of 9 specialist agents — Crop Analyst, Irrigation Planner, Pest Detector, Weather Advisor, Market Advisor, and more.
>
> Each agent accesses data through 8 MCP servers — Model Context Protocol servers for weather, market, knowledge graph, RAG search, image analysis, speech, and translation.
>
> A Safety Kernel uses ADK callbacks to intercept every response — blocking banned chemicals and enforcing dosage limits."

---

### SCENE 7 — LIVE DEMO: Irrigation Query in Hindi (3:05 – 3:50)

**🎬 ACTION:** Click "पूछें" (Ask) → "कृषि शास्त्री से पूछें" (Ask Krishi Sastri)

**🗣️ NARRATION:**

> "Now let me demonstrate. I'll ask a question about irrigation in Hindi."

**🎬 ACTION:** Type: `मेरी फसल में पानी की कमी है, कितनी बार पानी दें?` and press send

**🗣️ NARRATION (while typing):**

> "I'm typing: 'My crop needs water, how often should I irrigate?'"

**🗣️ NARRATION (when response appears):**

> "The Coordinator routed this to the Irrigation Planner specialist. The response is in Hindi — optimal moisture is 55%, critical limit is 40%, with a drip irrigation strategy.
>
> It's contextual — it knows my crop is Corn and my soil is Black Clay, because every agent prompt is enriched with the farmer's digital twin data."

---

### SCENE 8 — LIVE DEMO: Pest Query & Hybrid Escalation (3:50 – 4:30)

**🗣️ NARRATION:**

> "Now a pest problem."

**🎬 ACTION:** Type: `मेरी फसल में कीट लग गए हैं, पत्तियाँ खा रहे हैं` and press send

**🗣️ NARRATION (when response appears):**

> "This routed to the Crop Pathologist agent. It identified the symptoms and prescribed an organic remedy — wood ash applied to leaf whorls.
>
> And it's offering to escalate to the Expert. This is the hybrid intelligence model — local offline AI for routine questions, cloud Gemini 2.5 Flash for complex diagnoses. Zero API cost for voice, minimal cost for expert escalation only when needed."

---

### SCENE 9 — COURSE CONCEPTS & CLOSING (4:30 – 5:00)

**🎬 ACTION:** Switch to GitHub repo tab

**🗣️ NARRATION:**

> "This project demonstrates 5 course concepts: Google ADK multi-agent system, 8 MCP servers, Security features via the Safety Kernel, Deployability with Docker and Terraform, and Agent Skills using agents-cli.
>
> Krishi Sampark shows how multi-agent AI can address real-world challenges in agriculture — bringing AI-driven agronomic wisdom to the last-mile farmer, in their language, even offline.
>
> Thank you."

**🎬 ACTION:** Stop recording

---

## Post-Recording

1. **Review the recording** — watch it once to check audio and screen quality
2. **Trim if needed** — use QuickTime or iMovie to cut any dead air at start/end
3. **Upload to YouTube** — set visibility to **Public**
4. **Copy the video URL**
5. **Attach to Kaggle Writeup** — add to Media Gallery and reference in the writeup

---

## Quick Reference — Shot List

| Scene | Time | Screen | Key Action |
|---|---|---|---|
| 1. Problem & Vision | 0:00–0:35 | Landing hero | Narrate 500M farmers problem |
| 2. Who It's For | 0:35–1:05 | Hero section | Voice-first, low-literacy farmers |
| 3. Trust Badges | 1:05–1:35 | Scroll to trust | Offline, multilingual, safe, expert, privacy |
| 4. Six Features | 1:35–2:10 | Feature cards | Ask, Photo, Soil, Market, Plan, Expert |
| 5. How It Works | 2:10–2:35 | How it works | 3 steps: setup, ask, get guidance |
| 6. Enter App | 2:35–3:05 | Click Guest | Narrate ADK + MCP + Safety Kernel |
| 7. Demo: Irrigation | 3:05–3:50 | Chat | Type Hindi question → Irrigation Planner response |
| 8. Demo: Pest | 3:50–4:30 | Chat | Type pest question → Pathologist + escalation |
| 9. Concepts & Close | 4:30–5:00 | GitHub repo | 5 concepts + closing |