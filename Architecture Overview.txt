================================================================================
PROJECT: ServiceNow Live Companion (Chrome Extension)
PHASE: Phase 2 - The Quick Wins (Live API Interaction)
================================================================================

1. ARCHITECTURAL OVERVIEW
Phase 2 introduces active REST API and DOM interactions. It relies on the 
`window.activeInstanceData` (established in Phase 1) to authenticate requests 
using the captured `g_ck` token (X-UserToken). 

2. DIRECTORY STRUCTURE ADDITIONS
/js/api.js       # Centralized wrapper for standard REST and Form URL fetches.
/js/features.js  # Contains the business logic for the 3 Quick Win tools.

3. COMPONENT RESPONSIBILITIES
- API Wrapper (api.js): Ensures every request automatically attaches the 
  correct Headers (X-UserToken, Content-Type) and points to the active URL.
- Rapid Impersonator: Queries the `sys_user` table using the Table API, 
  and utilizes the native `/api/now/ui/impersonate` endpoint. Saves the Top 5 
  history into `chrome.storage.local`.
- Background Script Runner: Bypasses the REST API (which doesn't natively 
  support arbitrary script execution) by simulating a form POST to `sys.scripts.do`.
  It then scrapes the returned HTML to extract the `<PRE>` tag output.
- Update Set Switcher: Queries `sys_update_set` for "In Progress" sets. Uses 
  the internal Concourse API (`/api/now/ui/concoursepicker/updateset`) to 
  change the session's active update set.

4. UI/UX DESIGN (Polaris Tabbed Layout)
Because an extension popup is limited in size, the `editor-area` has been 
upgraded to a Tabbed View. Clicking a tool in the sidebar activates the 
corresponding panel, ensuring a clean, focused workspace.
================================================================================