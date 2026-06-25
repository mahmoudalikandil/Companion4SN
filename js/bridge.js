const SNOW_Bridge = {
    connectToInstance: async function() {
        try {
            console.log("[Bridge] Initiating connection to active tab...");
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url || !tab.url.includes('.service-now.com')) {
                throw new Error("Active tab is not a ServiceNow instance.");
            }

            let injectionResults = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',
                func: this._extractSnowData
            });

            const result = injectionResults[0].result;

            if (!result.token) {
                throw new Error("Could not locate g_ck token. Ensure you are logged in.");
            }

            console.log("[Bridge] Connection successful. Data retrieved:", result);
            return result;
        } catch (error) {
            console.error("[Bridge] Connection Error:", error);
            throw error;
        }
    },

    _extractSnowData: function() {
        console.log("[Bridge Content] Scanning window for table data...");
        let tableName = null;
        let flowContextId = null; // NEW: Variable for Flow Tracking
        const ignoreList = ['nav_to', 'sys_scripts', 'sys_update_set', 'ui_page', 'start', 'cancel'];

        // 1. Detect standard variables
        if (typeof g_form !== 'undefined' && g_form.getTableName) tableName = g_form.getTableName();
        if (!tableName && window.NOW && window.NOW.targetTable) tableName = window.NOW.targetTable;

        // 2. Scan Iframe
        if (!tableName) {
            try {
                const iframe = document.getElementById('gsft_main');
                if (iframe) {
                    const src = iframe.contentWindow.location.pathname || iframe.getAttribute('src') || '';
                    const match = src.match(/\/([a-zA-Z0-9_]+)\.do/);
                    if (match && match[1]) tableName = match[1].replace(/_list$/, ''); 
                    
                    // NEW: Check if Iframe is on a Flow Context record
                    const searchParams = new URLSearchParams(iframe.contentWindow.location.search);
                    if (tableName === 'sys_flow_context' && searchParams.has('sys_id')) {
                        flowContextId = searchParams.get('sys_id');
                    }
                }
            } catch (e) {}
        }

        // 3. Scan URL
        if (!tableName) {
            const href = decodeURIComponent(window.location.href);
            const match = href.match(/[\/]([a-zA-Z0-9_]+)\.do/);
            if (match && match[1]) tableName = match[1].replace(/_list$/, '');
            
            // NEW: Detect Next Experience / Polaris UI Builder Flow Execution URL
            const urlParams = new URLSearchParams(window.location.search);
            if (tableName === 'sys_flow_context' && urlParams.has('sys_id')) {
                flowContextId = urlParams.get('sys_id');
            } else {
                const flowMatch = href.match(/flow\/execution\/([a-f0-9]{32})/i);
                if (flowMatch && flowMatch[1]) flowContextId = flowMatch[1];
            }
        }

        if (ignoreList.includes(tableName)) tableName = null;

        return {
            url: window.location.origin,
            token: window.g_ck || null,
            table: tableName,
            flowSysId: flowContextId // Passes the Flow ID back to popup
        };
    }
};

window.SNOW_Bridge = SNOW_Bridge;