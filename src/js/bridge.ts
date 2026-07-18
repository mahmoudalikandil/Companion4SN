/// <reference types="chrome"/>

export const SNOW_Bridge = {
    connectToInstance: async function(): Promise<any> {
        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url || !tab.url.includes('.service-now.com')) {
                throw new Error("Active tab is not a ServiceNow instance.");
            }

            let injectionResults = await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                world: 'MAIN',
                func: this._extractSnowData
            });

            const result = injectionResults[0].result as any;

            if (!result || !result.token) {
                throw new Error("Could not locate g_ck token. Ensure you are logged in.");
            }

            return result;
        } catch (error) {
            console.error("[Bridge] Connection Error:", error);
            throw error;
        }
    },

    _extractSnowData: function() {
        let tableName: string | null = null;
        let flowContextId: string | null = null; 
        const ignoreList = ['nav_to', 'sys_scripts', 'sys_update_set', 'ui_page', 'start', 'cancel'];

        // 1. Detect standard variables
        if (typeof (window as any).g_form !== 'undefined' && (window as any).g_form.getTableName) tableName = (window as any).g_form.getTableName();
        if (!tableName && (window as any).NOW && (window as any).NOW.targetTable) tableName = (window as any).NOW.targetTable;

        // 2. Scan Iframe
        if (!tableName) {
            try {
                const iframe = document.getElementById('gsft_main') as HTMLIFrameElement;
                if (iframe && iframe.contentWindow) {
                    const src = iframe.contentWindow.location.pathname || iframe.getAttribute('src') || '';
                    const match = src.match(/\/([a-zA-Z0-9_]+)\.do/);
                    if (match && match[1]) tableName = match[1].replace(/_list$/, ''); 
                    
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
            
            const urlParams = new URLSearchParams(window.location.search);
            if (tableName === 'sys_flow_context' && urlParams.has('sys_id')) {
                flowContextId = urlParams.get('sys_id');
            } else {
                const flowMatch = href.match(/flow\/execution\/([a-f0-9]{32})/i);
                if (flowMatch && flowMatch[1]) flowContextId = flowMatch[1];
            }
        }

        if (tableName && ignoreList.includes(tableName)) tableName = null;

        let catItemSysId: string | null = null;
        let catItemName: string | null = null;
        let catItemTable: string | null = null;

        const scTables = ['sc_cat_item', 'sc_cat_item_producer', 'sc_cat_item_guide', 'sc_cat_item_content', 'std_change_record_producer'];
        
        const extractFromGForm = (gf: any) => {
            if (gf && gf.getTableName && gf.getUniqueValue) {
                const tbl = gf.getTableName();
                if (scTables.includes(tbl) || tbl.startsWith('sc_cat_item')) {
                    catItemTable = tbl;
                    catItemSysId = gf.getUniqueValue();
                    if (gf.getValue) catItemName = gf.getValue('name');
                    return true;
                }
            }
            return false;
        };

        if (typeof (window as any).g_form !== 'undefined') {
            extractFromGForm((window as any).g_form);
        }

        if (!catItemSysId) {
            try {
                const iframe = document.getElementById('gsft_main') as HTMLIFrameElement;
                if (iframe && iframe.contentWindow && (iframe.contentWindow as any).g_form) {
                    extractFromGForm((iframe.contentWindow as any).g_form);
                }
            } catch(e) {}
        }

        if (!catItemSysId) {
            try {
                const urlSrc = window.location.href;
                const iframe = document.getElementById('gsft_main') as HTMLIFrameElement;
                const iframeSrc = iframe ? (iframe.contentWindow?.location.href || iframe.getAttribute('src') || '') : '';
                
                const parseUrl = (url: string) => {
                    const decodedUrl = decodeURIComponent(url);
                    const match = decodedUrl.match(/\/([a-zA-Z0-9_]+)\.do/);
                    if (match && match[1]) {
                        const tbl = match[1];
                        if (scTables.includes(tbl) || tbl.startsWith('sc_cat_item')) {
                            const sysIdMatch = decodedUrl.match(/[?&]sys_id=([a-f0-9]{32})/i);
                            if (sysIdMatch && sysIdMatch[1]) {
                                catItemTable = tbl;
                                catItemSysId = sysIdMatch[1];
                            }
                        }
                    }
                };
                
                parseUrl(urlSrc);
                if (!catItemSysId && iframeSrc) {
                    parseUrl(iframeSrc);
                }
            } catch(e) {}
        }

        if (catItemSysId && !catItemName) {
            try {
                const docTitle = document.title;
                if (docTitle && docTitle !== 'ServiceNow') {
                    catItemName = docTitle.split(' | ')[0];
                }
            } catch(e) {}
        }

        return {
            url: window.location.origin,
            token: (window as any).g_ck || null,
            table: tableName,
            flowSysId: flowContextId, 
            catItemSysId: catItemSysId,
            catItemName: catItemName,
            catItemTable: catItemTable
        };
    }
};


