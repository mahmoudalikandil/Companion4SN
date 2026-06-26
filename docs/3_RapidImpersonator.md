# 3. Feature Specification: Rapid Impersonator

## 1. Executive Summary
Testing roles and permissions in ServiceNow requires switching contexts between different users. The native impersonate function requires navigating through the concourse banner menus, typing in search bars, clicking select, and waiting for page reloads.

The **Rapid Impersonator** is a streamlined utility inside the *ServiceNow Live Companion* extension that allows developers to search for any active user and immediately trigger impersonation in their active browser tab with a single click, reloading the ServiceNow page automatically.

---

## 2. Key Capabilities

### A. Dynamic User Search
- **Description:** Queries active ServiceNow user records via REST.
- **Search Scope:** Searches by name, username (`user_name`), or email address.
- **Table Queried:** `sys_user` (filtered with `active=true` to prevent selection of inactive users).
- **Result Limits:** Limited to 5 rows to ensure popup sizing is not compromised.

### B. Single-Click Impersonation
- **Description:** Triggers user impersonation by sending a REST query to the native ServiceNow impersonation endpoint.
- **Action Flow:** On selecting a user, the extension fires the REST command, alerts the user, and triggers an active-tab reload to apply the impersonation session.

---

## 3. Technical Architecture & Security
- **Endpoints Used:**
  - Search: `/api/now/table/sys_user`
  - Impersonate: `/api/now/ui/impersonate/{sys_id}` (POST)
- **Security Context:** Runs utilizing the captured CSRF token (`g_ck`) from the active browser tab.
- **Session Rules:** Developers must have the `impersonator` or `admin` role on the ServiceNow instance to execute this endpoint.

---

## 4. UI/UX Interface Design
- **Header:** Displays title and "Live API" badge.
- **Search Panel:** A full-width search input (`#impersonateSearch`) with auto-submit on pressing the Enter key and a **Search** button (`#btnSearchUser`).
- **Results Dropdown:** Renders a list view (`#userSearchResults`) displaying user names and usernames, supporting hover selections.

---

## 5. API Contracts & JavaScript functions
- **User Search Function:** `SNOW_API.searchUsers(searchTerm)`
  - **Endpoint:** `/api/now/table/sys_user?sysparm_query=nameLIKE{searchTerm}^ORemailLIKE{searchTerm}^active=true&sysparm_limit=5`
  - **Returns:**
    ```json
    [
      {
        "sys_id": "62826bf03710200044e0bfc8bcbe5df1",
        "name": "Abel Tuter",
        "email": "abel.tuter@example.com",
        "user_name": "abel.tuter"
      }
    ]
    ```

- **Impersonation Function:** `SNOW_API.impersonateUser(userSysId)`
  - **Endpoint:** `/api/now/ui/impersonate/{userSysId}` (POST)
  - **Returns:** Empty payload or standard ServiceNow impersonation status JSON.
