# 1. Feature Specification: Excel-Based Catalog Item Bulk Builder

## 1. Executive Summary
Building multiple catalog items, record producers, or order guides in ServiceNow with their corresponding related lists (variables, variable sets, UI policies) is a slow and repetitive process. Developers are forced to configure records one by one in the browser.

The **Excel-Based Catalog Item Bulk Builder** enables developers to download a structured Excel template, customize which related list sheets to include, fill out multiple catalog items and related lists offline, and upload the sheet back for automated validation and atomic database creation in ServiceNow.

---

## 2. Key Capabilities

### A. Dynamic Template Downloader
- **Description:** Pre-structures an Excel template dynamically based on checked related lists.
- **Data Validation Dropdowns:** Queries ServiceNow REST APIs during download to fetch active Scopes, Categories, and Variable Sets, embedding them directly as native dropdown validation lists inside the Excel sheets.

### B. Relational Multi-Sheet Workbook
- **Tab 1: Catalog Items:** The parent record details linked via a numeric `Item Temp ID` (e.g. `1`, `2`, `3`).
- **Tab 2: Variables:** Replicated variables linked to parent items via `Item Temp ID` reference keys.
- **Tab 3: Variable Sets:** Variable set link mappings referencing parent items.
- **Tab 4: UI Policies:** UI policies and condition logic linked to parent items.

### C. Client-Side Pre-validation & Quick-Fix
- **Description:** Scans the uploaded spreadsheet locally using **SheetJS** to identify missing required fields or validation discrepancies.
- **Popup Quick-Fix Editor:** If validation errors exist, renders an interactive grid inside the extension popup highlighting failed row/cell coordinates, allowing instant corrections and re-validation.

### D. Transactional Server-Side Execution & Dry Run
- **Dry-Run Validation:** Automatically evaluates the spreadsheet payload inside a ServiceNow transaction that performs record insertions, triggers rules, and runs validations before performing a **mandatory database rollback**.
- **Atomic Commits:** Only displays the **Commit to ServiceNow** option once the Dry Run validation succeeds without errors, ensuring zero orphaned or broken database records.

---

## 3. Technical Architecture & Security
- **Data Processor:** Encodes worksheets into a JSON payload and POSTs it to `/sys.scripts.do` to execute a transactional GlideRecord script.
- **Security Context:** Runs under the active developer session, respecting ACL validation constraints.

---

## 4. UI/UX Interface Design
- **Configuration Panel:** Checkbox selection list for optional related list sheets, with a primary **Download Template** action button.
- **Upload Drop Zone:** Drag-and-drop file target area.
- **Interactive Quick-Fix Table:** Appears on client-side validation errors, showcasing sheet names, row/cell coordinates, and a edit input field.
- **Execution Console:** Displays real-time dry-run and commit logs, unlocking a green **Commit to ServiceNow** button upon success.

---

## 5. API Contracts & JavaScript functions
- **Function:** `SNOW_API.bulkCreateCatalogItems(payload, isDryRun)`
- **Configuration JSON payload format:**
  ```json
  {
    "dry_run": true,
    "items": [
      {
        "temp_id": 1,
        "name": "Standard Laptop Request",
        "category": "Hardware",
        "scope": "global",
        "table": "sc_cat_item"
      }
    ],
    "variables": [
      {
        "item_temp_id": 1,
        "name": "asset_tag",
        "label": "Asset Tag",
        "type": "Single Line Text",
        "order": 100
      }
    ]
  }
  ```
