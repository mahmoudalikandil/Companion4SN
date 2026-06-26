# 4. Feature Specification: Background Script Runner

## 1. Executive Summary
ServiceNow administrators routinely write server-side JavaScript scripts to test APIs, query records, or run batch jobs. Navigating to the native `/sys.scripts.do` page takes developers away from their active tabs and features a basic, non-retaining textarea interface.

The **Background Script Runner** brings a server script editor directly into the *ServiceNow Live Companion* extension popup. It allows developers to load preconfigured snippets, choose scope environments, execute server scripts, and inspect console stdout outputs without switching screens.

---

## 2. Key Capabilities

### A. Code Editor & Snippet Loader
- **Description:** A styled script editor window preloaded with common utility snippets.
- **Preconfigured Snippets:**
  - **Get 5 Recent Incidents:** GlideRecord query printing incident numbers and descriptions.
  - **Count Active Users:** GlideRecord query returning row counts of active users.
  - **Check System Property:** Queries the system language property.

### B. Application Scope Selector
- **Description:** Allows setting the target application scope for the script execution context.
- **Default Context:** Defaults to the `Global` scope, but queries and updates scopes available on the server.

### C. Stdout Extraction Parsing
- **Description:** Sends scripts to the instance's evaluator and automatically parses the console stdout.
- **Mechanism:** The REST API does not support running arbitrary script payloads directly. The extension mimics form POST requests to `/sys.scripts.do` and parses the returned HTML response, extracting the text content within the `<pre>` tag.

---

## 3. Technical Architecture & Security
- **Endpoints Used:** `/sys.scripts.do` (POST)
- **Authentication:** Attaches the active CSRF token `sysparm_ck` alongside the raw script and application scope parameters using `application/x-www-form-urlencoded` payloads.
- **Security Context:** Executing scripts has the potential to modify database states. Access is limited strictly to developers who have the `security_admin` elevation or background script authorization.

---

## 4. UI/UX Interface Design
- **Header:** Displays title, snippet loader dropdown, and application scope picker.
- **Code Area:** A monospace spellcheck-disabled editor textarea (`#codeArea`) styled with dark coloring.
- **Action Button:** A primary execution button (**Execute Script**) that displays loading states.
- **Console Log Box:** Displays parsed server outputs (`#scriptOutput`) styled as a standard Unix CLI window.

---

## 5. API Contracts & JavaScript functions
- **Function:** `SNOW_API.runBackgroundScript(script, scope)`
- **Arguments:**
  - `script` (String): Raw JavaScript script code to run.
  - `scope` (String): Target application scope ID (defaults to `global`).
- **Form Parameters Posted:**
  - `script`: The JavaScript string.
  - `runscript`: `"Run script"`
  - `sys_scope`: The scope ID.
  - `sysparm_ck`: CSRF token.
- **Returns:** Text output parsed from the server's HTML `<pre>` block.
