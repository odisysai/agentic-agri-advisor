# Krishi Sampark — Kaggle Capstone Video Script

**Duration:** ~5 minutes
**Format:** Screen recording + voiceover narration
**Recording:** Cmd + Shift + 5 on Mac (screen recording)
**Upload:** YouTube as Public video

---

## Recording Setup

1. Open `http://localhost:8000/` in Chrome (maximize window)
2. Set language to Hindi (dropdown → Hindi) before recording
3. Have a farmer profile saved (so onboarding doesn't appear)
4. Open the architecture diagram from README.md in a separate tab
5. Start screen recording with Cmd + Shift + 5
6. Read each section's narration while performing the on-screen actions
7. Pause briefly between sections to let the screen catch up

---

## SCENE 1: Problem Statement (0:00 – 0:45)

**ON SCREEN:** Show the landing page at `http://localhost:8000/`

**NARRATION:**

> "Over 500 million smallholder farmers across India and East Africa face a daily struggle — crop diseases, irrigation decisions, market volatility, and weather risks — all without access to agronomic expertise.
>
> Existing agricultural apps fail them in three ways: they need constant internet, they require English literacy, and they give generic advice without safety validation.
>
> I built Krishi Sampark — an offline-first, voice-first, multi-agent agriculture advisor that works in 6 languages, even without internet. Let me show you how."

---

## SCENE 2: Why Agents? (0:45 – 1:15)

**ON SCREEN:** Switch to the architecture diagram tab (README.md Mermaid diagram, or take a screenshot to show)

**NARRATION:**

> "A single LLM can't be an agronomist, meteorologist, market analyst, and pest pathologist all at once — it hallucinates and gives generic responses.
>
> So I used a multi-agent architecture with Google ADK. A Coordinator Agent receives the farmer's query, triages the intent, and routes to one of 9 specialist agents — Crop Analyst, Irrigation Planner, Pest Detector, Weather Advisor, Market Advisor, and more.
>
> Each agent has narrow domain expertise, which reduces hallucinations and improves accuracy."

---

## SCENE 3: Architecture Overview (1:15 – 2:00)

**ON SCREEN:** Keep showing the architecture diagram, scroll through it slowly

**NARRATION:**

> "Here's the architecture. At the top, the farmer interacts through a Progressive Web App with voice and text input.
>
> The agent layer is built on Google ADK — 10 agents coordinated by a central orchestrator.
>
> Agents access external data through 8 MCP servers — Model Context Protocol servers for weather, market prices, knowledge graph, RAG search, image analysis, speech-to-text, text-to-speech, and translation. This decoupled design lets me swap data sources without touching agent code.
>
> The Safety Kernel uses ADK callbacks to intercept every agent response — blocking banned chemicals, enforcing dosage limits, and escalating uncertain diagnoses to human experts.
>
> And it all works offline thanks to an in-browser Gemma 2B model and IndexedDB local data twin."

---

## SCENE 4: Live Demo — Voice Query in Hindi (2:00 – 3:30)

**ON SCREEN:** Switch to the app. Click on "पूछें" (Ask) tab → "कृषि शास्त्री से पूछें" (Ask Krishi Sastri)

**NARRATION:**

> "Now let me demo the app. The interface is in Hindi. Let me ask a question about irrigation."

**ACTION:** Type in the input box: "मेरी फसल में पानी की कमी है, कितनी बार पानी दें?" (or use the mic button to speak it)

**NARRATION (while typing):**

> "I'll type a question in Hindi: 'My crop needs water, how often should I irrigate?'"

**ACTION:** Press send, wait for the response

**NARRATION (when response appears):**

> "The Coordinator agent routed this to the Irrigation Planner specialist. The response is in Hindi — it tells me the optimal moisture level is 55%, the critical limit is 40%, and recommends a drip irrigation strategy with small frequent cycles.
>
> Notice the response is contextual — it knows my crop is Corn and my soil is Black Clay, because every agent prompt is enriched with the farmer's digital twin data."

---

## SCENE 5: Live Demo — Pest Query & Safety (3:30 – 4:15)

**ON SCREEN:** Stay in the chat

**NARRATION:**

> "Now let me ask about a pest problem."

**ACTION:** Type: "मेरी फसल में कीट लग गए हैं" and press send

**NARRATION (when response appears):**

> "This time it routed to the Crop Pathologist agent. It identified the symptoms and prescribed an organic remedy — neem oil spray — in Hindi.
>
> And notice — it's offering to escalate to the Expert. This is the hybrid intelligence model. For routine questions, the local Krishi Sastri agent handles it offline. For complex diagnoses, it escalates to a cloud Gemini 2.5 Flash agent."

**ACTION:** Point to the escalation prompt (don't click it, just mention it)

---

## SCENE 6: Course Concepts & Build (4:15 – 4:45)

**ON SCREEN:** Switch to GitHub repo page (https://github.com/girinalin/agentic-agri-advisor) or show the README

**NARRATION:**

> "This project demonstrates 5 course concepts:
>
> First — Google ADK multi-agent system with 10 agents.
> Second — 8 MCP servers for standardized tool access.
> Third — Security features via the Agricultural Safety Kernel with ADK callbacks.
> Fourth — Deployability with Docker, Terraform, and Cloud Run.
> Fifth — Agent Skills using agents-cli for scaffolding and development.
>
> The code is open source on GitHub with full documentation, tests, and setup instructions."

---

## SCENE 7: Closing (4:45 – 5:00)

**ON SCREEN:** Show the landing page again, or a nice screenshot of the app

**NARRATION:**

> "Krishi Sampark shows how multi-agent AI can address real-world challenges in agriculture — the most critical domain for human survival. By combining offline-first architecture, voice-first interaction, safety-validated guidance, and multilingual support, we're bringing AI-driven agronomic wisdom to the last-mile farmer — in their language, even offline.
>
> Thank you."

---

## Recording Tips

1. **Speak slowly and clearly** — you have 5 minutes, no need to rush
2. **Pause between scenes** — let the screen actions complete before continuing narration
3. **If you make a mistake** — just pause, re-do the scene, and edit later in iMovie or QuickTime
4. **Test the demo first** — make sure the app is working before you start recording
5. **Good lighting & audio** — use a quiet room, consider using a headset mic for clearer audio
6. **Browser fullscreen** — hide bookmarks bar for a cleaner look (Cmd + Shift + B to toggle)

## After Recording

1. Trim the video if needed (QuickTime or iMovie)
2. Upload to YouTube as **Public**
3. Copy the video URL
4. Attach to Kaggle Writeup Media Gallery
5. Add the video URL to the Writeup

---

## Quick Reference — Demo Flow

| Time | Screen | Action |
|---|---|---|
| 0:00 | Landing page | Narrate problem |
| 0:45 | Architecture diagram | Narrate why agents |
| 1:15 | Architecture diagram | Narrate architecture |
| 2:00 | App → Ask → Sastri | Type Hindi irrigation question |
| 2:30 | Chat response | Narrate irrigation response |
| 3:30 | Chat | Type Hindi pest question |
| 3:45 | Chat response | Narrate pest + escalation |
| 4:15 | GitHub repo | Narrate course concepts |
| 4:45 | Landing page | Narrate closing |
| 5:00 | End | Stop recording |