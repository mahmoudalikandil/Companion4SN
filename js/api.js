const SNOW_API = {

    _fetch: async function (endpoint, method = 'GET', body = null) {
        if (!window.activeInstanceData || !window.activeInstanceData.token) {
            throw new Error("No active instance connection.");
        }

        const url = `${window.activeInstanceData.url}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserToken': window.activeInstanceData.token
        };

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },

    searchUsers: async function (searchTerm) {
        const sanitized = (searchTerm || '').replace(/[\^=]/g, "");
        const query = `nameLIKE${sanitized}^ORemailLIKE${sanitized}^active=true`;
        const endpoint = `/api/now/table/sys_user?sysparm_query=${encodeURIComponent(query)}&sysparm_limit=5&sysparm_fields=sys_id,name,email,user_name`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    impersonateUser: async function (userSysId) {
        const endpoint = `/api/now/ui/impersonate/${userSysId}`;
        return await this._fetch(endpoint, 'POST', {});
    },

    runBackgroundScript: async function (script, scope = 'global') {
        const url = `${window.activeInstanceData.url}/sys.scripts.do`;

        const formData = new URLSearchParams();
        formData.append('script', script);
        formData.append('runscript', 'Run script');
        formData.append('sys_scope', scope);
        formData.append('sysparm_ck', window.activeInstanceData.token);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'text/html'
            },
            body: formData.toString()
        });

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const outputNode = doc.querySelector('pre');

        return outputNode ? outputNode.textContent : "Script executed, but no <pre> output found.";
    },

    fetchScopes: async function () {
        const endpoint = `/api/now/table/sys_scope?sysparm_query=active=true&sysparm_fields=sys_id,name,scope`;
        const data = await this._fetch(endpoint);
        return [{ sys_id: 'global', name: 'Global' }, ...data.result];
    },

    fetchUpdateSets: async function (scopeId, searchTerm = "", limit = 20) {
        let query = `state=in progress`;
        if (scopeId && scopeId !== 'global') {
            query += `^application=${scopeId}`;
        }
        if (searchTerm) {
            const sanitizedTerm = searchTerm.replace(/[\^=]/g, "");
            query += `^nameLIKE${sanitizedTerm}`;
        }
        const endpoint = `/api/now/table/sys_update_set?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=sys_id,name&sysparm_limit=${limit}`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    setUpdateSetAndScope: async function (scopeId, updateSetId) {
        const headers = {
            'X-UserToken': window.activeInstanceData.token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (scopeId) {
            await fetch(`${window.activeInstanceData.url}/api/now/ui/concoursepicker/application`, {
                method: 'PUT', // CRITICAL FIX
                headers, body: JSON.stringify({ app_id: scopeId })
            });
        }

        if (updateSetId) {
            await fetch(`${window.activeInstanceData.url}/api/now/ui/concoursepicker/updateset`, {
                method: 'PUT', // CRITICAL FIX
                headers, body: JSON.stringify({ sysId: updateSetId })
            });
        }
        return true;
    },

    /**
     * Fetches the most recent system logs.
     * We limit to 30 and sort descending to grab the absolute latest data efficiently.
     */
    fetchLogs: async function() {
        // Exclude 'Evaluator' source noise if desired, but here we grab everything recent
        const query = `ORDERBYDESCsys_created_on`;
        const endpoint = `/api/now/table/syslog?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=sys_id,level,message,source,sys_created_on&sysparm_limit=30`;
        
        const data = await this._fetch(endpoint);
        return data.result;
    },

/**
     * Recursively traces the table extension hierarchy via REST
     * to safely replicate GlideTableHierarchy without triggering security blocks.
     */
    _getTableHierarchy: async function(tableName) {
        console.log(`[API] Resolving table hierarchy for: ${tableName}...`);
        let hierarchy = [];
        let currentTable = tableName;

        while (currentTable) {
            hierarchy.push(currentTable);
            const endpoint = `/api/now/table/sys_db_object?sysparm_query=name=${currentTable}&sysparm_fields=super_class.name`;
            
            try {
                const data = await this._fetch(endpoint);
                if (data.result && data.result.length > 0 && data.result[0]['super_class.name']) {
                    currentTable = data.result[0]['super_class.name'];
                } else {
                    currentTable = null; // Reached the top of the hierarchy
                }
            } catch (e) {
                console.warn(`[API] Hierarchy trace stopped at ${currentTable}.`, e);
                currentTable = null;
            }
        }
        return hierarchy;
    },

    exportDictionary: async function(tableName) {
        console.log(`[API] exportDictionary called for table: "${tableName}"`);
        
        // 1. Get the full family tree of the table
        const hierarchy = await this._getTableHierarchy(tableName);
        console.log(`[API] Hierarchy resolved successfully: ${hierarchy.join(', ')}`);

        // 2. Query the dictionary using standard IN operator (100% REST safe)
        const query = `nameIN${hierarchy.join(',')}^internal_type!=collection`;
        const endpoint = `/api/now/table/sys_dictionary?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=element,column_label,internal_type,reference,max_length&sysparm_limit=2000`;
        
        console.log(`[API] Executing Request to Endpoint: ${endpoint}`);
        
        const data = await this._fetch(endpoint);
        
        console.log(`[API] Response received. Found ${data.result ? data.result.length : 0} records.`);
        return data.result;
    }


};

window.SNOW_API = SNOW_API;