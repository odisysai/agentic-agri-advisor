# 📜 Project History of Changes & Transformations

This document maintains a running history of all architectural upgrades, bug fixes, PWA conversions, and edge intelligence integrations in the **Agentic Agriculture Advisor (AAA)** codebase.

---

## 📅 July 06, 2026

### 1. 🎨 Landing Page Redesign & Multilingual Support
*   **Full multilingual landing page (`ui/landing.js`):** Replaced placeholder translation stubs (`[HI]`, `[MR]`, `[TE]`, `[SW]` prefixes) with real translations for all 5 languages (Hindi, Marathi, Telugu, Swahili) covering every `data-i18n` key on the landing page — header nav, hero, feature cards, how-it-works, trust strip, footer, and guest modal.
*   **Guest onboarding form (`ui/index.html`, `ui/landing.js`):** Expanded the guest login modal to collect minimum farm info: Name (required), Email (optional), Location (free-form text, required), Soil Type (required), Field Size in Acres (required), Primary Crop (required). Removed the "Skip" button — users must provide info. Profile is saved via `/api/profile/user` after guest login, redirecting directly to `/app/home`.
*   **Hero section cleanup:** Removed floating chips (🎙️ Voice, 📷 Photo, 📈 Market) that were covering the hero image. Made the "Works even with limited internet" panel semi-transparent (55% opacity) and narrower (230px) so the hero image is clearly visible.
*   **Language persistence:** Landing page now restores saved language from `localStorage('aaa_preferred_language')` instead of always defaulting to English.

### 2. 📱 Responsive Design & Device Adaptation
*   **Shared device detection (`ui/device.js` — new):** Created a lightweight utility that classifies viewport as mobile (<768px), tablet (768–1023px), or desktop (≥1024px). Detects orientation, touch capability, connection type. Sets `data-device`, `data-orientation`, `data-touch` attributes on `<html>` for CSS targeting. Emits `device:change` event on viewport transitions.
*   **Hamburger menu (`ui/index.html`, `ui/landing.css`, `ui/landing.js`):** Added slide-in nav drawer for tablet/mobile (≤900px). Hamburger button with animated icon (three lines → X). Backdrop overlay to close drawer. Replaces the hidden nav links.
*   **Fluid typography & spacing (`ui/landing.css`):** All headings use `clamp()` for smooth scaling. Auto-fit grids (`repeat(auto-fit, minmax(min(100%, 280px), 1fr))`) for feature cards and trust strip. Fluid padding with `clamp()`.
*   **Internal app responsive improvements (`ui/agui/styles.css`):** Fluid chat pane width (`clamp(300px, 32vw, 420px)`). Fluid content padding (`clamp(0.75rem, 2vw, 1.5rem)`). Touch optimizations via `@media (pointer: coarse)` ensuring 44px minimum tap targets. Desktop fine-tuning for ≥1400px.
*   **PWA manifest fix (`ui/manifest.webmanifest`):** Changed `orientation` from `"portrait-primary"` to `"any"` to allow landscape on tablets. Added `viewport-fit=cover` meta tag for notch support.
*   **Design documentation (`docs/03-design/responsive-design.md` — new):** Comprehensive document covering device detection, breakpoints, fluid patterns, layout diagrams, touch optimizations, theme system, and verification results. Updated `navigation-and-screen-flow.md` and `farmer-ux-guidelines.md` with cross-references.

### 3. 🌗 Light Theme Overhaul
*   **Default theme switched to light (`ui/agui/index.html`, `ui/agui/styles.css`):** Changed body class from `dark-theme` to `light-theme`. Updated CSS variables: warm cream background (`#f5f7f4`), white cards, softer borders, larger border radius (20px), softer shadows. Green gradient header (`linear-gradient(135deg, #2C6B37, #4CAF50)`). White text on header. Frosted glass language selector. Dark theme still available via 🌙 toggle.
*   **Removed phone bezel:** Mobile shell is now full-width with no border/radius/shadow — fills the entire viewport.

### 4. 📝 Multi-Field Onboarding & Field Management
*   **Enhanced onboarding schema (`ui/schemas/farmer_onboarding.json`):** Split into two sections: farmer profile (name, language, region as free-form text) and first field (field name, acres, soil, crop, irrigation type). Added "Add Another Field" button alongside "Save & Start Advising".
*   **Add field schema (`ui/schemas/add_field.json` — new):** Form for adding additional fields with field name, acres, soil, crop, irrigation. "Save Field" button saves and re-shows the form for more fields. "Done — Go to Dashboard" button finishes.
*   **More screen field management (`ui/schemas/more_screen.json`):** Added "🌱 My Fields" option (shows list of all fields with edit buttons) and "➕ Add New Field" option (opens add-field form directly).
*   **Field list view (`ui/agui/dashboard.js`):** `renderFieldsList()` function lists all fields with name, crop, acres, soil. Each field has an Edit button. Add New Field button at bottom. Shows empty state message if no fields.
*   **Action handlers (`ui/agui/dashboard.js`):** `ADD_FIELD_ONBOARDING`, `SAVE_ADDITIONAL_FIELD`, `CANCEL_ADD_FIELD`, `NAVIGATE_FIELDS`, `ADD_FIELD_FROM_MORE`, `EDIT_FIELD`.
*   **Onboarding flow fix:** Google users with no fields are now automatically prompted with the onboarding form. Fixed race condition where `savedRoute` restoration and `switchTab('home')` calls were overriding the onboarding tab switch. Skipped `savedRoute` restoration when on `/onboarding` route.

### 5. 🌍 Translation Fixes
*   **Duplicate label fix (`ui/agui/translations.js`):** Fixed all onboarding field labels in Hindi (खेत), Marathi (शेत), Telugu (పొలం), and Swahili (shamba) that were all set to the word for "field" instead of proper translations. Each label now has the correct translated value (e.g., "आपका नाम" for Your Name, "पसंदीदा भाषा" for Preferred Language, etc.).
*   **Missing onboarding keys:** Added `onboarding.title`, `onboarding.subtitle`, `onboarding.field1.title`, `onboarding.field1.subtitle`, `onboarding.fields.fieldname.*`, `onboarding.fields.irrigation.*`, `onboarding.action.addfield`, `addfield.*` to all 4 non-English language sections.
*   **More screen items:** Added `more.items.fields.label/desc`, `more.items.addfield.label/desc`, `fields.action.edit`, `fields.empty` to all 5 languages.
*   **Region placeholder:** Added `onboarding.fields.region.placeholder` to all 5 languages.
*   **Language switch schema reload:** Fixed language selector to check both bottom nav (mobile) and left nav (desktop) for active tab. Added `currentSchemaName` tracking so the correct schema (e.g., `farmer_onboarding` instead of `more_screen`) is reloaded when language changes.

### 6. 🔧 A2UI Renderer Fixes
*   **Form field type support (`ui/a2ui/app.js`):** Added support for `"type": "text"` and `"type": "number"` field types in the form renderer (previously only `"type": "select"` and `"type": "input"` were handled — text and number fields were silently skipped, showing only labels without input fields).
*   **Buttons component (`ui/a2ui/app.js`):** Added support for `"type": "buttons"` (plural) which renders multiple buttons from an `items` array with `commandId` actions and `variant` styling (primary/ghost). Previously only `"type": "button"` (singular) was supported.
*   **Select value fix (`ui/a2ui/app.js`):** Fixed select option values to use the raw `optionValue` instead of `String(optionValue).toLowerCase()` which was causing mismatched values for options like "Black Clay (Cotton Soil)".
*   **Ghost button styling (`ui/agui/styles.css`):** Added `.a2ui-btn.ghost` class with panel background, border, and no shadow.

### 7. 🐛 Critical Bug Fixes
*   **`updateActiveTabHighlight` race condition:** Fixed `loadSchema` to skip `updateActiveTabHighlight` when an explicit `targetCanvasId` is provided. Previously, `loadSchema('add_field', 'more-canvas')` would render the form, then call `updateActiveTabHighlight` which called `switchTab('more', true)`, causing a race condition that loaded the farm/telemetry schema instead of the add-field form.
*   **Schema-to-tab mapping:** Added `farmer_onboarding` and `add_field` to `updateActiveTabHighlight`'s 'more' tab mapping (was defaulting to 'home', causing the tab to switch back after onboarding loaded).
*   **Duplicate card title:** Removed duplicate `titleKey` from card level in `farmer_onboarding.json` and `add_field.json` (was rendering the title twice — once from the card and once from the header component).
*   **Schema cache busting:** Added `window.SCHEMA_VERSION` variable and bumped versions to force browser to reload updated schema JSON files.

---

## 📅 July 01, 2026

### 1. 🧠 Progressive Web App (PWA) & Offline Capability
*   **Installable Application Manifest ([ui/manifest.webmanifest](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/ui/manifest.webmanifest)):**
    *   Added support for home screen installation, configured brand green themes (`#2C6B37`), standalone viewports, and launch short-cuts for diagnostics and irrigation planners.
*   **Asset Pre-caching Service Worker ([ui/sw.js](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/ui/sw.js)):**
    *   Caches crucial HTML templates, stylesheets, JS files, and Outfit google web fonts.
    *   Employs a **cache-first** caching policy for static assets and a **network-first** policy for profiles.
    *   Exposes custom fallback JSON mock payloads when offline to ensure uvicorn API routes don't crash.
*   **Startup Register:** Updated the main landing page ([ui/agui/index.html](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/ui/agui/index.html)) to register the service worker thread and link the manifest headers.

### 2. 📷 Client-Side Camera Capture Viewfinder
*   **Rear Camera prioritize stream ([ui/agui/camera.js](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/ui/agui/camera.js)):**
    *   Accesses system media streams utilizing `navigator.mediaDevices.getUserMedia()`, prioritizes the rear lens (`facingMode: "environment"`), and captures frames on a canvas block.
*   **Upload File Fallback:** Integrates standard local upload buttons (`<input type="file">`) when camera access is blocked or unsupported.
*   **Modal Viewer Panels:** Created visual modal viewfinder overlay frames, capture snapshots, and analyze indicators directly within the chat portals.

### 3. 🔬 Edge AI & Visual Pathology Models
*   **Browser GenAI Inference Manager ([ui/agui/local_models.js](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/ui/agui/local_models.js)):**
    *   Integrated MediaPipe Web LLM Inference API (`@mediapipe/tasks-genai`) loading in WebGPU caches (`Gemma 2B` / `Phi-2`).
    *   Implemented Cache API checking and unmetered storage for the Gemma model weights inside `gemma-model-cache` to avoid duplicate downloads.
    *   Added network-aware download streams tracking real fetch progress percentages via response readers, with automated local dialogue simulator fallback on hardware/network issues.
    *   Pre-caches a lightweight Plant Disease Classifier model TFLite file (`~15MB`) under `ui/models/` for offline leaf pathology checks.
    *   Added a local agronomic rule-based response generator formatting outputs offline in Hindi, Marathi, Telugu, Swahili, and English.
*   **Model Downloader Interface:** Placed a "Load Offline AI" button next to selectors in `index.html` to download and cache the Gemma model dynamically.

### 4. 💾 IndexedDB Caching & Hybrid Routing
*   **IndexedDB Store ([ui/agui/local_db.js](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/ui/agui/local_db.js)):**
    *   Stores farmer profiles, offline chat records, and pending telemetry queues.
*   **Hybrid Connectivity Router ([ui/agui/dashboard.js](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/ui/agui/dashboard.js)):**
    *   Listens to connection events. Updates the header banner (`Offline Edge AI` vs `Agents Online`).
    *   Triage text queries directly to client WebGPU Gemma loops if offline or uvicorn requests time out.
    *   Queues offline telemetry updates and automatically pushes them to the FastAPI backend when connection resumes.

### 5. 🛠️ Critical Bug Fixes
*   **Agent module load:** Fixed a missing `root_agent` export in [app/agent.py](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/app/agent.py) preventing pytest integration tests from loading.
*   **Feedback 500 error:** Appended a proper dict return value and wrapped the cloud logging call in a `try-except` block within `/feedback` inside [app/fast_api_app.py](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/app/fast_api_app.py) to resolve FastAPI validation errors.
*   **Port Binding conflicts:** Migrated both the integration test suite and the main application server [app/fast_api_app.py](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/app/fast_api_app.py) default binding ports from `8000` to `8009` (configurable via `PORT` env var) to completely bypass conflicts with local services like `omlx-server` active on port 8000.

### 6. 📚 Project Documentation Guides
*   **[TECHNICAL_ARCHITECTURE.md](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/docs/TECHNICAL_ARCHITECTURE.md):** Architectural manuals detailing agents, databases, simulator sandbox variables, and layout frameworks.
*   **[PWA_LLM_IMPLEMENTATION_PLAN.md](file:///Users/nalin.giri/workspaces/agentic-agri-advisor/docs/PWA_LLM_IMPLEMENTATION_PLAN.md):** Actionable implementation roadmap for client edge models, IndexedDB layers, and offline classifiers.
