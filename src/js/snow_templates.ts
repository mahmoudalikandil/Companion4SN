export const SNOW_TEMPLATES = {
    getCloneScript: function (config: any) {
        return `(function() {
    var config = {
        source_id: '${config.source_id}',
        table: '${config.table}',
        new_name: '${config.new_name}',
        options: {
            variables: ${config.options.variables},
            variable_sets: ${config.options.variable_sets},
            ui_policies: ${config.options.ui_policies},
            client_scripts: ${config.options.client_scripts},
            user_criteria: ${config.options.user_criteria},
            categories: ${config.options.categories},
            data_lookups: ${config.options.data_lookups},
            related_articles: ${config.options.related_articles},
            related_items: ${config.options.related_items},
            topics: ${config.options.topics}
        }
    };

    gs.print('>>>START_CLONE<<<');
    
    try {
        var sourceGr = new GlideRecord(config.table);
        if (!sourceGr.get(config.source_id)) {
            throw new Error('Source Catalog Item not found.');
        }

        // 1. Clone Catalog Item itself
        var newGr = new GlideRecord(config.table);
        newGr.initialize();
        
        var fields = sourceGr.getFields();
        for (var i = 0; i < fields.size(); i++) {
            var field = fields.get(i);
            var name = field.getName();
            if (sourceGr.isValidField(name) && name !== 'sys_id' && name !== 'number' && name !== 'sys_scope' && name !== 'sys_package') {
                newGr.setValue(name, sourceGr.getValue(name));
            }
        }
        newGr.setValue('name', config.new_name);
        var newCatItemSysId = newGr.insert();
        if (!newCatItemSysId) {
            throw new Error('Failed to create cloned Catalog Item record.');
        }
        gs.print('[SUCCESS] Created Catalog Item: ' + config.new_name + ' [sys_id: ' + newCatItemSysId + ']');

        var varMap = {};
        var policyMap = {};

        // 2. Clone Variables (item_option_new)
        if (config.options.variables) {
            var varGr = new GlideRecord('item_option_new');
            varGr.addQuery('cat_item', config.source_id);
            varGr.query();
            while (varGr.next()) {
                var oldVarId = varGr.getUniqueValue();
                var newVarGr = new GlideRecord('item_option_new');
                newVarGr.initialize();
                
                var vFields = varGr.getFields();
                for (var j = 0; j < vFields.size(); j++) {
                    var vName = vFields.get(j).getName();
                    if (varGr.isValidField(vName) && vName !== 'sys_id' && vName !== 'cat_item' && vName !== 'sys_scope' && vName !== 'sys_package') {
                        newVarGr.setValue(vName, varGr.getValue(vName));
                    }
                }
                newVarGr.setValue('cat_item', newCatItemSysId);
                var newVarId = newVarGr.insert();
                if (newVarId) {
                    varMap[oldVarId] = newVarId;
                    gs.print('[SUCCESS] Cloned Variable: ' + varGr.getValue('name') + ' [sys_id: ' + newVarId + ']');
                } else {
                    gs.print('[ERROR] Failed to clone variable: ' + varGr.getValue('name'));
                }
            }
        }

        // 3. Clone Variable Set Links (io_set_item)
        if (config.options.variable_sets) {
            var setGr = new GlideRecord('io_set_item');
            setGr.addQuery('sc_cat_item', config.source_id);
            setGr.query();
            while (setGr.next()) {
                var newSetGr = new GlideRecord('io_set_item');
                newSetGr.initialize();
                
                var sFields = setGr.getFields();
                for (var k = 0; k < sFields.size(); k++) {
                    var sName = sFields.get(k).getName();
                    if (setGr.isValidField(sName) && sName !== 'sys_id' && sName !== 'sc_cat_item' && sName !== 'sys_scope' && sName !== 'sys_package') {
                        newSetGr.setValue(sName, setGr.getValue(sName));
                    }
                }
                newSetGr.setValue('sc_cat_item', newCatItemSysId);
                var newSetLinkId = newSetGr.insert();
                if (newSetLinkId) {
                    gs.print('[SUCCESS] Linked Variable Set: ' + setGr.variable_set.getDisplayValue());
                }
            }
        }

        // 4. Clone Catalog UI Policies (catalog_ui_policy)
        if (config.options.ui_policies) {
            var policyGr = new GlideRecord('catalog_ui_policy');
            policyGr.addQuery('catalog_item', config.source_id);
            policyGr.query();
            while (policyGr.next()) {
                var oldPolicyId = policyGr.getUniqueValue();
                var newPolicyGr = new GlideRecord('catalog_ui_policy');
                newPolicyGr.initialize();
                
                var pFields = policyGr.getFields();
                for (var l = 0; l < pFields.size(); l++) {
                    var pName = pFields.get(l).getName();
                    if (policyGr.isValidField(pName) && pName !== 'sys_id' && pName !== 'catalog_item' && pName !== 'sys_scope' && pName !== 'sys_package') {
                        newPolicyGr.setValue(pName, policyGr.getValue(pName));
                    }
                }
                newPolicyGr.setValue('catalog_item', newCatItemSysId);
                
                // Translate old variables to new variables in policy conditions (e.g. IO:sys_id=value)
                var oldConditions = policyGr.getValue('catalog_conditions');
                if (oldConditions) {
                    for (var oldVarId in varMap) {
                        oldConditions = oldConditions.split(oldVarId).join(varMap[oldVarId]);
                    }
                    newPolicyGr.setValue('catalog_conditions', oldConditions);
                }
                
                var newPolicyId = newPolicyGr.insert();
                if (newPolicyId) {
                    policyMap[oldPolicyId] = newPolicyId;
                    gs.print('[SUCCESS] Cloned UI Policy: ' + policyGr.getValue('short_description'));
                    
                    // Clone UI Policy Actions (catalog_ui_policy_action)
                    var actionGr = new GlideRecord('catalog_ui_policy_action');
                    actionGr.addQuery('ui_policy', oldPolicyId);
                    actionGr.query();
                    while (actionGr.next()) {
                        var newActionGr = new GlideRecord('catalog_ui_policy_action');
                        newActionGr.initialize();
                        
                        var aFields = actionGr.getFields();
                        for (var m = 0; m < aFields.size(); m++) {
                            var aName = aFields.get(m).getName();
                            if (actionGr.isValidField(aName) && aName !== 'sys_id' && aName !== 'ui_policy' && aName !== 'catalog_variable' && aName !== 'sys_scope' && aName !== 'sys_package') {
                                newActionGr.setValue(aName, actionGr.getValue(aName));
                            }
                        }
                        newActionGr.setValue('ui_policy', newPolicyId);
                        // Map the variable reference to the cloned variable sys_id
                        var oldVarRef = actionGr.getValue('catalog_variable');
                        if (oldVarRef && varMap[oldVarRef]) {
                            newActionGr.setValue('catalog_variable', varMap[oldVarRef]);
                        } else {
                            newActionGr.setValue('catalog_variable', oldVarRef); // Fallback to same if variable set variable
                        }
                        newActionGr.insert();
                    }
                }
            }
        }

        // 5. Clone Catalog Client Scripts (catalog_script_client)
        if (config.options.client_scripts) {
            var clientScriptGr = new GlideRecord('catalog_script_client');
            clientScriptGr.addQuery('cat_item', config.source_id);
            clientScriptGr.query();
            while (clientScriptGr.next()) {
                var newScriptGr = new GlideRecord('catalog_script_client');
                newScriptGr.initialize();
                
                var csFields = clientScriptGr.getFields();
                for (var n = 0; n < csFields.size(); n++) {
                    var csName = csFields.get(n).getName();
                    if (clientScriptGr.isValidField(csName) && csName !== 'sys_id' && csName !== 'cat_item' && csName !== 'cat_variable' && csName !== 'sys_scope' && csName !== 'sys_package') {
                        newScriptGr.setValue(csName, clientScriptGr.getValue(csName));
                    }
                }
                newScriptGr.setValue('cat_item', newCatItemSysId);
                
                // Map the variable reference for onChange client scripts
                var oldVarRef = clientScriptGr.getValue('cat_variable');
                if (oldVarRef && varMap[oldVarRef]) {
                    newScriptGr.setValue('cat_variable', varMap[oldVarRef]);
                } else {
                    newScriptGr.setValue('cat_variable', oldVarRef);
                }
                
                var newScriptId = newScriptGr.insert();
                if (newScriptId) {
                    gs.print('[SUCCESS] Cloned Client Script: ' + clientScriptGr.getValue('name'));
                }
            }
        }

        // 6. Clone User Criteria
        if (config.options.user_criteria) {
            // Available For
            var availGr = new GlideRecord('sc_cat_item_user_criteria_mtom');
            availGr.addQuery('sc_cat_item', config.source_id);
            availGr.query();
            while (availGr.next()) {
                var newAvailGr = new GlideRecord('sc_cat_item_user_criteria_mtom');
                newAvailGr.initialize();
                newAvailGr.setValue('sc_cat_item', newCatItemSysId);
                newAvailGr.setValue('user_criteria', availGr.getValue('user_criteria'));
                newAvailGr.insert();
            }
            // Not Available For
            var notAvailGr = new GlideRecord('sc_cat_item_user_criteria_no_mtom');
            notAvailGr.addQuery('sc_cat_item', config.source_id);
            notAvailGr.query();
            while (notAvailGr.next()) {
                var newNotAvailGr = new GlideRecord('sc_cat_item_user_criteria_no_mtom');
                newNotAvailGr.initialize();
                newNotAvailGr.setValue('sc_cat_item', newCatItemSysId);
                newNotAvailGr.setValue('user_criteria', notAvailGr.getValue('user_criteria'));
                notAvailGr.insert();
            }
            gs.print('[SUCCESS] Cloned User Criteria links.');
        }

        // 7. Clone Catalog Links and Category Links
        if (config.options.categories) {
            // Catalogs
            var catLinkGr = new GlideRecord('sc_cat_item_catalog');
            catLinkGr.addQuery('sc_cat_item', config.source_id);
            catLinkGr.query();
            while (catLinkGr.next()) {
                var newCatLinkGr = new GlideRecord('sc_cat_item_catalog');
                newCatLinkGr.initialize();
                newCatLinkGr.setValue('sc_cat_item', newCatItemSysId);
                newCatLinkGr.setValue('sc_catalog', catLinkGr.getValue('sc_catalog'));
                newCatLinkGr.insert();
            }
            // Categories
            var catGr = new GlideRecord('sc_cat_item_category');
            catGr.addQuery('sc_cat_item', config.source_id);
            catGr.query();
            while (catGr.next()) {
                var newCatGr = new GlideRecord('sc_cat_item_category');
                newCatGr.initialize();
                newCatGr.setValue('sc_cat_item', newCatItemSysId);
                newCatGr.setValue('sc_category', catGr.getValue('sc_category'));
                newCatGr.insert();
            }
            gs.print('[SUCCESS] Cloned Catalog & Category relations.');
        }

        // 8. Clone Catalog Data Lookup Definitions
        if (config.options.data_lookups) {
            var lookupGr = new GlideRecord('dl_definition_sc_csc');
            lookupGr.addQuery('catalog_item', config.source_id);
            lookupGr.query();
            while (lookupGr.next()) {
                var newLookupGr = new GlideRecord('dl_definition_sc_csc');
                newLookupGr.initialize();
                
                var lFields = lookupGr.getFields();
                for (var o = 0; o < lFields.size(); o++) {
                    var lName = lFields.get(o).getName();
                    if (lookupGr.isValidField(lName) && lName !== 'sys_id' && lName !== 'catalog_item' && lName !== 'catalog_variable' && lName !== 'sys_scope' && lName !== 'sys_package') {
                        newLookupGr.setValue(lName, lookupGr.getValue(lName));
                    }
                }
                newLookupGr.setValue('catalog_item', newCatItemSysId);
                
                // Map the variable reference for Catalog Data Lookups
                var oldVarRef = lookupGr.getValue('catalog_variable');
                if (oldVarRef && varMap[oldVarRef]) {
                    newLookupGr.setValue('catalog_variable', varMap[oldVarRef]);
                } else {
                    newLookupGr.setValue('catalog_variable', oldVarRef);
                }
                
                newLookupGr.insert();
            }
            gs.print('[SUCCESS] Cloned Catalog Data Lookup definitions.');
        }

        // 9. Clone Related Articles
        if (config.options.related_articles) {
            var articleGr = new GlideRecord('kb_2_sc_candidate');
            articleGr.addQuery('sc_cat_item', config.source_id);
            articleGr.query();
            while (articleGr.next()) {
                var newArticleGr = new GlideRecord('kb_2_sc_candidate');
                newArticleGr.initialize();
                
                var aFields = articleGr.getFields();
                for (var p = 0; p < aFields.size(); p++) {
                    var aName = aFields.get(p).getName();
                    if (articleGr.isValidField(aName) && aName !== 'sys_id' && aName !== 'sc_cat_item' && aName !== 'sys_scope' && aName !== 'sys_package') {
                        newArticleGr.setValue(aName, articleGr.getValue(aName));
                    }
                }
                newArticleGr.setValue('sc_cat_item', newCatItemSysId);
                newArticleGr.insert();
            }
            gs.print('[SUCCESS] Cloned Related Articles.');
        }

        // 10. Clone Related Catalog Items
        if (config.options.related_items) {
            var relGr = new GlideRecord('sc_cat_item_relation');
            relGr.addQuery('sc_cat_item', config.source_id).addOrCondition('related_cat_item', config.source_id);
            relGr.query();
            while (relGr.next()) {
                var newRelGr = new GlideRecord('sc_cat_item_relation');
                newRelGr.initialize();
                
                var rFields = relGr.getFields();
                for (var q = 0; q < rFields.size(); q++) {
                    var rName = rFields.get(q).getName();
                    if (relGr.isValidField(rName) && rName !== 'sys_id' && rName !== 'sys_scope' && rName !== 'sys_package') {
                        newRelGr.setValue(rName, relGr.getValue(rName));
                    }
                }
                if (relGr.getValue('sc_cat_item') === config.source_id) {
                    newRelGr.setValue('sc_cat_item', newCatItemSysId);
                }
                if (relGr.getValue('related_cat_item') === config.source_id) {
                    newRelGr.setValue('related_cat_item', newCatItemSysId);
                }
                newRelGr.insert();
            }
            gs.print('[SUCCESS] Cloned Related Catalog Items.');
        }

        // 11. Clone Assigned Topics
        if (config.options.topics) {
            var topicGr = new GlideRecord('topic_item_association');
            topicGr.addQuery('item', config.source_id);
            topicGr.query();
            while (topicGr.next()) {
                var newTopicGr = new GlideRecord('topic_item_association');
                newTopicGr.initialize();
                
                var tFields = topicGr.getFields();
                for (var r = 0; r < tFields.size(); r++) {
                    var tName = tFields.get(r).getName();
                    if (topicGr.isValidField(tName) && tName !== 'sys_id' && tName !== 'item' && tName !== 'sys_scope' && tName !== 'sys_package') {
                        newTopicGr.setValue(tName, topicGr.getValue(tName));
                    }
                }
                newTopicGr.setValue('item', newCatItemSysId);
                newTopicGr.insert();
            }
            gs.print('[SUCCESS] Cloned Assigned Topics.');
        }

        gs.print('>>>CLONE_SUCCESS:' + newCatItemSysId + '<<<');

    } catch (e) {
        gs.print('[ERROR] Script Failed: ' + e.message);
        gs.print('>>>CLONE_ERROR<<<');
    }
})();`;
    },

    getAclScript: function (userSysId: string, tablesString: string) {
        return `(function() {
    var userId = '${userSysId}';
    var tables = ${tablesString};
    
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
    
    // Helper function inside script context
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
})();`;
    },

    getBulkBuilderScript: function (payloadStr: string, isDryRun: boolean) {
        return `(function() {
    var payload = ${payloadStr};
    var isDryRun = ${isDryRun ? 'true' : 'false'};

    gs.print('>>>START_BULK_BUILD<<<');
    
    var transaction = null;
    try {
        transaction = com.glide.sys.Transaction.get();
    } catch(e) {
        // Fallback for environments where com.glide.sys.Transaction is not accessible
    }

    var itemMap = {}; // Maps temp_id -> sys_id of created catalog item
    var variableMap = {}; // Maps temp_id + '_' + variable_name -> sys_id of created variable
    var createdCicLinks = []; // Array of sc_cat_item_catalog sys_ids
    var createdChoices = []; // Array of question_choice sys_ids
    var createdVarSetLinks = []; // Array of io_set_item sys_ids
    var createdUiPolicies = []; // Array of catalog_ui_policy sys_ids
    var createdUiPolicyActions = []; // Array of catalog_ui_policy_action sys_ids

    function performCleanup() {
        gs.print('[INFO] Reverting database changes (Cleanup)...');
        
        // Delete UI Policy Actions
        for (var aId = 0; aId < createdUiPolicyActions.length; aId++) {
            var actDGr = new GlideRecord('catalog_ui_policy_action');
            actDGr.setWorkflow(false);
            if (actDGr.get(createdUiPolicyActions[aId])) {
                actDGr.deleteRecord();
            }
        }
        
        // Delete UI Policies
        for (var pId = 0; pId < createdUiPolicies.length; pId++) {
            var polDGr = new GlideRecord('catalog_ui_policy');
            polDGr.setWorkflow(false);
            if (polDGr.get(createdUiPolicies[pId])) {
                polDGr.deleteRecord();
            }
        }

        // Delete Variable Set Links
        for (var linkId = 0; linkId < createdVarSetLinks.length; linkId++) {
            var linkDGr = new GlideRecord('io_set_item');
            linkDGr.setWorkflow(false);
            if (linkDGr.get(createdVarSetLinks[linkId])) {
                linkDGr.deleteRecord();
            }
        }

        // Delete Question Choices
        for (var choiceId = 0; choiceId < createdChoices.length; choiceId++) {
            var choiceDGr = new GlideRecord('question_choice');
            choiceDGr.setWorkflow(false);
            if (choiceDGr.get(createdChoices[choiceId])) {
                choiceDGr.deleteRecord();
            }
        }

        // Delete Variables
        for (var varKey in variableMap) {
            var varDGr = new GlideRecord('item_option_new');
            varDGr.setWorkflow(false);
            if (varDGr.get(variableMap[varKey])) {
                varDGr.deleteRecord();
            }
        }

        // Delete Catalog Item Catalog Links
        for (var cicId = 0; cicId < createdCicLinks.length; cicId++) {
            var cicDGr = new GlideRecord('sc_cat_item_catalog');
            cicDGr.setWorkflow(false);
            if (cicDGr.get(createdCicLinks[cicId])) {
                cicDGr.deleteRecord();
            }
        }

        // Delete Catalog Items
        for (var itemKey in itemMap) {
            var tbl = 'sc_cat_item';
            for (var i = 0; i < items.length; i++) {
                if (items[i].temp_id + '' === itemKey + '') {
                    tbl = items[i].table || 'sc_cat_item';
                    break;
                }
            }
            var itemDGr = new GlideRecord(tbl);
            itemDGr.setWorkflow(false);
            if (itemDGr.get(itemMap[itemKey])) {
                itemDGr.deleteRecord();
            }
        }
    }

    try {
        // 1. Process Catalog Items
        var items = payload.items || [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var tempId = item.temp_id;
            var name = item.name;
            if (!name) {
                throw new Error('Row ' + (i + 1) + ' in Catalog Items: Name is mandatory.');
            }

            var table = item.table || 'sc_cat_item';
            
            // Resolve Scope
            var scopeId = 'global';
            if (item.scope && item.scope !== 'global' && item.scope !== 'Global') {
                var scopeGr = new GlideRecord('sys_scope');
                scopeGr.addQuery('scope', item.scope).addOrCondition('name', item.scope).addOrCondition('sys_id', item.scope);
                scopeGr.query();
                if (scopeGr.next()) {
                    scopeId = scopeGr.getUniqueValue();
                } else {
                    gs.print('[WARNING] Scope "' + item.scope + '" not found. Defaulting to Global.');
                }
            }

            // Resolve Category
            var categoryId = '';
            if (item.category) {
                var catGr = new GlideRecord('sc_category');
                catGr.addQuery('title', item.category).addOrCondition('sys_id', item.category);
                catGr.query();
                if (catGr.next()) {
                    categoryId = catGr.getUniqueValue();
                } else {
                    gs.print('[WARNING] Category "' + item.category + '" not found. It will be left empty.');
                }
            }

            var itemGr = new GlideRecord(table);
            itemGr.initialize();
            itemGr.setValue('name', name);
            itemGr.setValue('short_description', item.short_description || '');
            itemGr.setValue('description', item.description || '');
            itemGr.setValue('sys_scope', scopeId);
            if (categoryId) {
                itemGr.setValue('category', categoryId);
            }
            itemGr.setValue('active', (item.active === 'true' || item.active === true || item.active === 1 || item.active === '1' || (item.active + '').toLowerCase() === 'yes') ? 'true' : 'false');
            itemGr.setValue('order', item.order || 100);
            itemGr.setValue('hide_sp', (item.hide_portal === 'true' || item.hide_portal === true || item.hide_portal === 1 || item.hide_portal === '1' || (item.hide_portal + '').toLowerCase() === 'yes') ? 'true' : 'false');
            
            var itemSysId = itemGr.insert();
            if (!itemSysId) {
                throw new Error('Failed to insert Catalog Item: ' + name);
            }

            itemMap[tempId] = itemSysId;
            gs.print('[SUCCESS] Created Catalog Item: ' + name + ' (sys_id: ' + itemSysId + ')');

            // Parse Catalogs and insert relationship records in sc_cat_item_catalog
            var catalogsStr = item.catalogs || '';
            if (catalogsStr) {
                var catalogNames = catalogsStr.split(',');
                for (var cIdx = 0; cIdx < catalogNames.length; cIdx++) {
                    var catalogName = catalogNames[cIdx].trim();
                    if (!catalogName) continue;
                    
                    var catalogGr = new GlideRecord('sc_catalog');
                    catalogGr.addQuery('title', catalogName).addOrCondition('name', catalogName).addOrCondition('sys_id', catalogName);
                    catalogGr.query();
                    if (catalogGr.next()) {
                        var catalogSysId = catalogGr.getUniqueValue();
                        
                        // Check if relationship already exists before trying to insert it
                        var cicExistGr = new GlideRecord('sc_cat_item_catalog');
                        cicExistGr.addQuery('sc_cat_item', itemSysId);
                        cicExistGr.addQuery('sc_catalog', catalogSysId);
                        cicExistGr.query();
                        if (!cicExistGr.hasNext()) {
                            var cicGr = new GlideRecord('sc_cat_item_catalog');
                            cicGr.initialize();
                            cicGr.setValue('sc_cat_item', itemSysId);
                            cicGr.setValue('sc_catalog', catalogSysId);
                            var cicSysId = cicGr.insert();
                            if (!cicSysId) {
                                gs.print('[WARNING] Failed to link Catalog Item to Catalog: ' + catalogName);
                            } else {
                                createdCicLinks.push(cicSysId);
                                gs.print('[SUCCESS] Linked Catalog Item to Catalog: ' + catalogName + ' (sys_id: ' + catalogSysId + ')');
                            }
                        } else {
                            gs.print('[INFO] Catalog Item is already linked to Catalog: ' + catalogName);
                        }
                    } else {
                        gs.print('[WARNING] Catalog "' + catalogName + '" not found.');
                    }
                }
            }
        }

        // 2. Process Variables
        var variables = payload.variables || [];
        var typeMapping = {
            'yes/no': '1', 'yes_no': '1', '1': '1',
            'single line text': '6', 'single_line_text': '6', '6': '6',
            'wide single line text': '2', 'wide_single_line_text': '2', '2': '2',
            'multi line text': '15', 'multi_line_text': '15', '15': '15',
            'select box': '5', 'select_box': '5', '5': '5',
            'multiple choice': '3', 'multiple_choice': '3', '3': '3',
            'reference': '8', '8': '8',
            'checkbox': '7', '7': '7',
            'date': '9', '9': '9',
            'date/time': '10', 'date_time': '10', '10': '10',
            'integer': '16', '16': '16',
            'html': '23', '23': '23',
            'lookup select box': '18', 'lookup_select_box': '18', '18': '18',
            'list collector': '21', 'list_collector': '21', '21': '21',
            'attachment': '33', '33': '33'
        };

        for (var j = 0; j < variables.length; j++) {
            var v = variables[j];
            var itemTempId = v.item_temp_id;
            var varName = v.name;
            var varLabel = v.label || varName;

            if (!itemTempId || !itemMap[itemTempId]) {
                throw new Error('Variable "' + varName + '" refers to an invalid or missing Catalog Item Temp ID: ' + itemTempId);
            }
            if (!varName) {
                throw new Error('Row ' + (j + 1) + ' in Variables: Name is mandatory.');
            }

            var typeStr = (v.type || '').toLowerCase().trim();
            var typeVal = typeMapping[typeStr] || '6';

            var varGr = new GlideRecord('item_option_new');
            varGr.initialize();
            varGr.setValue('cat_item', itemMap[itemTempId]);
            varGr.setValue('name', varName);
            varGr.setValue('question_text', varLabel);
            varGr.setValue('type', typeVal);
            varGr.setValue('order', v.order || '100');
            varGr.setValue('mandatory', (v.mandatory === 'true' || v.mandatory === true || v.mandatory === 1 || v.mandatory === '1' || (v.mandatory + '').toLowerCase() === 'yes') ? 'true' : 'false');
            varGr.setValue('active', (v.active === 'true' || v.active === true || v.active === 1 || v.active === '1' || (v.active + '').toLowerCase() === 'yes') ? 'true' : 'false');
            varGr.setValue('default_value', v.default_value || '');
            varGr.setValue('tooltip', v.tooltip || '');
            varGr.setValue('help_text', v.help_text || '');
            varGr.setValue('show_help', (v.help_text && v.help_text.trim() !== '') ? 'true' : 'false');
            
            if (typeVal === '8' && v.reference) {
                varGr.setValue('reference', v.reference);
            }

            var varSysId = varGr.insert();
            if (!varSysId) {
                throw new Error('Failed to insert Variable: ' + varName + ' for item ' + itemTempId);
            }

            variableMap[itemTempId + '_' + varName] = varSysId;
            gs.print('[SUCCESS] Created Variable: ' + varName + ' (sys_id: ' + varSysId + ')');

            if ((typeVal === '5' || typeVal === '3') && v.choices) {
                var choiceItems = v.choices.split(',');
                for (var c = 0; c < choiceItems.length; c++) {
                    var parts = choiceItems[c].split(':');
                    var cLabel = parts[0] ? parts[0].trim() : '';
                    var cValue = parts[1] ? parts[1].trim() : cLabel;

                    if (!cLabel) continue;

                    var choiceGr = new GlideRecord('question_choice');
                    choiceGr.initialize();
                    choiceGr.setValue('question', varSysId);
                    choiceGr.setValue('text', cLabel);
                    choiceGr.setValue('value', cValue);
                    choiceGr.setValue('order', (c + 1) * 100);
                    var choiceSysId = choiceGr.insert();
                    if (!choiceSysId) {
                        gs.print('[WARNING] Failed to insert choice: ' + cLabel + ' for variable ' + varName);
                    } else {
                        createdChoices.push(choiceSysId);
                    }
                }
            }
        }

        // 3. Process Variable Sets
        var varSets = payload.variable_sets || [];
        for (var k = 0; k < varSets.length; k++) {
            var vs = varSets[k];
            var itemTempId = vs.item_temp_id;
            var setName = vs.variable_set;

            if (!itemTempId || !itemMap[itemTempId]) {
                throw new Error('Variable Set assignment refers to an invalid or missing Catalog Item Temp ID: ' + itemTempId);
            }
            if (!setName) continue;

            var vsGr = new GlideRecord('item_option_new_set');
            vsGr.addQuery('title', setName).addOrCondition('name', setName).addOrCondition('sys_id', setName);
            vsGr.query();
            if (vsGr.next()) {
                var setLinkId = vsGr.getUniqueValue();
                var linkGr = new GlideRecord('io_set_item');
                linkGr.initialize();
                linkGr.setValue('sc_cat_item', itemMap[itemTempId]);
                linkGr.setValue('variable_set', setLinkId);
                linkGr.setValue('order', vs.order || 100);
                var linkSysId = linkGr.insert();
                if (!linkSysId) {
                    throw new Error('Failed to link Variable Set "' + setName + '" to Catalog Item Temp ID: ' + itemTempId);
                }
                createdVarSetLinks.push(linkSysId);
                gs.print('[SUCCESS] Linked Variable Set: ' + setName + ' (link_id: ' + linkSysId + ')');
            } else {
                gs.print('[WARNING] Variable Set not found: ' + setName);
            }
        }

        // 4. Process UI Policies
        var uiPolicies = payload.ui_policies || [];
        var policyGroups = {};
        for (var p = 0; p < uiPolicies.length; p++) {
            var pol = uiPolicies[p];
            var itemTempId = pol.item_temp_id;
            var desc = pol.short_description || 'UI Policy';
            var key = itemTempId + '_' + desc;

            if (!itemTempId || !itemMap[itemTempId]) {
                throw new Error('UI Policy refers to an invalid or missing Catalog Item Temp ID: ' + itemTempId);
            }

            if (!policyGroups[key]) {
                policyGroups[key] = {
                    item_temp_id: itemTempId,
                    short_description: desc,
                    conditions: pol.conditions || '',
                    actions: []
                };
            }

            if (pol.variable_name) {
                policyGroups[key].actions.push({
                    variable_name: pol.variable_name,
                    mandatory: pol.mandatory,
                    read_only: pol.read_only,
                    visible: pol.visible
                });
            }
        }

        for (var key in policyGroups) {
            var group = policyGroups[key];
            var catItemSysId = itemMap[group.item_temp_id];

            var polGr = new GlideRecord('catalog_ui_policy');
            polGr.initialize();
            polGr.setValue('catalog_item', catItemSysId);
            polGr.setValue('short_description', group.short_description);
            polGr.setValue('active', 'true');
            polGr.setValue('applies_catalog', 'true');
            polGr.setValue('applies_req_item', 'true');
            polGr.setValue('applies_sc_task', 'true');

            var rawCond = group.conditions;
            var finalCond = '';
            if (rawCond) {
                var condParts = rawCond.split('^');
                var parsedParts = [];
                for (var cp = 0; cp < condParts.length; cp++) {
                    var part = condParts[cp];
                    if (part === 'EQ' || !part) {
                        parsedParts.push(part);
                        continue;
                    }
                    
                    var opMatch = part.match(/([^!=><~]+)(=|!=|LIKE|NOT LIKE|IN|NOT IN|>|<|>=|<=)(.*)/);
                    if (opMatch) {
                        var varName = opMatch[1].trim();
                        var op = opMatch[2];
                        var val = opMatch[3];
                        
                        var mappedVarId = variableMap[group.item_temp_id + '_' + varName];
                        if (mappedVarId) {
                            parsedParts.push('IO:' + mappedVarId + op + val);
                        } else {
                            var sysVarGr = new GlideRecord('item_option_new');
                            sysVarGr.addQuery('cat_item', catItemSysId);
                            sysVarGr.addQuery('name', varName);
                            sysVarGr.query();
                            if (sysVarGr.next()) {
                                parsedParts.push('IO:' + sysVarGr.getUniqueValue() + op + val);
                            } else {
                                gs.print('[WARNING] Condition Variable "' + varName + '" not found. Retaining raw.');
                                parsedParts.push(part);
                            }
                        }
                    } else {
                        parsedParts.push(part);
                    }
                }
                finalCond = parsedParts.join('^');
            }
            polGr.setValue('catalog_conditions', finalCond);

            var policySysId = polGr.insert();
            if (!policySysId) {
                throw new Error('Failed to insert Catalog UI Policy: ' + group.short_description);
            }
            createdUiPolicies.push(policySysId);
            gs.print('[SUCCESS] Created UI Policy: ' + group.short_description + ' (sys_id: ' + policySysId + ')');

            for (var a = 0; a < group.actions.length; a++) {
                var act = group.actions[a];
                var targetVarName = act.variable_name;
                
                var targetVarSysId = variableMap[group.item_temp_id + '_' + targetVarName];
                if (!targetVarSysId) {
                    var sysVarGr = new GlideRecord('item_option_new');
                    sysVarGr.addQuery('cat_item', catItemSysId);
                    sysVarGr.addQuery('name', targetVarName);
                    sysVarGr.query();
                    if (sysVarGr.next()) {
                        targetVarSysId = sysVarGr.getUniqueValue();
                    }
                }

                if (!targetVarSysId) {
                    gs.print('[WARNING] Action target variable "' + targetVarName + '" not found. Action skipped.');
                    continue;
                }

                var actGr = new GlideRecord('catalog_ui_policy_action');
                actGr.initialize();
                actGr.setValue('ui_policy', policySysId);
                actGr.setValue('catalog_variable', 'IO:' + targetVarSysId);
                
                var mandatoryVal = (act.mandatory + '').toLowerCase().trim();
                actGr.setValue('mandatory', (mandatoryVal === 'true' || mandatoryVal === 'yes') ? 'true' : ((mandatoryVal === 'false' || mandatoryVal === 'no') ? 'false' : 'leave'));
                
                var readOnlyVal = (act.read_only + '').toLowerCase().trim();
                actGr.setValue('read_only', (readOnlyVal === 'true' || readOnlyVal === 'yes') ? 'true' : ((readOnlyVal === 'false' || readOnlyVal === 'no') ? 'false' : 'leave'));
                
                var visibleVal = (act.visible + '').toLowerCase().trim();
                actGr.setValue('visible', (visibleVal === 'true' || visibleVal === 'yes') ? 'true' : ((visibleVal === 'false' || visibleVal === 'no') ? 'false' : 'leave'));

                var actSysId = actGr.insert();
                if (!actSysId) {
                    gs.print('[WARNING] Failed to insert UI Policy Action for variable ' + targetVarName);
                } else {
                    createdUiPolicyActions.push(actSysId);
                    gs.print('[SUCCESS] Created UI Policy Action for variable: ' + targetVarName);
                }
            }
        }

        if (isDryRun) {
            performCleanup();
            gs.print('>>>DRY_RUN_PASSED<<<');
        } else {
            gs.print('>>>BULK_SUCCESS<<<');
        }

    } catch (e) {
        gs.print('[ERROR] Script Execution Terminated: ' + e.message);
        performCleanup();
        gs.print('>>>BULK_ERROR<<<');
    }
})();`;
    },

    getCancelTransactionScript: function (threadSysId: string) {
        return `(function() {
            try {
                var tm = GlideTransactionManager.get();
                var txList = tm.getActiveTransactions();
                var cancelled = false;
                for (var i = 0; i < txList.size(); i++) {
                    var tx = txList.get(i);
                    if (tx.getSysID() == '${threadSysId}') {
                        tx.cancel();
                        cancelled = true;
                        gs.print('[SUCCESS] Thread terminated: ' + '${threadSysId}');
                        break;
                    }
                }
                if (!cancelled) {
                    gs.print('[WARNING] Thread not found in active transaction manager.');
                }
            } catch (e) {
                gs.print('[ERROR] Failed to cancel thread: ' + e.message);
            }
        })();`;
    }
};
