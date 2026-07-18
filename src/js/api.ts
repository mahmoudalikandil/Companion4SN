import './types';
import { SNOW_TEMPLATES } from './snow_templates';
export const SNOW_API = {

    _fetch: async function (endpoint: string, method = 'GET', body: any = null) {
        if (!window.activeInstanceData || !window.activeInstanceData.token) {
            throw new Error("No active instance connection.");
        }

        const url = `${window.activeInstanceData.url}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserToken': window.activeInstanceData.token
        };

        const options: RequestInit = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },

    searchUsers: async function (searchTerm: string) {
        const sanitized = (searchTerm || '').replace(/[\^=]/g, "");
        const query = `nameLIKE${sanitized}^ORemailLIKE${sanitized}^active=true`;
        const endpoint = `/api/now/table/sys_user?sysparm_query=${encodeURIComponent(query)}&sysparm_limit=5&sysparm_fields=sys_id,name,email,user_name`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    impersonateUser: async function (userSysId: string) {
        const endpoint = `/api/now/ui/impersonate/${userSysId}`;
        return await this._fetch(endpoint, 'POST', null);
    },

    runBackgroundScript: async function (script: string, scope = 'global', signal: AbortSignal | null = null) {
        if (!window.activeInstanceData) throw new Error("No active instance connection.");
        const url = `${window.activeInstanceData.url}/sys.scripts.do`;

        const formData = new URLSearchParams();
        formData.append('script', script);
        formData.append('runscript', 'Run script');
        formData.append('sys_scope', scope);
        formData.append('sysparm_ck', window.activeInstanceData.token);

        const fetchOptions: any = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'text/html'
            },
            body: formData.toString()
        };
        if (signal) fetchOptions.signal = signal;

        const response = await fetch(url, fetchOptions);

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

    fetchCategories: async function () {
        const endpoint = `/api/now/table/sc_category?sysparm_query=active=true&sysparm_fields=sys_id,title&sysparm_limit=1000`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    fetchVariableSets: async function () {
        const endpoint = `/api/now/table/item_option_new_set?sysparm_query=active=true&sysparm_fields=sys_id,title,name&sysparm_limit=1000`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    fetchUpdateSets: async function (scopeId: string, searchTerm = "", limit = 20) {
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

    setUpdateSetAndScope: async function (scopeId: string, updateSetId: string) {
        if (!window.activeInstanceData) throw new Error("No active instance connection.");
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
     fetchLogs: async function(queryStr = 'ORDERBYDESCsys_created_on', limit = 30) {
        let finalQuery = queryStr;
        if (!finalQuery.includes('ORDERBYDESC')) {
            finalQuery = `${finalQuery}^ORDERBYDESCsys_created_on`;
        }
        const endpoint = `/api/now/table/syslog?sysparm_query=${encodeURIComponent(finalQuery)}&sysparm_fields=sys_id,level,message,source,sys_created_on&sysparm_limit=${limit}`;
        
        const data = await this._fetch(endpoint);
        return data.result;
    },

/**
     * Recursively traces the table extension hierarchy via REST
     * to safely replicate GlideTableHierarchy without triggering security blocks.
     */
    _getTableHierarchy: async function(tableName: string) {
        // console.log(`[API] Resolving table hierarchy for: ${tableName}...`);
        let hierarchy: string[] = [];
        let currentTable: string | null = tableName;

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

    exportDictionary: async function(tableName: string) {
        // console.log(`[API] exportDictionary called for table: "${tableName}"`);
        
        // 1. Get the full family tree of the table
        const hierarchy = await this._getTableHierarchy(tableName);
        // console.log(`[API] Hierarchy resolved successfully: ${hierarchy.join(', ')}`);

        // 2. Query the dictionary using standard IN operator (100% REST safe)
        const query = `nameIN${hierarchy.join(',')}^internal_type!=collection`;
        const endpoint = `/api/now/table/sys_dictionary?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=element,column_label,internal_type,reference,max_length&sysparm_limit=2000`;
        
        // console.log(`[API] Executing Request to Endpoint: ${endpoint}`);
        
        const data = await this._fetch(endpoint);
        
        // console.log(`[API] Response received. Found ${data.result ? data.result.length : 0} records.`);
        return data.result;
    },

    cloneCatalogItem: async function (config: any) {
        const script = SNOW_TEMPLATES.getCloneScript(config);
        return await this.runBackgroundScript(script, config.scope);
    },

    analyzeUserAcls: async function (userSysId: string, tablesArray: any[]) {
        const tablesString = JSON.stringify(tablesArray);
        const script = SNOW_TEMPLATES.getAclScript(userSysId, tablesString);
        return await this.runBackgroundScript(script, 'global');
    },

    bulkCreateCatalogItems: async function (payload: any, isDryRun: boolean) {
        const payloadStr = JSON.stringify(payload);
        const script = SNOW_TEMPLATES.getBulkBuilderScript(payloadStr, isDryRun);
        return await this.runBackgroundScript(script, 'global');
    }
,
    fetchStatsDo: async function (): Promise<any> {
        if (!window.activeInstanceData || !window.activeInstanceData.token) {
            throw new Error("No active instance connection.");
        }
        const url = `${window.activeInstanceData.url}/stats.do`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-UserToken': window.activeInstanceData.token
            }
        });
        if (!response.ok) {
            throw new Error(`API Error fetching stats: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        return this.parseStatsHtml(html);
    },

    parseStatsHtml: function (html: string): any {
        const stats: any = {
            version: 'Unknown Version',
            buildTag: '',
            freeMemory: 0,
            maxMemory: 0,
            usedMemory: 0,
            sessions: '--',
            processorTime: '--',
            dbActive: '--',
            dbTotal: '--',
            dbLatency: '',
            rawHeader: ''
        };

        stats.rawHeader = html.substring(0, 1500).replace(/<[^>]*>/g, '').trim();

        const releaseMatch = html.match(/ServiceNow release:\s*([^\r\n<]+)/i);
        const buildMatch = html.match(/Build name:\s*([^\r\n<]+)/i);
        const buildDateMatch = html.match(/Build date:\s*([^\r\n<]+)/i);
        
        if (buildMatch) {
            stats.version = buildMatch[1].trim();
        } else if (releaseMatch) {
            stats.version = releaseMatch[1].trim();
        }
        
        if (buildDateMatch) {
            stats.buildTag = `Build Date: ${buildDateMatch[1].trim()}`;
        } else if (releaseMatch && buildMatch) {
            stats.buildTag = releaseMatch[1].trim();
        }

        // Servlet Memory vs Classic Memory Parser
        const servletMemBlock = html.match(/Servlet Memory\s*[\r\n]+Max memory:\s*([\d.]+)\s*[\r\n]+Allocated:\s*([\d.]+)\s*[\r\n]+In use:\s*([\d.]+)/i);
        if (servletMemBlock) {
            const maxMB = parseFloat(servletMemBlock[1]);
            const usedMB = parseFloat(servletMemBlock[3]);
            stats.maxMemory = maxMB * 1024 * 1024;
            stats.usedMemory = usedMB * 1024 * 1024;
            stats.freeMemory = stats.maxMemory - stats.usedMemory;
        } else {
            const freeMemMatch = html.match(/Free memory:\s*([\d,]+)\s*bytes/i);
            const maxMemMatch = html.match(/Max memory:\s*([\d,]+)\s*bytes/i);
            
            if (freeMemMatch) {
                stats.freeMemory = parseInt(freeMemMatch[1].replace(/,/g, ''), 10);
            }
            if (maxMemMatch) {
                stats.maxMemory = parseInt(maxMemMatch[1].replace(/,/g, ''), 10);
            }
            if (stats.maxMemory && stats.freeMemory) {
                stats.usedMemory = stats.maxMemory - stats.freeMemory;
            }
        }

        // Sessions count matching Logged in sessions: 1 (5 active)
        const sessionMatch = html.match(/(?:Logged in sessions|Active user sessions|Logged in users|Active sessions):\s*(\d+)(?:\s*\(\s*(\d+)\s*active\s*\))?/i);
        if (sessionMatch) {
            if (sessionMatch[2]) {
                stats.sessions = `${sessionMatch[1]} (${sessionMatch[2]} active)`;
            } else {
                stats.sessions = sessionMatch[1];
            }
        } else {
            const altSessionMatch = html.match(/sessions:\s*(\d+)/i);
            if (altSessionMatch) stats.sessions = altSessionMatch[1];
        }

        // Processor speed / Transactions
        const procMatch = html.match(/(?:Completed requests|Processor time):\s*([\d,]+)\s*ms/i);
        const txsCountMatch = html.match(/Transactions:\s*(\d+)/i);
        if (procMatch) {
            stats.processorTime = procMatch[1];
        } else if (txsCountMatch) {
            stats.processorTime = `${parseInt(txsCountMatch[1], 10).toLocaleString()} (Tx total)`;
        }

        // Database Connection Pool Block vs Classic
        const dbPoolBlock = html.match(/Prefix:\s*glide[\s\S]*?Busy:\s*(\d+)[\s\S]*?Total:\s*(\d+)/i);
        if (dbPoolBlock) {
            stats.dbActive = dbPoolBlock[1];
            stats.dbTotal = dbPoolBlock[2];
        } else {
            const dbPoolMatch = html.match(/pool.*:\s*(\d+)\s*active,\s*(\d+)\s*total/i) || 
                                html.match(/connections.*:\s*(\d+)\s*active,\s*(\d+)\s*total/i) ||
                                html.match(/(\d+)\s*active\s*(?:connections|pool).*?(\d+)\s*total/i);
            if (dbPoolMatch) {
                stats.dbActive = dbPoolMatch[1];
                stats.dbTotal = dbPoolMatch[2];
            }
        }

        const dbLatencyMatch = html.match(/Database latency:\s*(\d+)/i);
        if (dbLatencyMatch) {
            stats.dbLatency = dbLatencyMatch[1];
        }

        return stats;
    },

    getActiveTransactions: async function (): Promise<any[]> {
        const endpoint = '/api/now/table/v_transaction?sysparm_fields=sys_id,age,url,thread_name,state&sysparm_limit=50&sysparm_query=ORDERBYDESCage';
        const data = await this._fetch(endpoint);
        return data.result;
    },

    cancelCurrentTransaction: async function (): Promise<boolean> {
        if (!window.activeInstanceData) {
            throw new Error("No active instance connection.");
        }
        const url = `${window.activeInstanceData.url}/cancel_my_transaction.do?sysparm_status=cancel`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-UserToken': window.activeInstanceData.token
            }
        });
        return response.ok;
    },

    cancelTransactionThread: async function (threadSysId: string): Promise<any> {
        const script = SNOW_TEMPLATES.getCancelTransactionScript(threadSysId);
        return await this.runBackgroundScript(script, 'global');
    },

    fetchActiveUpdateSetsList: async function (searchTerm = "", limit = 50): Promise<any[]> {
        let query = 'ORDERBYDESCsys_updated_on';
        if (searchTerm) {
            const sanitizedTerm = searchTerm.replace(/[\^=]/g, "");
            query = `nameLIKE${sanitizedTerm}^` + query;
        }
        const endpoint = `/api/now/table/sys_update_set?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=sys_id,name,state,description&sysparm_limit=${limit}`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    fetchRemoteUpdateSetsList: async function (searchTerm = "", limit = 50): Promise<any[]> {
        let query = 'ORDERBYDESCsys_updated_on';
        if (searchTerm) {
            const sanitizedTerm = searchTerm.replace(/[\^=]/g, "");
            query = `nameLIKE${sanitizedTerm}^` + query;
        }
        const endpoint = `/api/now/table/sys_remote_update_set?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=sys_id,name,state,description&sysparm_limit=${limit}`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    fetchUpdateXmls: async function (updateSetId: string, isRemote = false): Promise<any[]> {
        const table = isRemote ? 'sys_remote_update_xml' : 'sys_update_xml';
        const field = isRemote ? 'remote_update_set' : 'update_set';
        const query = `${field}=${updateSetId}`;
        const endpoint = `/api/now/table/${table}?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=sys_id,name,type,target_name,action,payload&sysparm_limit=2000`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    fetchAllUpdateSetsSorted: async function (): Promise<any[]> {
        const query = "stateINin progress,complete^ORDERBYsys_updated_on";
        const endpoint = `/api/now/table/sys_update_set?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=sys_id,name,state,sys_updated_on&sysparm_limit=200`;
        const data = await this._fetch(endpoint);
        return data.result;
    },

    fetchAllRemoteUpdateSetsSorted: async function (): Promise<any[]> {
        const query = "stateINloaded,previewed^ORDERBYsys_updated_on";
        const endpoint = `/api/now/table/sys_remote_update_set?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=sys_id,name,state,sys_updated_on&sysparm_limit=200`;
        const data = await this._fetch(endpoint);
        return data.result;
    }

};