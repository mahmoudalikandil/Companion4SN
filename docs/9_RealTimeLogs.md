# 9. Feature Specification: Real-Time Log Streamer

## 1. Executive Summary
Debugging server-side scripts, business rules, or integration flows requires checking the ServiceNow System Log (`syslog`). Navigating to `syslog_list.do`, filtering, and manually clicking refresh is slow and fragments the developer's attention.

The **Real-Time Log Streamer** (also known as the *Live Terminal*) integrates a real-time console log tailing window inside the extension. It polls the instance syslog at short intervals, filters log noise, colors outputs by log level, and updates a console viewer, keeping developers in context.

---

## 2. Key Capabilities

### A. Tail Polling Engine
- **Description:** Periodically queries the syslog table for the latest records.
- **Tailing Interval:** Polls the server every 3 seconds while active.
- **Duplicate Prevention:** Manages a client-side `seenLogIds` cache. Reverses server logs (oldest to newest) and processes only new entries.

### B. Client-side Log Level Coloring
- **Description:** Dynamically highlights messages based on log severity levels.
- **Color Rules:**
  - **Error (level 0):** Colored red.
  - **Warn (level 1):** Colored yellow.
  - **Info (level 2):** Colored blue.
  - **System notifications:** Colored green with italic text.

### C. Live Filter Matching
- **Description:** Filters the log stream dynamically.
- **Filter Inputs:** Real-time text filter (`#logFilterInput`) matching log source columns or log message contents.

---

## 3. Technical Architecture & Security
- **Endpoints Used:** `/api/now/table/syslog` (GET)
- **Tailing Query:** `ORDERBYDESCsys_created_on` (limited to latest 30 rows).
- **Tab Swapping Preservation:** Suspends the tailing loop when developers navigate away from the logs tab, saving system bandwidth and API resources.

---

## 4. UI/UX Interface Design
- **Header:** Displays title and "Polling Engine" badge.
- **Control Bar:**
  - **Start/Stop Stream** toggle button.
  - **Clear** terminal button.
  - **Filter** input text box.
- **Terminal Viewport:** A monospace console shell area (`#logTerminal`) with scroll lock mechanics to auto-scroll new entries into view.

---

## 5. API Contracts & JavaScript functions
- **Tailing Function:** `SNOW_API.fetchLogs()`
- **Query Parameter:** `/api/now/table/syslog?sysparm_query=ORDERBYDESCsys_created_on&sysparm_fields=sys_id,level,message,source,sys_created_on&sysparm_limit=30`
- **Returned Schema:**
  ```json
  [
    {
      "sys_id": "4fc3bba11b35cf44e25dc45e143bcba1",
      "level": "2",
      "source": "gs.info",
      "message": "Initializing Cloner script context...",
      "sys_created_on": "2026-06-26 21:00:00"
    }
  ]
  ```
