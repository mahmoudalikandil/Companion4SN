# 6. Feature Specification: Scope & Update Set Switcher

## 1. Executive Summary
Developing custom applications in ServiceNow requires trackable changes. Developers must ensure they are working in the correct Application Scope and saving modifications to the correct active Update Set. Switching these settings inside ServiceNow normally requires opening the settings picker at the top-right corner, waiting for lists to load, selecting values, and reloading.

The **Scope & Update Set Switcher** enables developers to search, select, and switch their active Application Scope and active Update Set directly from the extension popup in seconds, automatically applying changes and reloading the active browser window.

---

## 2. Key Capabilities

### A. Live Scope Finder
- **Description:** Queries and retrieves active application scopes via the Table API.
- **Filtering:** Includes a dynamic search filter (`#scopeSearch`) to filter the dropdown options instantly.
- **Table Queried:** `sys_scope` (filtered to `active=true` to show only active application scopes).

### B. Contextual Update Set Searcher
- **Description:** Automatically retrieves "In Progress" update sets matching the selected application scope.
- **Search Auto-Complete:** Typing in the update set search bar (`#updateSetSearch`) triggers a debounced query that searches for update sets by name on the server.
- **Table Queried:** `sys_update_set` (filtered to `state=in progress` and scoped to the active application).

### C. Unified Selection Apply
- **Description:** Updates both settings in a single action.
- **Mechanism:** Sends concurrent PUT calls to the ServiceNow concourse application picker and update set picker endpoints.

---

## 3. Technical Architecture & Security
- **Endpoints Used:**
  - Scopes: `/api/now/table/sys_scope` (GET)
  - Update Sets: `/api/now/table/sys_update_set` (GET)
  - Apply Scope: `/api/now/ui/concoursepicker/application` (PUT)
  - Apply Update Set: `/api/now/ui/concoursepicker/updateset` (PUT)
- **Security Context:** Operations require administrator or developer-specific write access permissions to modify session metadata picker states.

---

## 4. UI/UX Interface Design
- **Header:** Displays title.
- **Scope Section:** An autocomplete filter input and select dropdown list (`#scopeSelect`).
- **Update Set Section:** A debounced search input field and select dropdown list (`#updateSetSelect`).
- **Action Button:** A primary action button (**Apply Changes**) that reloads the browser tab upon success.

---

## 5. API Contracts & JavaScript functions

### A. `SNOW_API.fetchScopes()`
- **Endpoint:** `/api/now/table/sys_scope?sysparm_query=active=true&sysparm_fields=sys_id,name,scope`
- **Returns:** Scopes array structure:
  ```json
  [
    { "sys_id": "global", "name": "Global" },
    { "sys_id": "c138d6a71b35cf44e25dc45e143bcba1", "name": "Catalog Cloner App" }
  ]
  ```

### B. `SNOW_API.fetchUpdateSets(scopeId, searchTerm, limit)`
- **Query Parameters:** Filters update sets that are in-progress and match name filters.
- **Returns:** Update sets array structure:
  ```json
  [
    {
      "sys_id": "a660ca54c3f5cf5429d17fedd40131ff",
      "name": "Cloner UI Fixes"
    }
  ]
  ```

### C. `SNOW_API.setUpdateSetAndScope(scopeId, updateSetId)`
- **Payloads:**
  - Application Scope PUT: `{ "app_id": "[scopeId]" }`
  - Update Set PUT: `{ "sysId": "[updateSetId]" }`
