# 6. Feature Specification: Dictionary Exporter

## 1. Executive Summary
Understanding table structures, fields, references, and maximum lengths is vital for building integrations, client scripts, or database queries. Navigating to the ServiceNow Dictionary (`sys_dictionary`) or Table Columns list is slow, filters out inherited fields from parent tables, and lacks quick download utilities.

The **Dictionary Exporter** (also known as the *Schema Exporter*) queries the data schema for any table on the instance. It recursively traces parent-table inheritance hierarchies, merges inherited fields with local dictionary fields, and formats the table schema into a clean CSV or JSON download package.

---

## 2. Key Capabilities

### A. Auto-Detect Table Context
- **Description:** Scans the active browser tab's URL to automatically detect the current table name.
- **Mechanism:** Detects standard ServiceNow table URL query structures (e.g. `incident_list.do`, `sys_user.do?sys_id=...`) to determine the target table context.

### B. Recursive Inheritance Resolution
- **Description:** Rather than querying only the fields directly belonging to the local table, the exporter queries the parent table path.
- **Table Extension Chain:** Recursively queries `sys_db_object` for `super_class` parentage until it reaches the root table (e.g. `incident` extends `task`).
- **Unified Querying:** Queries the dictionary schema for all tables in the extension list, combining inherited fields (like `sys_created_on` or `assigned_to` from `task`) with local fields (like `severity` on `incident`).

### C. Download Formatting
- **Description:** Compiles table columns, column labels, types, reference targets, and max lengths.
- **Formats Supported:**
  - **CSV:** Renders comma-separated values mapping readable titles, backend fields, data types, references, and lengths.
  - **JSON:** Renders clean JSON payloads representing schema configurations.

---

## 3. Technical Architecture & Security
- **Endpoints Used:**
  - Table Class Info: `/api/now/table/sys_db_object` (GET)
  - Dictionary Query: `/api/now/table/sys_dictionary` (GET)
- **Security Context:** Runs via standard REST APIs, using the user's active session. It does not run inline javascript evaluators (preventing CORS or newer instance blockages).

---

## 4. UI/UX Interface Design
- **Header:** Displays title.
- **Input Controls:** Table input field (`#schemaTableInput`) and an **Auto-Detect** button (`#btnDetectTable`).
- **Action Buttons:** Dual download buttons (**Download CSV** and **Download JSON**).
- **Status Log:** Dynamic status element (`#schemaStatus`) detailing lookup counts or search errors.

---

## 5. API Contracts & JavaScript functions

### A. `SNOW_API._getTableHierarchy(tableName)`
- **Mechanism:** Recursively queries parent database schemas.
- **Returns:** String array: `['incident', 'task']`

### B. `SNOW_API.exportDictionary(tableName)`
- **Query Parameter:** `nameIN[tableName,parentTables]^internal_type!=collection`
- **Fields Queried:** `element`, `column_label`, `internal_type`, `reference`, `max_length`
- **Returns:** Field arrays containing schema configurations:
  ```json
  [
    {
      "element": "short_description",
      "column_label": "Short description",
      "internal_type": "string",
      "reference": "",
      "max_length": "160"
    },
    {
      "element": "caller_id",
      "column_label": "Caller",
      "internal_type": "reference",
      "reference": { "value": "sys_user" },
      "max_length": "32"
    }
  ]
  ```
