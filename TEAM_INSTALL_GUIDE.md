# Team Install Guide (Build Only)

## What You Receive
A folder named `dist/` containing the built AbuseFlow extension.

## Install in Chrome
1. Unzip the package if needed.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked**.
5. Select the shared `dist/` folder.

## Verify Installation
1. Pin the extension from the Chrome toolbar.
2. Open a supported abuse/trademark form page.
3. Confirm the floating AbuseFlow button appears.

## Team Setup

### 1. Analyst Profile
1. Right-click extension icon and open **Options** (or open extension details and click **Extension options**).
2. Review Analyst Profile fields.
3. Click **Save Analyst Profile**.

### 2. Client Profiles
1. In **Client Profiles**, create or edit client entries.
2. Save each profile.

### 3. Feature Tier
In **Feature Settings**, select:
- `Core` for minimal workflow
- `Advanced` for diagnostics/run history
- `Sensei` for advanced plus case session

## Share Profiles Across Team Members

### Export (from one analyst)
1. Open **Options > Data Portability**.
2. Leave **Include analyst profile in export** unchecked (recommended).
3. Click **Download Backup File** (or **Copy Backup JSON**).

### Import (for another analyst)
1. Open **Options > Data Portability**.
2. Upload backup file (or paste JSON).
3. Select import mode:
   - **Merge (recommended)**: add or update clients
   - **Replace all existing clients**: overwrite all clients
4. Click **Import Backup**.

## Daily Usage
1. Open a supported provider form.
2. Click the floating **AbuseFlow** button.
3. Select a client profile.
4. Paste URLs (one per line).
5. Click **Autofill Current Step**.
6. Review and submit manually.

## Notes
- No automatic submission is performed.
- Client profiles are stored locally in the browser.
- To move profiles between machines, use **Data Portability** export/import.
