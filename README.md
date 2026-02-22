# AbuseFlow

AbuseFlow is a browser extension that streamlines repetitive abuse form submissions for analysts, CERT teams, and brand protection professionals. It autofills common fields across abuse and legal report forms while keeping analysts fully in control of submission.

## Overview

Analysts often submit reports across platforms (for example Facebook, registrars, social media, and trust and safety portals). These forms usually require repeated information such as:

- Full name
- Email
- Organization or client details
- Trademark information
- Violation descriptions
- URLs being reported

AbuseFlow reduces manual effort by safely autofilling only visible fields on supported forms, without automating submission or bypassing platform safeguards.

## How It Works

1. Analyst manually opens an abuse or report form.
2. A floating AbuseFlow button appears on supported pages.
3. Analyst selects a client profile and pastes URLs.
4. Analyst clicks `Autofill Current Step`.
5. The extension fills only visible, empty fields.
6. Analyst reviews, solves CAPTCHA, and submits manually.

No auto-submission. No automated form navigation.

## Core Principles

- Analyst in the loop (human-controlled)
- No auto-submit
- No CAPTCHA bypass
- No external data transmission
- Local-only storage (Chrome storage)
- Safe, non-destructive autofill (does not overwrite existing values)

## Key Features

- Floating in-page autofill button (bottom-right)
- Analyst profile and multiple client profiles
- Template-based description generation
- Multi-step form detection (provider-agnostic)
- Step-aware autofill (visible fields only)
- Provider modular architecture (for example Facebook trademark forms)
- CERT-focused UX
- Manifest V3 compliant

## Architecture

```text
src/
|-- content-script.ts      # Floating UI + autofill execution
|-- providers/             # Provider-specific form logic
|-- utils/                 # DOM helpers, step detection, safe fill
|-- storage/               # Analyst and client profile storage
|-- popup/                 # Extension popup UI
`-- options/               # Profile management UI
```

### Provider System

Each platform form is handled via isolated provider modules:

- Provider detection by URL
- Field mapping per form structure
- Safe, repeatable autofill logic
- No hardcoded global automation

## Multi-Step Form Support

AbuseFlow detects:

- Continue or Next buttons
- Step indicators (for example `Step 1 of 3`)
- Progress bars and wizard flows

It adapts by:

- Filling only current-step fields
- Allowing repeated autofill per step
- Guiding analysts instead of automating navigation

## Installation (Development)

```bash
npm install
npm run build
```

Then in Chrome:

1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `dist/` folder

## Configuration

Configure via extension options:

- Analyst profile (name, email, signature)
- Client profiles (trademark, jurisdiction, description templates)

All data is stored locally using `chrome.storage.sync`.

## Security and Compliance

- No background scraping
- No external API calls
- No form submission automation
- No DOM manipulation beyond safe field autofill
- Minimal permissions (Manifest V3)

Designed for legitimate abuse reporting, compliance workflows, and investigative operations.

## Use Cases

- Trademark infringement reporting
- Scam and phishing reports
- Impersonation complaints
- Brand protection operations
- CERT and trust and safety workflows

## License

Internal/private use unless otherwise specified.
