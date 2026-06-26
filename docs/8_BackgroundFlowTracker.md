# 8. Feature Specification: Background Flow Tracker

## 1. Executive Summary
Flow Designer executions in ServiceNow run asynchronously. Developers tracking executions must wait on the "Flow Execution Details" page, clicking refresh continuously to check if steps have succeeded or failed. Closing the tab halts oversight and distracts developers.

The **Background Flow Tracker** delegates execution monitoring to a background service worker. Developers can input a Flow Execution Sys ID, close the extension, navigate to other tabs, or code in another window. The extension service worker polls status and fires a browser push notification the exact moment the Flow finishes or errors.

---

## 2. Key Capabilities

### A. Context Auto-Detection
- **Description:** Scans the active browser tab to detect Flow Execution detail pages.
- **Mechanism:** Automatically extracts the flow context Sys ID from flow designer execution page URLs and pre-fills the input field.

### B. Persistent Background Polling
- **Description:** Runs in a persistent Chrome Extension service worker (`background.js`) to poll execution progress.
- **Worker Lifecycles:** Leverages chrome messages to spawn tracking workers.
- **Interval Check:** Polls context records at 5-second intervals.

### C. Desktop Push Notifications
- **Description:** Fires system notifications upon flow completion.
- **Notification Details:** Triggers a popup message indicating flow success (Completed) or failure (Error/Cancelled) with exact state details.

---

## 3. Technical Architecture & Security
- **Endpoints Used:** `/api/now/table/sys_flow_context/{sys_id}` (GET)
- **Service Worker Lifecycle:** Because Manifest V3 service workers terminate on inactivity, the tracker manages continuous session states using active message endpoints.
- **Security Context:** Utilizes the captured active instance domain and token.

---

## 4. UI/UX Interface Design
- **Header:** Displays title and "Service Worker" badge.
- **Input Control:** Text input field (`#flowSysIdInput`) auto-populated with detected execution sys_ids.
- **Action Button:** Track button (**Track in Background**) which disables upon activation.
- **Status Label:** Informational message field (`#flowTrackerStatus`) displaying tracking progress.

---

## 5. API Contracts & Service Worker Messaging

### A. Chrome Message Event
- **Action:** `"START_FLOW_TRACKING"`
- **Message Arguments:**
  ```json
  {
    "action": "START_FLOW_TRACKING",
    "url": "https://dev310149.service-now.com",
    "token": "g_ck_token_value",
    "sysId": "e67272821b14a010c2830f36dc4bcb45"
  }
  ```

### B. Flow Status API Query
- **Endpoint:** `/api/now/table/sys_flow_context/{sysId}?sysparm_fields=state`
- **States Checked:**
  - `WAITING` / `IN_PROGRESS` / `QUEUED`: Continues polling.
  - `COMPLETE`: Stops tracking; triggers "Flow Completed Successfully!" notification.
  - `ERROR` / `CANCELLED`: Stops tracking; triggers failure warning notification.
