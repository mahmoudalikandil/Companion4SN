# Privacy Policy for Companion4SN

_Last updated: October 31, 2026_

Companion4SN ("the extension", "we", "us", or "our") is a developer productivity Chrome extension designed to assist ServiceNow developers, administrators, and architects with debugging, building, and inspecting their ServiceNow instances directly from their browser.

This Privacy Policy describes our practices regarding the collection, use, storage, and disclosure of personal and sensitive data when you use the Companion4SN extension.

---

## 1. Core Principle: Zero External Telemetry & Local Processing

**Summary:** Companion4SN does **not** collect, store, sell, or transmit any user data, credentials, browsing activity, or ServiceNow instance data to any external server, analytics service, third party, or developer-owned backend. 

All communications occur strictly between your local browser and the active ServiceNow instance URL that you are actively signed in to.

---

## 2. Personal and Sensitive Data Handled

When you interact with the extension, the following data types may be accessed locally in your browser:

### A. ServiceNow Instance Connection & Session Data
* **Instance URL:** The hostname of your active ServiceNow tab (e.g., `https://your-instance.service-now.com`). Used solely to direct API requests to your instance.
* **Session Token (`g_ck` / User Token):** The existing session authentication token exposed by the ServiceNow client interface in your browser tab. Used exclusively to authenticate requests initiated through the extension on your behalf, obeying your account's exact existing Access Control Lists (ACLs) and security roles.
* **Credentials:** If you utilize the Integration Studio (HTTP method tester) with Basic Authentication, username and password values you enter are used only to construct the local Authorization header for that specific request. They are never sent to external servers or logged.

### B. ServiceNow System & Metadata Records
While utilizing developer tools (such as Schema Exporter, Catalog Item Cloner, User Role Analyzer, XML Payload Studio, Background Script Runner, or Instance Stats), the extension requests and displays instance data (e.g., catalog items, variables, user names, role hierarchies, update sets, system logs, and transaction status). This data is displayed strictly in the extension interface in your browser and is never stored externally.

### C. Uploaded Files
* **Excel Spreadsheets (.xlsx):** When using the Bulk Item Builder, spreadsheets you drag-and-drop or upload are read and processed entirely in memory inside your browser using the local `xlsx` library. Contents are submitted strictly to your ServiceNow instance when you click "Commit".

---

## 3. Chrome Permissions & Why They Are Needed

In accordance with the Chrome Web Store Minimum Permissions Policy, Companion4SN only requests permissions strictly required to deliver its core functionality:

| Permission | Purpose |
| :--- | :--- |
| `activeTab` | Access the active ServiceNow browser tab to read the instance URL and context when you click "Initialize Bridge". |
| `tabs` | Query the active ServiceNow tab URL and trigger page reloads when you switch scopes, switch update sets, or execute rapid impersonation. |
| `scripting` | Execute bridge helper scripts in the active tab context to read session tokens and context without requiring elevated web access. |
| `storage` | Store temporary tracking state in `chrome.storage.local` exclusively for the Background Flow Tracker. |
| `webNavigation` | Detect tab navigation events on ServiceNow instances to refresh connection state when navigating between instance pages. |
| `notifications` | Display a standard Chrome desktop notification when a background flow execution completes or encounters an error. |
| `alarms` | Periodically wake the service worker to poll background flow execution status until completion. |
| `*://*.service-now.com/*` (Host Permission) | Restrict network requests exclusively to official ServiceNow instances to communicate via standard ServiceNow REST APIs. |

---

## 4. Data Storage, Retention, and Deletion

* **Ephemeral Memory:** By default, all instance data, logs, schemas, and query results exist only in browser memory and are discarded as soon as the extension popup window is closed.
* **Local Storage (`chrome.storage.local`):** The only persistent data stored by the extension is for the **Background Flow Tracker**. If you track a Flow execution, the Flow Sys ID, instance URL, and active session token are temporarily stored in `chrome.storage.local` so the background worker can monitor the flow while the popup is closed.
* **Data Deletion:** 
  * Background tracking data is automatically deleted immediately upon flow completion, cancellation, or error.
  * You can delete all extension data at any time by uninstalling the extension or clearing your browser's extension data via `chrome://settings/clearBrowserData`.

---

## 5. Third-Party Sharing and Disclosure

* **No Third-Party Transmission:** We do **not** sell, rent, monetize, trade, or transfer any user data, personal information, or customer instance data to any third party.
* **No Analytics or Trackers:** Companion4SN does not contain Google Analytics, telemetry SDKs, crash trackers, or advertising frameworks.
* **Fonts:** The extension UI loads standard web fonts (Poppins/Roboto) via standard HTTPS requests from Google Fonts (`fonts.googleapis.com`). No personal user data is sent with font requests.

---

## 6. Chrome Web Store User Data Policy & Limited Use Compliance

Companion4SN strictly complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements:

1. **Single Purpose:** The extension uses data exclusively to provide and enhance its single stated purpose: a live ServiceNow developer companion and diagnostic tool.
2. **No Data Selling:** User data is never sold or provided to data brokers.
3. **No Advertising or Profiling:** User data is never used or transferred for personalized advertising, credit assessment, or lending purposes.
4. **Human Interaction:** No human reads your data unless you explicitly provide it for support or debugging inquiries.

---

## 7. Children's Privacy

Companion4SN is a developer utility designed for enterprise software engineers and administrators. It is not intended for, nor directed toward, children under the age of 13.

---

## 8. Changes to This Privacy Policy

We may periodically update this Privacy Policy to reflect changes in extension features or regulatory requirements. Any revisions will be published with an updated "Last updated" date at:
https://github.com/mahmoudalikandil/Companion4SN/blob/main/PRIVACY.md

---

## 9. Contact Information

If you have any questions, concerns, or requests regarding this Privacy Policy or your data privacy, please contact the developer directly:

* **Developer / Publisher:** Mahmoud Kandil
* **Email:** [mahmoudalikandil1996@gmail.com](mailto:mahmoudalikandil1996gmail.com)
* **GitHub Issues:** [https://github.com/mahmoudalikandil/Companion4SN/issues](https://github.com/mahmoudalikandil/Companion4SN/issues)

---

_Disclaimer: ServiceNow is a registered trademark of ServiceNow, Inc. Companion4SN is an independent, open-source developer tool and is neither affiliated with, endorsed by, nor sponsored by ServiceNow, Inc._
