# 11. Feature Specification: Instance Health (Stats.do)

## 1. Executive Summary
Monitoring instance performance, memory footprints, active node statistics, and release versions in ServiceNow is vital for deployment maintenance. Extracting this data requires navigating to `/stats.do` and reading through unformatted, complex system statistics.

The **Instance Health Stats** feature retrieves `stats.do` parameters, parses the key metrics (such as Memory usage, Servlet response times, ServiceNow version, and database pool sizing), and presents them in a formatted dashboard widget directly within the extension.

---

## 2. Key Capabilities

### A. Stats.do Content Scraper
- **Description:** Pulls the raw `/stats.do` servlet page payload.
- **Parsing Engine:** Uses DOM parsing and regular expression matching to convert unformatted logs into structured metrics.

### B. Core Health Diagnostics Dashboard
Displays high-level health parameters, including:
1. **ServiceNow Release Build:** Operating version and patch level.
2. **Memory Footprint:** Free Memory vs. Max Allocated Memory.
3. **Instance Response Metrics:** Servlet processor speed and active session counts.
4. **Database Connection Pool:** Available active DB connections vs. total DB capacity.

---

## 3. Technical Architecture & Security
- **Endpoints Used:** `/stats.do` (GET)
- **Security Context:** Runs via the active browser session. Access requires default developer or administrator visibility constraints.

---

## 4. UI/UX Interface Design
- **Header:** Displays title and status indicators.
- **Diagnostics Grid:** Display cards showing:
  - **Version Card:** Release, build date, and patch tags.
  - **Memory Card:** Dynamic progress bars mapping memory usage percentages.
  - **Database Card:** Active pool size statistics.
- **Refresh Control:** A refresh button (**Reload Stats**) to retrieve the latest real-time stats.

---

## 5. API Contracts & JavaScript functions
- **Fetch Stats:** `SNOW_API.fetchStatsDo()`
  - **Endpoint:** `/stats.do`
  - **Parser Extraction Logic:**
    ```javascript
    const memoryRegex = /Free memory: ([\d,]+) bytes.*Max memory: ([\d,]+) bytes/;
    const versionRegex = /Build name: ([\w\-]+)/;
    ```
