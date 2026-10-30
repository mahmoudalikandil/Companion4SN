# 3. Feature Specification: User Roles & ACL Permission Analyzer

## 1. Executive Summary
Troubleshooting access control issues (ACLs) in ServiceNow is a common pain point for developers. Traditional debugging requires manually impersonating the user, navigating to the form, triggering errors, and inspecting security debug logs. 

The **User Roles & ACL Permission Analyzer** is a diagnostic tool integrated into the *Companion4SN* extension. It allows developers to immediately trace a user's role inheritance hierarchy and run automated CRUD permission checks on core/custom tables—identifying exact missing roles—without ever changing their active session context.

---

## 2. Key Capabilities

### A. Auto-Complete User Lookup
- **Description:** Dynamically query and select active users using a list view with a search filter.
- **Search Parameters:** Search by name, User ID (`user_name`), or email address.
- **Backend Table:** Queries `sys_user` (limited to 5 results to keep the UI clean).

### B. Hierarchical Role & Group Tree
- **Description:** Visualizes how the target user possesses their roles (directly assigned vs. group-inherited).
- **Structure:**
  - **Direct Roles:** Roles assigned directly to the user record, expandable to show any Contained Roles they inherit.
  - **Group Membership:** Lists all groups the user belongs to, expanding to show group-specific roles and their Contained Roles.
- **Backend Tables:** Queries `sys_user_has_role`, `sys_user_grmember`, `sys_group_has_role`, and `sys_user_role_contains`.

### C. Predefined Table CRUD Check
- **Description:** Automatically checks the user's permission to Read, Write, Create, and Delete (CRUD) on a checklist of standard ServiceNow tables:
  - `incident` (Incident)
  - `change_request` (Change Request)
  - `problem` (Problem)
  - `sys_user` (User)
  - `sys_properties` (System Properties)
  - `task` (Task)
- **Custom Search:** Allows the developer to manually input any custom table name (e.g., custom scoped tables) to perform live check evaluations.

### D. Advanced ACL Diagnostics
- **Description:** When a CRUD check fails (e.g., the user cannot read the `incident` table), the analyzer compares the user's combined roles against the table's active Access Control Lists (ACLs) to highlight what roles are missing.
- **Inheritance Resolution:** Scans table-specific ACLs, parent-table ACLs, and wildcard (`*`) rules.
- **Feedback:** Displays actionable debug messages (e.g., *“Requires role: itil or sn_incident_read”*).

---

## 3. Technical Architecture & Security
- **Secure Simulation:** Uses ServiceNow's server-side `GlideImpersonator` API inside a background script evaluation transaction.
- **Transaction Safety:** Ensures the impersonation is strictly evaluated within the script transaction and automatically restores the developer's original admin session upon script completion.
- **Target Application Scope:** The diagnostics run within the active scope selected in the extension, ensuring cross-scope permissions are respected.

---

## 4. Server-Side Diagnostic Script

The server-side script runs dynamically via the `/sys.scripts.do` background processor. It performs all operations under a secure transaction block:

```javascript
(function() {
    var userId = '{{USER_ID}}';
    var tables = [{{TABLES_LIST}}]; // e.g. ['incident', 'sys_user']
    
    gs.print('>>>START_ACL_ANALYSIS<<<');
    
    try {
        var result = {
            roles_hierarchy: {
                direct_roles: [],
                groups: []
            },
            permissions: {}
        };
        
        // 1. Get direct user roles and contained roles
        var userRoleGr = new GlideRecord('sys_user_has_role');
        userRoleGr.addQuery('user', userId);
        userRoleGr.addQuery('inherited', false);
        userRoleGr.addQuery('state', 'active');
        userRoleGr.query();
        while (userRoleGr.next()) {
            var roleName = userRoleGr.role.name.toString();
            var roleId = userRoleGr.role.toString();
            
            // Get contained roles
            var contains = [];
            var childGr = new GlideRecord('sys_user_role_contains');
            childGr.addQuery('role', roleId);
            childGr.query();
            while (childGr.next()) {
                contains.push(childGr.contains.name.toString());
            }
            
            result.roles_hierarchy.direct_roles.push({
                name: roleName,
                contains: contains
            });
        }
        
        // 2. Get group roles and contained roles
        var memberGr = new GlideRecord('sys_user_grmember');
        memberGr.addQuery('user', userId);
        memberGr.query();
        while (memberGr.next()) {
            var groupName = memberGr.group.name.toString();
            var groupId = memberGr.group.toString();
            
            var groupRoles = [];
            var grRoleGr = new GlideRecord('sys_group_has_role');
            grRoleGr.addQuery('group', groupId);
            grRoleGr.addQuery('inherits', true);
            grRoleGr.query();
            while (grRoleGr.next()) {
                var gRoleName = grRoleGr.role.name.toString();
                var gRoleId = grRoleGr.role.toString();
                
                var gContains = [];
                var gChildGr = new GlideRecord('sys_user_role_contains');
                gChildGr.addQuery('role', gRoleId);
                gChildGr.query();
                while (gChildGr.next()) {
                    gContains.push(gChildGr.contains.name.toString());
                }
                
                groupRoles.push({
                    name: gRoleName,
                    contains: gContains
                });
            }
            
            result.roles_hierarchy.groups.push({
                name: groupName,
                roles: groupRoles
            });
        }
        
        // 3. Get all user active roles for ACL matching
        var allRolesList = [];
        var allRolesGr = new GlideRecord('sys_user_has_role');
        allRolesGr.addQuery('user', userId);
        allRolesGr.addQuery('state', 'active');
        allRolesGr.query();
        while (allRolesGr.next()) {
            allRolesList.push(allRolesGr.role.name.toString());
        }
        
        // 4. Impersonate to evaluate table permissions
        var originalUser = gs.getUserID();
        gs.getSession().impersonate(userId);
        
        for (var i = 0; i < tables.length; i++) {
            var tbl = tables[i];
            var tblGr = new GlideRecord(tbl);
            
            var canRead = tblGr.canRead();
            var canWrite = tblGr.canWrite();
            var canCreate = tblGr.canCreate();
            var canDelete = tblGr.canDelete();
            
            result.permissions[tbl] = {
                read: canRead,
                write: canWrite,
                create: canCreate,
                'delete': canDelete,
                missing_roles: {
                    read: [],
                    write: [],
                    create: [],
                    'delete': []
                }
            };
            
            // If failed access, analyze required ACL roles (evaluated in system context)
            if (!canRead || !canWrite || !canCreate || !canDelete) {
                // Temporarily run in system context to query ACL rules
                gs.getSession().impersonate(originalUser);
                
                var operations = [];
                if (!canRead) operations.push('read');
                if (!canWrite) operations.push('write');
                if (!canCreate) operations.push('create');
                if (!canDelete) operations.push('delete');
                
                for (var o = 0; o < operations.length; o++) {
                    var op = operations[o];
                    var missing = getMissingRolesForTable(tbl, op, allRolesList);
                    result.permissions[tbl].missing_roles[op] = missing;
                }
                
                // Switch back to target user
                gs.getSession().impersonate(userId);
            }
        }
        
        // Restore original session
        gs.getSession().impersonate(originalUser);
        
        gs.print(JSON.stringify(result));
        gs.print('>>>ACL_SUCCESS<<<');

    } catch(e) {
        gs.print('[ERROR] Analysis failed: ' + e.message);
        gs.print('>>>ACL_ERROR<<<');
    }
    
    // Helper function inside script context to find ACLs lacking target roles
    function getMissingRolesForTable(tableName, operation, userRolesList) {
        var aclNames = [tableName];
        var currentTable = tableName;
        while (currentTable) {
            var dbObj = new GlideRecord('sys_db_object');
            dbObj.addQuery('name', currentTable);
            dbObj.query();
            if (dbObj.next() && dbObj.super_class) {
                currentTable = dbObj.super_class.name.toString();
                if (currentTable) aclNames.push(currentTable);
            } else {
                currentTable = null;
            }
        }
        aclNames.push('*');
        
        var aclGr = new GlideRecord('sys_security_acl');
        aclGr.addQuery('name', 'IN', aclNames.join(','));
        aclGr.addQuery('operation', operation);
        aclGr.addQuery('active', true);
        aclGr.query();
        
        var aclDetails = [];
        while (aclGr.next()) {
            var aclId = aclGr.getUniqueValue();
            var aclName = aclGr.getValue('name');
            
            var aclRoleGr = new GlideRecord('sys_security_acl_role');
            aclRoleGr.addQuery('sys_security_acl', aclId);
            aclRoleGr.query();
            
            var requiredRoles = [];
            while (aclRoleGr.next()) {
                requiredRoles.push(aclRoleGr.sys_user_role.name.toString());
            }
            
            var userHasAny = false;
            if (requiredRoles.length === 0) {
                userHasAny = true;
            } else {
                for (var i = 0; i < requiredRoles.length; i++) {
                    if (userRolesList.indexOf(requiredRoles[i]) !== -1) {
                        userHasAny = true;
                        break;
                    }
                }
            }
            
            if (!userHasAny && requiredRoles.length > 0) {
                aclDetails.push({
                    acl_name: aclName,
                    required_roles: requiredRoles
                });
            }
        }
        return aclDetails;
    }
})();
```

---

## 5. UI/UX Interface Design

The extension popup leverages a structured two-pane dashboard style optimized for restricted viewport sizes:

1. **User Search Interface:**
   - Text input box `#aclUserSearch` matching name/username/email.
   - Autocomplete dropdown list `#aclUserSearchResults` supporting direct keyboard/mouse selection.
   - Selected target card highlighting the user's name, username, and sys_id.

2. **Left Panel (Role Hierarchy Tree):**
   - Renders a collapsible nested tree layout showing direct roles and group memberships.
   - Contained roles are listed hierarchically below each base role.
   - Toggle buttons to expand/collapse folders.

3. **Right Panel (Table CRUD Checker):**
   - Renders default tables in a structured list grid.
   - Table headers indicate **Read**, **Write**, **Create**, and **Delete** actions.
   - Cells are styled dynamically: green checkmarks (✔) indicate permission granted, and red cross marks (✘) represent permission denied.
   - **Click/Hover Warn Drawers:** Failed permissions display a warning icon. Clicking on this cell slides open/expands a detailed panel showing exact missing roles grouped by the matching ACL rule name.
   - **Dynamic Customs Addition:** Allows developers to insert arbitrary table identifiers (e.g. `u_custom_service`) to dynamically verify access rules.

---

## 6. API Contracts & Functions

The feature is driven by two main JavaScript API endpoints defined in the extension's bridge layer:

### A. `SNOW_API.searchUsers(searchTerm)`
- **Query:** `sys_user` table using:
  `nameLIKE[search]^ORemailLIKE[search]^active=true`
- **Output:** Returns array of up to 5 user match structures:
  ```json
  [
    {
      "sys_id": "82f801651b14a010c2830f36dc4bcbb8",
      "name": "Fred Luddy",
      "email": "fred.luddy@example.com",
      "user_name": "fred.luddy"
    }
  ]
  ```

### B. `SNOW_API.analyzeUserAcls(userSysId, tablesArray)`
- **Execution:** Runs the server-side script and extracts the output wrapper bounded by `>>>START_ACL_ANALYSIS<<<` and `>>>ACL_SUCCESS<<<`.
- **Returned Schema:**
  ```json
  {
    "roles_hierarchy": {
      "direct_roles": [
        {
          "name": "itil",
          "contains": ["approval_admin", "itil_admin"]
        }
      ],
      "groups": [
        {
          "name": "Service Desk",
          "roles": [
            {
              "name": "itil",
              "contains": ["approval_admin"]
            }
          ]
        }
      ]
    },
    "permissions": {
      "incident": {
        "read": true,
        "write": false,
        "create": true,
        "delete": false,
        "missing_roles": {
          "write": [
            {
              "acl_name": "incident",
              "required_roles": ["itil", "sn_incident_write"]
            }
          ],
          "delete": [
            {
              "acl_name": "incident",
              "required_roles": ["admin"]
            }
          ]
        }
      }
    }
  }
  ```