```markdown
# AbuseFlow

AbuseFlow is a browser extension designed to streamline repetitive abuse form submissions for analysts, CERT teams, and brand protection professionals. It autofills common fields across abuse and legal report forms while keeping the analyst fully in control of the submission process.

## ✨ Overview

Analysts often submit multiple reports across platforms (e.g., Facebook, registrars, social media, and trust & safety portals). These forms require repetitive information such as:

- Full name
- Email
- Organization / client details
- Trademark information
- Violation descriptions
- URLs being reported

AbuseFlow reduces manual effort by safely autofilling only visible fields on supported forms without automating submission or bypassing platform safeguards.

## 🧠 How It Works

1. Analyst manually opens an abuse/report form.
2. Floating AbuseFlow button appears on supported pages.
3. Analyst selects a client profile and pastes URLs.
4. Clicks **“Autofill Current Step”**.
5. Extension fills only visible, empty fields.
6. Analyst reviews, solves CAPTCHA, and submits manually.

No auto-submission. No automation of form navigation.

## 🔐 Core Principles

- Analyst-in-the-loop (human-controlled)
- No auto-submit
- No CAPTCHA bypass
- No external data transmission
- Local-only storage (Chrome storage)
- Safe, non-destructive autofill (does not overwrite filled fields)

## 🧩 Key Features

- Floating in-page autofill button (bottom-right)
- Analyst profile + multiple client profiles
- Template-based description generation
- Multi-step form detection (provider-agnostic)
- Step-aware autofill (visible fields only)
- Provider modular architecture (e.g., Facebook trademark forms)
- Clean CERT-focused UX
- Manifest V3 compliant

## 🏗 Architecture

```

src/
├── content-script.ts      # Floating UI + autofill execution
├── providers/             # Provider-specific form logic
├── utils/                 # DOM helpers, step detection, safe fill
├── storage/               # Analyst & client profile storage
├── popup/                 # Extension popup UI
└── options/               # Profile management UI

````

### Provider System
Each platform form is handled via isolated provider modules:
- Provider detection by URL
- Field mapping per form structure
- Safe, repeatable autofill logic
- No hardcoded global automation

## 🧪 Multi-Step Form Support

AbuseFlow detects:
- Continue / Next buttons
- Step indicators (e.g., “Step 1 of 3”)
- Progress bars and wizard flows

It adapts by:
- Filling only current step fields
- Allowing repeated autofill per step
- Guiding analysts instead of automating navigation

## 📦 Installation (Development)

```bash
npm install
npm run build
````

Then in Chrome:

1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click “Load unpacked”
4. Select the `dist/` folder

## ⚙️ Configuration

Configure via extension options:

* Analyst Profile (name, email, signature)
* Client Profiles (trademark, jurisdiction, description templates)

All data is stored locally using `chrome.storage.sync`.

## 🛡 Security & Compliance

* No background scraping
* No external API calls
* No form submission automation
* No DOM manipulation beyond safe field autofill
* Minimal permissions (Manifest V3)

Designed for legitimate abuse reporting, compliance workflows, and investigative operations.

## 🚀 Use Cases

* Trademark infringement reporting
* Scam and phishing reports
* Impersonation complaints
* Brand protection operations
* CERT and Trust & Safety workflows

## 📄 License

Internal / Private use unless otherwise specified.

```
::contentReference[oaicite:0]{index=0}
```
