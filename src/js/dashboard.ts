import './types';
import * as XLSX from 'xlsx';
import { SNOW_API } from './api';
import { SNOW_Bridge } from './bridge';

document.addEventListener('DOMContentLoaded', () => {
    
    window.activeInstanceData = null;

    const btnConnect = document.getElementById('btnConnect') as HTMLButtonElement;
    const connStatus = document.getElementById('connStatus') as HTMLElement;
    const toolNav = document.getElementById('toolNav') as HTMLElement;
    const navItems = document.querySelectorAll('.nav-list li');
    const toolPanels = document.querySelectorAll('.tool-panel');

    const searchInput = document.getElementById('impersonateSearch') as HTMLInputElement;
    const btnSearch = document.getElementById('btnSearchUser') as HTMLButtonElement;
    const searchResults = document.getElementById('userSearchResults') as HTMLUListElement;

    const btnRunScript = document.getElementById('btnRunScript') as HTMLButtonElement;
    const codeArea = document.getElementById('codeArea') as HTMLTextAreaElement;
    const scriptResultsBox = document.getElementById('scriptResultsBox') as HTMLElement;
    const scriptOutput = document.getElementById('scriptOutput') as HTMLElement;
    const snippetSelector = document.getElementById('snippetSelector') as HTMLSelectElement;

    const scopeSelect = document.getElementById('scopeSelect') as HTMLSelectElement;
    const updateSetSelect = document.getElementById('updateSetSelect') as HTMLSelectElement;
    const scopeSearch = document.getElementById('scopeSearch') as HTMLInputElement;
    const updateSetSearch = document.getElementById('updateSetSearch') as HTMLInputElement;
    const btnApplyUpdateSet = document.getElementById('btnApplyUpdateSet') as HTMLButtonElement;
    const updateSetStatus = document.getElementById('updateSetStatus') as HTMLElement;

    const schemaTableInput = document.getElementById('schemaTableInput') as HTMLInputElement;
    const btnDetectTable = document.getElementById('btnDetectTable') as HTMLButtonElement;
    const btnExportCSV = document.getElementById('btnExportCSV') as HTMLButtonElement;
    const btnExportJSON = document.getElementById('btnExportJSON') as HTMLButtonElement;
    const schemaStatus = document.getElementById('schemaStatus') as HTMLElement;

    const flowSysIdInput = document.getElementById('flowSysIdInput') as HTMLInputElement;
    const btnTrackFlow = document.getElementById('btnTrackFlow') as HTMLButtonElement;
    const flowTrackerStatus = document.getElementById('flowTrackerStatus') as HTMLElement;

    const clonerSourceTable = document.getElementById('clonerSourceTable') as HTMLInputElement;
    const clonerSourceSysId = document.getElementById('clonerSourceSysId') as HTMLInputElement;
    const clonerSourceName = document.getElementById('clonerSourceName') as HTMLInputElement;
    const btnDetectClonerSource = document.getElementById('btnDetectClonerSource') as HTMLButtonElement;
    const clonerNewName = document.getElementById('clonerNewName') as HTMLInputElement;
    const clonerScopeSelect = document.getElementById('clonerScopeSelect') as HTMLSelectElement;
    const btnRunClone = document.getElementById('btnRunClone') as HTMLButtonElement;
    const clonerResultsBox = document.getElementById('clonerResultsBox') as HTMLElement;
    const clonerOutput = document.getElementById('clonerOutput') as HTMLElement;

    const aclUserSearch = document.getElementById('aclUserSearch') as HTMLInputElement;
    const btnAclSearchUser = document.getElementById('btnAclSearchUser') as HTMLButtonElement;
    const aclUserSearchResults = document.getElementById('aclUserSearchResults') as HTMLUListElement;
    const aclUserCard = document.getElementById('aclUserCard') as HTMLElement;
    const aclTargetUserName = document.getElementById('aclTargetUserName') as HTMLElement;
    const aclTargetUserSysId = document.getElementById('aclTargetUserSysId') as HTMLElement;
    const aclDiagnosticsArea = document.getElementById('aclDiagnosticsArea') as HTMLElement;
    const aclRoleTree = document.getElementById('aclRoleTree') as HTMLElement;
    const aclTableGrid = document.getElementById('aclTableGrid') as HTMLElement;
    const aclCustomTableInput = document.getElementById('aclCustomTableInput') as HTMLInputElement;
    const btnAclCheckCustomTable = document.getElementById('btnAclCheckCustomTable') as HTMLButtonElement;
    const aclResultsBox = document.getElementById('aclResultsBox') as HTMLElement;
    const aclOutput = document.getElementById('aclOutput') as HTMLElement;

    let scopesLoaded = false;
    let currentScopeId = 'global';

    const SNIPPETS = {
        incident: "var gr = new GlideRecord('incident');\ngr.setLimit(5);\ngr.query();\nwhile(gr.next()) {\n    gs.info(gr.number + ' - ' + gr.short_description);\n}",
        user: "var gr = new GlideRecord('sys_user');\ngr.addEncodedQuery('active=true');\ngr.query();\ngs.info('Total Active Users: ' + gr.getRowCount());",
        property: "var gr = new GlideRecord('sys_properties');\ngr.addQuery('name', 'glide.sys.language');\ngr.query();\nif(gr.next()) {\n    gs.info('System Language: ' + gr.value);\n}"
    };

    if(snippetSelector) {
        snippetSelector.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            if (SNIPPETS[target.value as keyof typeof SNIPPETS]) codeArea.value = SNIPPETS[target.value as keyof typeof SNIPPETS];
        });
    }

    // --- CENTRALIZED BRIDGE CONNECTION ---
    btnConnect.addEventListener('click', async () => {
        try {
            btnConnect.textContent = "Connecting...";
            window.activeInstanceData = await SNOW_Bridge.connectToInstance();
            if (!window.activeInstanceData) return;

            connStatus.textContent = "Connected Live";
            connStatus.className = "status-indicator success";
            
            const instUrl = document.getElementById('instanceUrl');
            if (instUrl) instUrl.textContent = window.activeInstanceData.url;
            
            const tokStatus = document.getElementById('tokenStatus');
            if (tokStatus) tokStatus.innerHTML = `<span class="dot active"></span> Token Captured`;

            btnConnect.style.display = "none";
            toolNav.classList.remove('hidden');
            
            // Flow Tracker Auto-Detect Injection
            if (window.activeInstanceData.flowSysId) {
                flowSysIdInput.value = window.activeInstanceData.flowSysId;
                btnTrackFlow.disabled = false;
                flowTrackerStatus.style.color = "#2e7d32";
                flowTrackerStatus.textContent = "Flow Execution Context auto-detected!";
            }

            // Cloner Auto-Detect Injection
            if (window.activeInstanceData.catItemSysId) {
                clonerSourceTable.value = window.activeInstanceData.catItemTable || '';
                clonerSourceSysId.value = window.activeInstanceData.catItemSysId || '';
                clonerSourceName.value = window.activeInstanceData.catItemName || '';
            }

            // Only switch to bulk panel if welcome panel is currently active
            const pWelcome = document.getElementById('panel-welcome');
            if (pWelcome && pWelcome.classList.contains('active')) {
                switchPanel('panel-bulk');
            }
            loadBulkBuilderMetadata();
        } catch (error: any) {
            connStatus.textContent = "Connection Failed";
            connStatus.className = "status-indicator error";
            btnConnect.textContent = "Retry Connection";
        }
    });

    // --- NAVIGATION LOGIC ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const target = (item as HTMLElement).dataset.target;
            if (target) switchPanel(target);
        });
    });

    function switchPanel(panelId: string) {
        toolPanels.forEach(p => p.classList.remove('active', 'hidden'));
        toolPanels.forEach(p => {
            if (p.id === panelId) p.classList.add('active');
            else p.classList.add('hidden');
        });

        if ((panelId === 'panel-updateset' || panelId === 'panel-cloner') && !scopesLoaded && window.activeInstanceData) {
            loadScopes();
        }
    }

    // --- IMPERSONATOR LOGIC ---
    btnSearch.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        btnSearch.textContent = "...";
        searchResults.innerHTML = '';
        searchResults.classList.remove('hidden');

        try {
            const users = await SNOW_API.searchUsers(query);
            if (users.length === 0) {
                searchResults.innerHTML = '<li class="empty-state">No users found.</li>';
            } else {
                users.forEach((user: any) => {
                    const li = document.createElement('li');
                    
                    const strong = document.createElement('strong');
                    strong.textContent = user.name;
                    li.appendChild(strong);
                    
                    const textNode = document.createTextNode(` (${user.user_name})`);
                    li.appendChild(textNode);
                    
                    li.addEventListener('click', () => triggerImpersonation(user.sys_id, user.name));
                    searchResults.appendChild(li);
                });
            }
        } catch (error: any) {
            searchResults.innerHTML = `<li class="empty-state" style="color:red;">Error: ${error.message}</li>`;
        }
        btnSearch.textContent = "Search";
    });

    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnSearch.click(); });

    async function triggerImpersonation(sysId: string, name: string) {
        try {
            await SNOW_API.impersonateUser(sysId);
            alert(`Success! Impersonating ${name}. Refreshing page...`);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if(tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
            });
            setTimeout(() => window.close(), 1000);
        } catch (error: any) {
            alert(`Failed to impersonate: ${error.message}`);
        }
    }

    // --- BG SCRIPT LOGIC ---
    btnRunScript.addEventListener('click', async () => {
        const script = codeArea.value.trim();
        if (!script) return alert('Script cannot be empty.');

        btnRunScript.textContent = "Executing...";
        btnRunScript.disabled = true;
        scriptResultsBox.classList.add('hidden');

        try {
            const output = await SNOW_API.runBackgroundScript(script);
            scriptOutput.textContent = output;
            scriptResultsBox.classList.remove('hidden');
        } catch (error: any) {
            scriptOutput.textContent = `Execution Error: ${error.message}`;
            scriptResultsBox.classList.remove('hidden');
        }

        btnRunScript.textContent = "Execute Script";
        btnRunScript.disabled = false;
    });

    // --- UPDATE SET & SCOPE LOGIC ---
    if(scopeSearch && scopeSelect) {
        scopeSearch.addEventListener('input', (e) => {
            const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
            const options = scopeSelect.options;
            let firstVisibleIndex = -1;
            
            for (let i = 0; i < options.length; i++) {
                const text = options[i].text.toLowerCase();
                if (text.includes(searchTerm)) {
                    options[i].style.display = '';
                    if (firstVisibleIndex === -1) firstVisibleIndex = i;
                } else {
                    options[i].style.display = 'none';
                }
            }
            if (firstVisibleIndex !== -1 && scopeSelect.selectedIndex !== firstVisibleIndex) {
                scopeSelect.selectedIndex = firstVisibleIndex;
                scopeSelect.dispatchEvent(new Event('change'));
            }
        });
    }

    if(updateSetSearch && updateSetSelect) {
        updateSetSearch.addEventListener('input', (e) => {
            const term = (e.target as HTMLInputElement).value.trim();
            clearTimeout(window.usTimer);
            window.usTimer = setTimeout(async () => {
                updateSetSelect.innerHTML = '<option>Searching server...</option>';
                updateSetSelect.disabled = true;
                
                try {
                    const results = await SNOW_API.fetchUpdateSets(currentScopeId, term, 20);
                    updateSetSelect.innerHTML = '';
                    
                    if(results.length === 0) {
                        updateSetSelect.innerHTML = '<option value="">No matches found</option>';
                    } else {
                        results.forEach((us: any) => {
                            const opt = document.createElement('option');
                            opt.value = us.sys_id;
                            opt.textContent = us.name;
                            updateSetSelect.appendChild(opt);
                        });
                        updateSetSelect.disabled = false;
                    }
                } catch (err) {
                    updateSetSelect.innerHTML = '<option>Search Error</option>';
                }
            }, 500); 
        });
    }

    async function loadScopes() {
        try {
            scopeSelect.innerHTML = '<option>Loading...</option>';
            if (clonerScopeSelect) clonerScopeSelect.innerHTML = '<option>Loading...</option>';
            const scopes = await SNOW_API.fetchScopes();
            
            scopeSelect.innerHTML = '';
            if (clonerScopeSelect) clonerScopeSelect.innerHTML = '';
            scopes.forEach((scope: any) => {
                const opt = document.createElement('option');
                opt.value = scope.sys_id;
                opt.textContent = scope.name;
                scopeSelect.appendChild(opt);

                if (clonerScopeSelect) {
                    const optCloner = document.createElement('option');
                    optCloner.value = scope.sys_id;
                    optCloner.textContent = scope.name;
                    clonerScopeSelect.appendChild(optCloner);
                }
            });

            scopeSelect.disabled = false;
            scopeSearch.disabled = false;
            scopesLoaded = true;

            loadUpdateSets(scopeSelect.value);
        } catch (error) {
            scopeSelect.innerHTML = `<option>Error loading scopes</option>`;
            if (clonerScopeSelect) clonerScopeSelect.innerHTML = `<option>Error loading scopes</option>`;
        }
    }

    async function loadUpdateSets(scopeId: string) {
        try {
            currentScopeId = scopeId;
            updateSetSelect.innerHTML = '<option>Loading initial 20 records...</option>';
            updateSetSelect.disabled = true;
            updateSetSearch.disabled = true;
            updateSetSearch.value = ""; 
            btnApplyUpdateSet.disabled = true;

            const updateSets = await SNOW_API.fetchUpdateSets(scopeId, "", 20);
            
            updateSetSelect.innerHTML = '';
            if (updateSets.length === 0) {
                updateSetSelect.innerHTML = '<option value="">No "In Progress" Update Sets found</option>';
            } else {
                updateSets.forEach((us: any) => {
                    const opt = document.createElement('option');
                    opt.value = us.sys_id;
                    opt.textContent = us.name;
                    updateSetSelect.appendChild(opt);
                });

                updateSetSelect.disabled = false;
                updateSetSearch.disabled = false;
                btnApplyUpdateSet.disabled = false;
            }
        } catch (error) {
            updateSetSelect.innerHTML = `<option>Error loading update sets</option>`;
        }
    }

    if (scopeSelect) {
        scopeSelect.addEventListener('change', (e) => loadUpdateSets((e.target as HTMLSelectElement).value));
    }

    if (btnApplyUpdateSet) {
        btnApplyUpdateSet.addEventListener('click', async () => {
            const scopeId = scopeSelect.value;
            const updateSetId = updateSetSelect.value;

            btnApplyUpdateSet.textContent = "Applying...";
            btnApplyUpdateSet.disabled = true;
            updateSetStatus.textContent = "";

            try {
                await SNOW_API.setUpdateSetAndScope(scopeId, updateSetId);
                
                updateSetStatus.style.color = "#2e7d32";
                updateSetStatus.textContent = "Success! Refreshing page...";

                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if(tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
                });
                
                setTimeout(() => window.close(), 1000);

            } catch (error: any) {
                updateSetStatus.style.color = "#c62828";
                updateSetStatus.textContent = "Error: " + error.message;
                btnApplyUpdateSet.textContent = "Apply Changes";
                btnApplyUpdateSet.disabled = false;
            }
        });
    }

    // --- SCHEMA EXPORTER LOGIC ---
    if (btnDetectTable) {
        btnDetectTable.addEventListener('click', async () => {
            try {
                btnDetectTable.textContent = "...";
                const activeData = await SNOW_Bridge.connectToInstance();
                window.activeInstanceData = activeData;

                if (activeData && activeData.table) {
                    schemaTableInput.value = activeData.table;
                    schemaStatus.style.color = "#2e7d32";
                    schemaStatus.textContent = "Table detected automatically.";
                } else {
                    schemaStatus.style.color = "#c62828";
                    schemaStatus.textContent = "Could not detect table on active tab.";
                }
            } catch (err: any) {
                schemaStatus.style.color = "#c62828";
                schemaStatus.textContent = "Auto-detect failed: " + err.message;
            } finally {
                btnDetectTable.textContent = "Auto-Detect";
            }
        });
    }

    function triggerFileDownload(content: string, filename: string, type: string) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function handleExport(format: string) {
        const table = schemaTableInput.value.trim().toLowerCase();
        if (!table) return alert('Please enter or detect a table name first.');

        schemaStatus.style.color = "#181a1f";
        schemaStatus.textContent = "Fetching schema from server...";
        btnExportCSV.disabled = true;
        btnExportJSON.disabled = true;

        try {
            const records = await SNOW_API.exportDictionary(table);
            
            if (!records || records.length === 0) {
                schemaStatus.style.color = "#c62828";
                schemaStatus.textContent = `No dictionary records found for table: ${table}`;
            } else {
                if (format === 'json') {
                    triggerFileDownload(JSON.stringify(records, null, 2), `${table}_schema.json`, "application/json");
                } else if (format === 'csv') {
                    let csv = "Column Label,Backend Name (element),Type,Reference Table,Max Length\n";
                    records.forEach((r: any) => {
                        const label = r.column_label ? `"${r.column_label.replace(/"/g, '""')}"` : '""';
                        const ref = r.reference ? r.reference.value : '';
                        csv += `${label},${r.element},${r.internal_type},${ref},${r.max_length}\n`;
                    });
                    triggerFileDownload(csv, `${table}_schema.csv`, "text/csv");
                }
                schemaStatus.style.color = "#2e7d32";
                schemaStatus.textContent = `Success! Exported ${records.length} fields.`;
            }
        } catch (error: any) {
            schemaStatus.style.color = "#c62828";
            schemaStatus.textContent = "Error: " + error.message;
        }

        btnExportCSV.disabled = false;
        btnExportJSON.disabled = false;
    }

    if (btnExportCSV) btnExportCSV.addEventListener('click', () => handleExport('csv'));
    if (btnExportJSON) btnExportJSON.addEventListener('click', () => handleExport('json'));

    // --- FLOW TRACKER EVENT LISTENER ---
    if (btnTrackFlow) {
        btnTrackFlow.addEventListener('click', () => {
            const sysId = flowSysIdInput.value.trim();
            if (sysId.length !== 32) return alert("Invalid Sys ID.");

            if (!window.activeInstanceData) return;
            chrome.runtime.sendMessage({
                action: "START_FLOW_TRACKING",
                url: window.activeInstanceData.url,
                token: window.activeInstanceData.token,
                sysId: sysId
            }, (_response) => {
                if (chrome.runtime.lastError) {
                    flowTrackerStatus.style.color = "#c62828";
                    flowTrackerStatus.textContent = "Error communicating with background worker.";
                } else {
                    flowTrackerStatus.style.color = "#1b5c53";
                    flowTrackerStatus.textContent = "Tracking started! You can safely close this popup.";
                    btnTrackFlow.disabled = true;
                    btnTrackFlow.textContent = "Tracking...";
                }
            });
        });
    }

    // --- REAL-TIME LOG VIEWER LOGIC ---
    const btnStreamLogs = document.getElementById('btnStreamLogs') as HTMLButtonElement;
    const btnClearLogs = document.getElementById('btnClearLogs') as HTMLButtonElement;
    const logFilterInput = document.getElementById('logFilterInput') as HTMLInputElement;
    const logTerminal = document.getElementById('logTerminal') as HTMLElement;

    let logStreamInterval: any = null;
    let seenLogIds = new Set();
    let isStreaming = false;

    function appendLog(level: any, source: string, message: string, time: string, isSystem = false) {
        const div = document.createElement('div');
        div.className = isSystem ? 'log-entry log-system' : 'log-entry';
        
        if (isSystem) {
            div.textContent = `[System] ${message}`;
        } else {
            // Apply color coding based on SNOW log level (0=Error, 1=Warn, 2=Info)
            let levelClass = 'log-level-info';
            let levelText = 'INFO';
            if (level === '0' || level === 'error') { levelClass = 'log-level-error'; levelText = 'ERROR'; }
            if (level === '1' || level === 'warning') { levelClass = 'log-level-warning'; levelText = 'WARN'; }

            const metaSpan = document.createElement('span');
            metaSpan.className = 'log-meta';
            metaSpan.textContent = `${time} | Source: ${source}`;
            div.appendChild(metaSpan);

            div.appendChild(document.createTextNode(' '));

            const levelSpan = document.createElement('span');
            levelSpan.className = levelClass;
            levelSpan.textContent = `[${levelText}]`;
            div.appendChild(levelSpan);

            div.appendChild(document.createTextNode(` ${message}`));
        }

        logTerminal.appendChild(div);
        
        // Auto-scroll to bottom
        logTerminal.scrollTop = logTerminal.scrollHeight;
    }

    async function pollLogs() {
        if (!isStreaming) return;

        try {
            const logs = await SNOW_API.fetchLogs();
            const filterText = logFilterInput.value.trim().toLowerCase();
            
            // ServiceNow returns DESC. We reverse it so the oldest prints first, newest at the bottom.
            const newLogs = logs.reverse().filter((log: any) => {
                if (seenLogIds.has(log.sys_id)) return false;
                
                // If user typed a filter, check if source or message contains it
                if (filterText) {
                    const matchSource = (log.source || '').toLowerCase().includes(filterText);
                    const matchMsg = (log.message || '').toLowerCase().includes(filterText);
                    if (!matchSource && !matchMsg) return false;
                }
                
                return true;
            });

            newLogs.forEach((log: any) => {
                seenLogIds.add(log.sys_id);
                appendLog(log.level, log.source, log.message, log.sys_created_on);
            });

        } catch (error: any) {
            appendLog('0', 'Extension API', `Failed to fetch logs: ${error.message}`, '', false);
            toggleStream(); // Stop streaming on error
        }
    }

    function toggleStream() {
        if (isStreaming) {
            // Stop Streaming
            clearInterval(logStreamInterval);
            isStreaming = false;
            btnStreamLogs.textContent = "Start Stream";
            btnStreamLogs.className = "primary-btn";
            appendLog('', '', 'Stream paused.', '', true);
        } else {
            // Start Streaming
            if (!window.activeInstanceData) return alert("Not connected to instance.");
            isStreaming = true;
            btnStreamLogs.textContent = "Stop Stream";
            btnStreamLogs.className = "secondary-btn";
            btnStreamLogs.style.borderColor = "#c62828"; // Visual indicator
            btnStreamLogs.style.color = "#c62828";
            
            appendLog('', '', 'Initiating stream connection...', '', true);
            
            // Do one immediate poll, then set interval for every 3 seconds
            pollLogs();
            logStreamInterval = setInterval(pollLogs, 3000);
        }
    }

    if (btnStreamLogs) btnStreamLogs.addEventListener('click', toggleStream);

    if (btnClearLogs) {
        btnClearLogs.addEventListener('click', () => {
            logTerminal.innerHTML = '';
            appendLog('', '', 'Terminal cleared.', '', true);
            // We intentionally do NOT clear seenLogIds so we don't re-print old logs
        });
    }

    // Stop stream if they navigate away from the logs tab to save bandwidth
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if ((item as HTMLElement).dataset.target !== 'panel-logs' && isStreaming) {
                toggleStream();
            }
        });
    });

    // --- XML PAYLOAD STUDIO LOGIC ---
    const xmlEditorArea = document.getElementById('xmlEditorArea') as HTMLTextAreaElement;
    const btnFormatXML = document.getElementById('btnFormatXML') as HTMLButtonElement;
    const btnStripSysMeta = document.getElementById('btnStripSysMeta') as HTMLButtonElement;
    const btnCopyXML = document.getElementById('btnCopyXML') as HTMLButtonElement;
    const btnDownloadXML = document.getElementById('btnDownloadXML') as HTMLButtonElement;
    const xmlStatus = document.getElementById('xmlStatus') as HTMLElement;

    function showXmlStatus(message: string, isError = false) {
        xmlStatus.style.color = isError ? "#c62828" : "#2e7d32";
        xmlStatus.textContent = message;
        setTimeout(() => xmlStatus.textContent = "", 3000);
    }

    // Lightweight Vanilla JS XML Beautifier
    function formatXMLText(xml: string) {
        let formatted = '';
        let pad = 0;
        // Strip existing whitespace between tags to ensure clean format
        xml = xml.replace(/(>)\s*(<)/g, "$1\n$2");
        
        xml.split('\n').forEach(function(node: string) {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0; // Text node
            } else if (node.match(/^<\/\w/)) {
                if (pad !== 0) pad -= 1; // Closing tag
            } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                indent = 1; // Opening tag
            }
            formatted += '    '.repeat(pad) + node + '\n';
            pad += indent;
        });
        return formatted.trim();
    }

    if (btnFormatXML) {
        btnFormatXML.addEventListener('click', () => {
            let rawXml = xmlEditorArea.value.trim();
            if (!rawXml) return showXmlStatus("Editor is empty.", true);
            try {
                xmlEditorArea.value = formatXMLText(rawXml);
                showXmlStatus("XML Formatted beautifully.");
            } catch (e) {
                showXmlStatus("Failed to format XML.", true);
            }
        });
    }

    if (btnStripSysMeta) {
        btnStripSysMeta.addEventListener('click', () => {
            let xml = xmlEditorArea.value;
            if (!xml) return showXmlStatus("Editor is empty.", true);
            
            // Regex to find and remove SNOW system tags (e.g., <sys_id>123...</sys_id>)
            const tagsToStrip = ['sys_id', 'sys_created_by', 'sys_created_on', 'sys_updated_by', 'sys_updated_on', 'sys_mod_count', 'sys_tags'];
            
            let originalLength = xml.length;
            tagsToStrip.forEach(tag => {
                // Matches <tag>...</tag> and any trailing whitespace/newlines
                const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>\\n?`, 'g');
                xml = xml.replace(regex, '');
            });

            if (xml.length === originalLength) {
                showXmlStatus("No system metadata found to strip.");
            } else {
                xmlEditorArea.value = xml;
                showXmlStatus("System metadata stripped successfully!");
            }
        });
    }

    if (btnCopyXML) {
        btnCopyXML.addEventListener('click', () => {
            if (!xmlEditorArea.value.trim()) return showXmlStatus("Nothing to copy.", true);
            navigator.clipboard.writeText(xmlEditorArea.value).then(() => {
                showXmlStatus("Copied to clipboard!");
            }).catch(_err => {
                showXmlStatus("Clipboard copy failed.", true);
            });
        });
    }

    if (btnDownloadXML) {
        btnDownloadXML.addEventListener('click', () => {
            const xml = xmlEditorArea.value.trim();
            if (!xml) return showXmlStatus("Cannot download empty file.", true);
            // We reuse the triggerFileDownload function from the Schema Exporter!
            triggerFileDownload(xml, `snow_payload_${Date.now()}.xml`, "application/xml");
            showXmlStatus("File downloaded.");
        });
    }

    if (flowSysIdInput) {
        flowSysIdInput.addEventListener('input', (e) => {
            btnTrackFlow.disabled = ((e.target as HTMLInputElement).value.trim().length !== 32); 
        });
    }

    if (btnDetectClonerSource) {
        btnDetectClonerSource.addEventListener('click', async () => {
            try {
                btnDetectClonerSource.textContent = "...";
                const activeData = await SNOW_Bridge.connectToInstance();
                window.activeInstanceData = activeData;

                if (activeData && activeData.catItemSysId) {
                    clonerSourceTable.value = activeData.catItemTable || '';
                    clonerSourceSysId.value = activeData.catItemSysId || '';
                    clonerSourceName.value = activeData.catItemName || '';
                } else {
                    alert("Could not auto-detect a Catalog Item on the active tab.");
                }
            } catch (err: any) {
                alert("Auto-detect failed: " + err.message);
            } finally {
                btnDetectClonerSource.textContent = "Auto-Detect";
            }
        });
    }

    if (btnRunClone) {
        btnRunClone.addEventListener('click', async () => {
            const sourceId = clonerSourceSysId.value.trim();
            const table = clonerSourceTable.value.trim();
            const newName = clonerNewName.value.trim();
            const scope = clonerScopeSelect.value;

            if (!sourceId || !table) {
                return alert("Please select or auto-detect a source Catalog Item first.");
            }
            if (!newName) {
                return alert("Please enter a name for the new Catalog Item.");
            }

            btnRunClone.textContent = "Cloning...";
            btnRunClone.disabled = true;
            clonerResultsBox.classList.remove('hidden');
            clonerOutput.textContent = "Initiating clone transaction on server...\n";

            try {
                const config = {
                    source_id: sourceId,
                    table: table,
                    new_name: newName,
                    scope: scope,
                    options: {
                        variables: (document.getElementById('chkClonerVariables') as HTMLInputElement).checked,
                        variable_sets: (document.getElementById('chkClonerVariableSets') as HTMLInputElement).checked,
                        ui_policies: (document.getElementById('chkClonerUiPolicies') as HTMLInputElement).checked,
                        client_scripts: (document.getElementById('chkClonerClientScripts') as HTMLInputElement).checked,
                        user_criteria: (document.getElementById('chkClonerUserCriteria') as HTMLInputElement).checked,
                        categories: (document.getElementById('chkClonerCategories') as HTMLInputElement).checked,
                        data_lookups: (document.getElementById('chkClonerDataLookups') as HTMLInputElement).checked,
                        related_articles: (document.getElementById('chkClonerRelatedArticles') as HTMLInputElement).checked,
                        related_items: (document.getElementById('chkClonerRelatedItems') as HTMLInputElement).checked,
                        topics: (document.getElementById('chkClonerTopics') as HTMLInputElement).checked
                    }
                };

                const output = await SNOW_API.cloneCatalogItem(config);
                clonerOutput.textContent = output;

                if (output.includes(">>>CLONE_SUCCESS:")) {
                    const match = output.match(/>>>CLONE_SUCCESS:([a-f0-9]{32})<<</);
                    const newSysId = match ? match[1] : '';
                    clonerOutput.textContent += `\n[SUCCESS] Catalog Item Cloned Successfully!`;
                    
                    if (newSysId && window.activeInstanceData) {
                        const newUrl = `${window.activeInstanceData.url}/${table}.do?sys_id=${newSysId}`;
                        clonerOutput.innerHTML += `\n\n<a href="${newUrl}" target="_blank" style="color: #4fc3f7; text-decoration: underline; font-weight: bold;">Open Cloned Item Form in Browser</a>`;
                    }
                } else if (output.includes(">>>CLONE_ERROR<<<")) {
                    clonerOutput.textContent += `\n[ERROR] Cloning process encountered errors on the server.`;
                }
            } catch (error: any) {
                clonerOutput.textContent += `\n[CRITICAL ERROR] Connection failed: ${error.message}`;
            }

            btnRunClone.textContent = "Execute Clone";
            btnRunClone.disabled = false;
        });
    }

    // --- ACL & ROLE ANALYZER EVENT BINDINGS ---
    let aclTablesList = ['incident', 'change_request', 'problem', 'sys_user', 'sys_properties', 'task'];

    if (btnAclSearchUser) {
        btnAclSearchUser.addEventListener('click', async () => {
            const query = aclUserSearch.value.trim();
            if (!query) return;

            btnAclSearchUser.textContent = "...";
            aclUserSearchResults.innerHTML = '';
            aclUserSearchResults.classList.remove('hidden');

            try {
                const users = await SNOW_API.searchUsers(query);
                if (users.length === 0) {
                    aclUserSearchResults.innerHTML = '<li class="empty-state">No users found.</li>';
                } else {
                    users.forEach((user: any) => {
                        const li = document.createElement('li');
                        
                        const strong = document.createElement('strong');
                        strong.textContent = user.name;
                        li.appendChild(strong);
                        
                        const textNode = document.createTextNode(` (${user.user_name})`);
                        li.appendChild(textNode);
                        
                        li.addEventListener('click', () => selectAclUser(user.sys_id, user.name));
                        aclUserSearchResults.appendChild(li);
                    });
                }
            } catch (error: any) {
                aclUserSearchResults.innerHTML = `<li class="empty-state" style="color:red;">Error: ${error.message}</li>`;
            }
            btnAclSearchUser.textContent = "Search";
        });
    }

    if (aclUserSearch) {
        aclUserSearch.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAclSearchUser.click(); });
    }

    async function selectAclUser(sysId: string, name: string) {
        aclUserSearchResults.classList.add('hidden');
        aclUserCard.classList.remove('hidden');
        aclTargetUserName.textContent = name;
        aclTargetUserSysId.textContent = `sys_id: ${sysId}`;
        
        aclDiagnosticsArea.classList.add('hidden');
        aclResultsBox.classList.remove('hidden');
        aclOutput.textContent = `Running security diagnostics context for ${name}...\n`;

        try {
            const responseText = await SNOW_API.analyzeUserAcls(sysId, aclTablesList);
            aclOutput.textContent = responseText;

            if (responseText.includes(">>>ACL_SUCCESS<<<")) {
                aclResultsBox.classList.add('hidden');
                aclDiagnosticsArea.classList.remove('hidden');
                
                const jsonStart = responseText.indexOf('{"roles_hierarchy"');
                const jsonEnd = responseText.lastIndexOf('}') + 1;
                
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    const jsonStr = responseText.substring(jsonStart, jsonEnd);
                    const data = JSON.parse(jsonStr);
                    
                    renderRoleTree(data.roles_hierarchy);
                    renderTableGrid(data.permissions);
                } else {
                    aclResultsBox.classList.remove('hidden');
                    aclOutput.textContent += "\n[ERROR] Failed to parse analysis JSON payload.";
                }
            } else {
                aclResultsBox.classList.remove('hidden');
                aclOutput.textContent += "\n[ERROR] Diagnostic run encountered server-side errors.";
            }
        } catch (error: any) {
            aclResultsBox.classList.remove('hidden');
            aclOutput.textContent += `\n[CRITICAL ERROR] Failed to run diagnostics: ${error.message}`;
        }
    }

    function renderRoleTree(hierarchy: any) {
        aclRoleTree.innerHTML = '';
        
        const directRoot = createTreeNode('Direct Roles', 'tree-role', '🔑', hierarchy.direct_roles.length > 0);
        if (hierarchy.direct_roles.length > 0) {
            hierarchy.direct_roles.forEach((role: any) => {
                const roleNode = createTreeNode(`${role.name}`, 'tree-role', '🛡️', role.contains.length > 0);
                if (role.contains.length > 0) {
                    role.contains.forEach((child: any) => {
                        const childNode = createTreeNode(child, 'tree-contained', '◽', false);
                        roleNode.childrenEl.appendChild(childNode.element);
                    });
                }
                directRoot.childrenEl.appendChild(roleNode.element);
            });
        } else {
            const emptyLi = document.createElement('div');
            emptyLi.className = 'empty-state';
            emptyLi.textContent = 'No direct roles assigned.';
            directRoot.childrenEl.appendChild(emptyLi);
        }
        aclRoleTree.appendChild(directRoot.element);

        const groupsRoot = createTreeNode('Groups & Group Roles', 'tree-group', '👥', hierarchy.groups.length > 0);
        if (hierarchy.groups.length > 0) {
            hierarchy.groups.forEach((group: any) => {
                const groupNode = createTreeNode(`${group.name}`, 'tree-group', '📁', group.roles.length > 0);
                if (group.roles.length > 0) {
                    group.roles.forEach((role: any) => {
                        const roleNode = createTreeNode(`${role.name}`, 'tree-role', '🛡️', role.contains.length > 0);
                        if (role.contains.length > 0) {
                            role.contains.forEach((child: any) => {
                                const childNode = createTreeNode(child, 'tree-contained', '◽', false);
                                roleNode.childrenEl.appendChild(childNode.element);
                            });
                        }
                        groupNode.childrenEl.appendChild(roleNode.element);
                    });
                } else {
                    const emptyLi = document.createElement('div');
                    emptyLi.className = 'empty-state';
                    emptyLi.textContent = 'No roles assigned to this group.';
                    groupNode.childrenEl.appendChild(emptyLi);
                }
                groupsRoot.childrenEl.appendChild(groupNode.element);
            });
        } else {
            const emptyLi = document.createElement('div');
            emptyLi.className = 'empty-state';
            emptyLi.textContent = 'No group memberships found.';
            groupsRoot.childrenEl.appendChild(emptyLi);
        }
        aclRoleTree.appendChild(groupsRoot.element);
    }

    function createTreeNode(label: string, labelClass: string, iconSymbol: string, hasChildren: boolean = false) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'tree-node-header';

        const caretSpan = document.createElement('span');
        caretSpan.className = 'tree-caret';
        caretSpan.textContent = hasChildren ? '▶' : ' ';
        headerDiv.appendChild(caretSpan);

        const iconSpan = document.createElement('span');
        iconSpan.className = 'tree-icon';
        iconSpan.textContent = iconSymbol;
        headerDiv.appendChild(iconSpan);

        const textSpan = document.createElement('span');
        textSpan.className = labelClass;
        textSpan.textContent = label;
        headerDiv.appendChild(textSpan);

        nodeDiv.appendChild(headerDiv);

        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        nodeDiv.appendChild(childrenDiv);

        if (hasChildren) {
            headerDiv.addEventListener('click', () => {
                const isExpanded = caretSpan.classList.toggle('expanded');
                caretSpan.textContent = isExpanded ? '▼' : '▶';
                childrenDiv.classList.toggle('active');
            });
        }

        return {
            element: nodeDiv,
            headerEl: headerDiv,
            childrenEl: childrenDiv
        };
    }

    function renderTableGrid(permissions: any) {
        aclTableGrid.innerHTML = '';
        
        for (let tbl in permissions) {
            const p = permissions[tbl];
            
            const row = document.createElement('div');
            row.className = 'table-access-row';

            const header = document.createElement('div');
            header.className = 'table-access-header';

            const nameLabel = document.createElement('span');
            nameLabel.className = 'table-name-label';
            nameLabel.textContent = tbl;
            header.appendChild(nameLabel);

            const indicators = document.createElement('div');
            indicators.className = 'crud-indicators';

            const ops = ['read', 'write', 'create', 'delete'];
            const labels = ['R', 'W', 'C', 'D'];
            
            ops.forEach((op, index) => {
                const badge = document.createElement('span');
                badge.className = p[op] ? 'crud-badge allow' : 'crud-badge deny';
                badge.textContent = labels[index];
                
                if (!p[op]) {
                    badge.title = 'Click to show missing roles';
                    badge.addEventListener('click', () => showAclWarning(row, tbl, op, p.missing_roles[op]));
                }
                
                indicators.appendChild(badge);
            });

            header.appendChild(indicators);
            row.appendChild(header);
            
            const warningContainer = document.createElement('div');
            warningContainer.className = 'warning-container';
            row.appendChild(warningContainer);

            aclTableGrid.appendChild(row);
        }
    }

    function showAclWarning(rowEl: HTMLElement, tbl: string, op: string, missingAcls: any[]) {
        const container = rowEl.querySelector('.warning-container');
        if (!container) return;
        const existing = container.querySelector('.acl-warning-box');
        if (existing) {
            existing.remove();
            return;
        }

        const warningBox = document.createElement('div');
        warningBox.className = 'acl-warning-box';

        if (!missingAcls || missingAcls.length === 0) {
            warningBox.textContent = `Access denied by ACL condition, script, or system restriction on table "${tbl}" (operation: ${op}).`;
        } else {
            const header = document.createElement('strong');
            header.textContent = `Missing Role(s) for ${op.toUpperCase()}:`;
            warningBox.appendChild(header);

            const list = document.createElement('ul');
            list.style.margin = '4px 0 0 10px';
            list.style.padding = '0';
            list.style.fontSize = '10px';

            missingAcls.forEach(acl => {
                const li = document.createElement('li');
                li.style.listStyleType = 'disc';
                li.textContent = `Rule "${acl.acl_name}" requires: ${acl.required_roles.join(' OR ')}`;
                list.appendChild(li);
            });
            warningBox.appendChild(list);
        }

        container.appendChild(warningBox);
    }

    if (btnAclCheckCustomTable) {
        btnAclCheckCustomTable.addEventListener('click', async () => {
            const customTbl = aclCustomTableInput.value.trim().toLowerCase();
            if (!customTbl) return alert("Please enter a table name.");
            
            if (aclTablesList.includes(customTbl)) {
                return alert("Table is already in the list.");
            }

            const activeUserSysId = aclTargetUserSysId.textContent.replace('sys_id: ', '').trim();
            if (!activeUserSysId || activeUserSysId === 'None Selected') {
                return alert("Please select a target user first.");
            }

            btnAclCheckCustomTable.disabled = true;
            btnAclCheckCustomTable.textContent = "...";

            try {
                aclTablesList.push(customTbl);
                await selectAclUser(activeUserSysId, aclTargetUserName.textContent);
                aclCustomTableInput.value = '';
            } catch(e: any) {
                alert("Failed to analyze custom table: " + e.message);
                aclTablesList = aclTablesList.filter(t => t !== customTbl);
            }
            btnAclCheckCustomTable.disabled = false;
            btnAclCheckCustomTable.textContent = "Add Table";
        });
    }

    // --- EXCEL-BASED CATALOG ITEM BULK BUILDER ---
    let bulkMetadata: { scopes: any[], categories: any[], variableSets: any[] } = {
        scopes: [],
        categories: [],
        variableSets: []
    };

    const chkBulkVariables = document.getElementById('chkBulkVariables') as HTMLInputElement;
    const chkBulkVariableSets = document.getElementById('chkBulkVariableSets') as HTMLInputElement;
    const chkBulkUiPolicies = document.getElementById('chkBulkUiPolicies') as HTMLInputElement;
    const btnDownloadBulkTemplate = document.getElementById('btnDownloadBulkTemplate') as HTMLButtonElement;
    const bulkDropzone = document.getElementById('bulkDropzone') as HTMLElement;
    const bulkFileInput = document.getElementById('bulkFileInput') as HTMLInputElement;
    const btnRunBulkDryRun = document.getElementById('btnRunBulkDryRun') as HTMLButtonElement;
    const btnCommitBulk = document.getElementById('btnCommitBulk') as HTMLButtonElement;
    const bulkResultsBox = document.getElementById('bulkResultsBox') as HTMLElement;
    const bulkOutput = document.getElementById('bulkOutput') as HTMLElement;
    const bulkErrorArea = document.getElementById('bulkErrorArea') as HTMLElement;
    const bulkErrorBody = document.getElementById('bulkErrorBody') as HTMLElement;
    const bulkErrorCount = document.getElementById('bulkErrorCount') as HTMLElement;

    let bulkPayload: any = null;
    let validationErrors: any[] = [];

    async function loadBulkBuilderMetadata() {
        if (!window.activeInstanceData) return;
        try {
            // console.log('[Bulk Builder] Fetching instance metadata for validations...');
            const [scopes, categories, variableSets] = await Promise.all([
                SNOW_API.fetchScopes(),
                SNOW_API.fetchCategories(),
                SNOW_API.fetchVariableSets()
            ]);
            bulkMetadata.scopes = scopes;
            bulkMetadata.categories = categories;
            bulkMetadata.variableSets = variableSets;
            // console.log('[Bulk Builder] Metadata successfully loaded.');

            // Pre-populate scopes dropdowns immediately to prevent duplicate fetches on panel switches
            if (scopeSelect) {
                scopeSelect.innerHTML = '';
                scopes.forEach((scope: any) => {
                    const opt = document.createElement('option');
                    opt.value = scope.sys_id;
                    opt.textContent = scope.name;
                    scopeSelect.appendChild(opt);
                });
                scopeSelect.disabled = false;
                if (scopeSearch) scopeSearch.disabled = false;
            }

            if (clonerScopeSelect) {
                clonerScopeSelect.innerHTML = '';
                scopes.forEach((scope: any) => {
                    const opt = document.createElement('option');
                    opt.value = scope.sys_id;
                    opt.textContent = scope.name;
                    clonerScopeSelect.appendChild(opt);
                });
            }

            scopesLoaded = true;
            if (scopeSelect && scopeSelect.value) {
                loadUpdateSets(scopeSelect.value);
            }
        } catch (e: any) {
            console.warn('[Bulk Builder] Error caching metadata: ', e);
        }
    }

    if (btnDownloadBulkTemplate) {
        btnDownloadBulkTemplate.addEventListener('click', () => {
            try {
                btnDownloadBulkTemplate.textContent = "Generating...";
                btnDownloadBulkTemplate.disabled = true;

                const wb = XLSX.utils.book_new();

                // 1. Catalog Items Sheet
                const itemsAOA = [
                    ['Temp ID', 'Name', 'Short Description', 'Description', 'Category', 'Scope', 'Table Class'],
                    [1, 'Standard Laptop Request', 'Request a new standard developer laptop', 'Standard corporate developer laptop specifications...', 'Hardware', 'Global', 'sc_cat_item']
                ];
                const wsItems = XLSX.utils.aoa_to_sheet(itemsAOA);
                XLSX.utils.book_append_sheet(wb, wsItems, 'Catalog Items');

                // 2. Variables Sheet
                if (chkBulkVariables && chkBulkVariables.checked) {
                    const varsAOA = [
                        ['Item Temp ID', 'Name', 'Label', 'Type', 'Order', 'Mandatory', 'Reference Table', 'Choices'],
                        [1, 'laptop_model', 'Select Laptop Model', 'Select Box', 100, 'Yes', '', 'MacBook Pro 16:macbook_pro, ThinkPad P1:thinkpad_p1'],
                        [1, 'special_requirements', 'Special Requirements', 'Multi Line Text', 200, 'No', '', '']
                    ];
                    const wsVars = XLSX.utils.aoa_to_sheet(varsAOA);
                    XLSX.utils.book_append_sheet(wb, wsVars, 'Variables');
                }

                // 3. Variable Sets Sheet
                if (chkBulkVariableSets && chkBulkVariableSets.checked) {
                    const setsAOA = [
                        ['Item Temp ID', 'Variable Set Name'],
                        [1, 'Standard Employee Fields']
                    ];
                    const wsSets = XLSX.utils.aoa_to_sheet(setsAOA);
                    XLSX.utils.book_append_sheet(wb, wsSets, 'Variable Sets');
                }

                // 4. UI Policies Sheet
                if (chkBulkUiPolicies && chkBulkUiPolicies.checked) {
                    const polsAOA = [
                        ['Item Temp ID', 'Short Description', 'Conditions', 'Variable Name', 'Mandatory', 'Read Only', 'Visible'],
                        [1, 'Show Special Requirements on ThinkPad', 'laptop_model=thinkpad_p1', 'special_requirements', 'Yes', 'No', 'Yes']
                    ];
                    const wsPols = XLSX.utils.aoa_to_sheet(polsAOA);
                    XLSX.utils.book_append_sheet(wb, wsPols, 'UI Policies');
                }

                // 5. Reference & Instructions Sheet
                const refAOA = [
                    ['Valid Scopes (Name/Key)', 'Valid Categories (Title)', 'Valid Variable Sets (Title/Name)', 'Supported Variable Types'],
                ];
                
                const varTypes = ['Single Line Text', 'Multi Line Text', 'Wide Single Line Text', 'Select Box', 'Multiple Choice', 'Reference', 'Checkbox', 'Yes/No', 'Date', 'Date/Time', 'Integer'];
                const maxLen = Math.max(
                    bulkMetadata.scopes.length,
                    bulkMetadata.categories.length,
                    bulkMetadata.variableSets.length,
                    varTypes.length
                );

                for (let i = 0; i < maxLen; i++) {
                    refAOA.push([
                        (bulkMetadata.scopes[i] ? `${bulkMetadata.scopes[i].name} (${bulkMetadata.scopes[i].scope})` : ''),
                        (bulkMetadata.categories[i] ? bulkMetadata.categories[i].title : ''),
                        (bulkMetadata.variableSets[i] ? bulkMetadata.variableSets[i].title : ''),
                        (varTypes[i] || '')
                    ]);
                }

                const wsRef = XLSX.utils.aoa_to_sheet(refAOA);
                XLSX.utils.book_append_sheet(wb, wsRef, 'Metadata Reference');

                // Write workbook
                XLSX.writeFile(wb, 'ServiceNow_Bulk_Catalog_Items_Template.xlsx');
            } catch (err: any) {
                alert("Failed to download template: " + err.message);
            } finally {
                btnDownloadBulkTemplate.textContent = "Download Excel Template";
                btnDownloadBulkTemplate.disabled = false;
            }
        });
    }

    // Drag-Drop Zone Handlers
    if (bulkDropzone) {
        bulkDropzone.addEventListener('click', () => {
            if (bulkFileInput) bulkFileInput.click();
        });

        bulkDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            bulkDropzone.classList.add('dragover');
        });

        bulkDropzone.addEventListener('dragleave', () => {
            bulkDropzone.classList.remove('dragover');
        });

        bulkDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            bulkDropzone.classList.remove('dragover');
            const dragEvent = e as DragEvent;
            if (dragEvent.dataTransfer && dragEvent.dataTransfer.files.length > 0) {
                processExcelFile(dragEvent.dataTransfer.files[0]);
            }
        });
    }

    if (bulkFileInput) {
        bulkFileInput.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                processExcelFile(target.files[0]);
            }
        });
    }

    function processExcelFile(file: File) {
        if (!file) return;
        const reader = new FileReader();
        const dzText1 = document.getElementById('bulkDropzoneText');
        if (dzText1) dzText1.textContent = `Reading ${file.name}...`;

        reader.onload = function (e) {
            try {
                const target = e.target as FileReader;
                const data = new Uint8Array(target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const payload: { items: any[], variables: any[], variable_sets: any[], ui_policies: any[] } = {
                    items: [],
                    variables: [],
                    variable_sets: [],
                    ui_policies: []
                };

                if (workbook.Sheets['Catalog Items']) {
                    payload.items = normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['Catalog Items']) as any[]);
                }
                if (workbook.Sheets['Variables']) {
                    payload.variables = normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['Variables']) as any[]);
                }
                if (workbook.Sheets['Variable Sets']) {
                    payload.variable_sets = normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['Variable Sets']) as any[]);
                }
                if (workbook.Sheets['UI Policies']) {
                    payload.ui_policies = normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['UI Policies']) as any[]);
                }

                const dzText2 = document.getElementById('bulkDropzoneText');
                if (dzText2) dzText2.textContent = `Loaded: ${file.name} (Items: ${payload.items.length})`;
                validateUploadedData(payload);
            } catch (err: any) {
                const dzText3 = document.getElementById('bulkDropzoneText');
                if (dzText3) dzText3.textContent = "Drag & drop completed template Excel sheet, or click to upload";
                alert("Failed to parse Excel file. Ensure it is a valid .xlsx template file. Details: " + err.message);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    function normalizeParsedData(sheetData: any[]) {
        if (!sheetData) return [];
        return sheetData.map(row => {
            const normalized: any = {};
            for (let key in row) {
                const trimmedKey = String(key).trim();
                let val = row[key];
                if (typeof val === 'string') val = val.trim();
                normalized[trimmedKey] = val;
            }
            return normalized;
        });
    }

    function validateUploadedData(payload: any) {
        bulkPayload = payload;
        validationErrors = [];

        const items = payload.items || [];
        const variables = payload.variables || [];
        const varSets = payload.variable_sets || [];
        const uiPolicies = payload.ui_policies || [];

        // Check if template contains at least one item
        if (items.length === 0) {
            validationErrors.push({ sheet: 'Catalog Items', index: -1, field: 'Catalog Items Sheet', value: '', error: 'Sheet is empty or missing.' });
        }

        const itemTempIds = new Set();
        items.forEach((item: any, index: number) => {
            const tempIdStr = String(item['Temp ID'] || '').trim();
            if (!tempIdStr) {
                validationErrors.push({ sheet: 'Catalog Items', index, field: 'Temp ID', value: '', error: 'Temp ID is mandatory.' });
            } else {
                itemTempIds.add(tempIdStr);
            }

            if (!item['Name']) {
                validationErrors.push({ sheet: 'Catalog Items', index, field: 'Name', value: '', error: 'Catalog Item Name is mandatory.' });
            }
        });

        // Validate Variables
        variables.forEach((v: any, index: number) => {
            const itemTempId = String(v['Item Temp ID'] || '').trim();
            if (!itemTempId) {
                validationErrors.push({ sheet: 'Variables', index, field: 'Item Temp ID', value: '', error: 'Item Temp ID is mandatory.' });
            } else if (!itemTempIds.has(itemTempId)) {
                validationErrors.push({ sheet: 'Variables', index, field: 'Item Temp ID', value: itemTempId, error: `Item Temp ID "${itemTempId}" does not exist in Catalog Items sheet.` });
            }

            if (!v['Name']) {
                validationErrors.push({ sheet: 'Variables', index, field: 'Name', value: '', error: 'Variable Name is mandatory.' });
            } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v['Name'])) {
                validationErrors.push({ sheet: 'Variables', index, field: 'Name', value: v['Name'], error: 'Name must be alphanumeric starting with letter/underscore.' });
            }

            const type = (v['Type'] || '').trim();
            if (!type) {
                validationErrors.push({ sheet: 'Variables', index, field: 'Type', value: '', error: 'Type is mandatory.' });
            } else {
                const validTypes = ['yes/no', 'yes_no', 'single line text', 'single_line_text', 'wide single line text', 'wide_single_line_text', 'multi line text', 'multi_line_text', 'select box', 'select_box', 'multiple choice', 'multiple_choice', 'reference', 'checkbox', 'date', 'date/time', 'date_time', 'integer', '1', '2', '3', '5', '6', '7', '8', '9', '10', '15', '16'];
                if (!validTypes.includes(type.toLowerCase())) {
                    validationErrors.push({ sheet: 'Variables', index, field: 'Type', value: type, error: 'Invalid variable type.' });
                }
            }
        });

        // Validate Variable Sets
        varSets.forEach((vs: any, index: number) => {
            const itemTempId = String(vs['Item Temp ID'] || '').trim();
            if (!itemTempId) {
                validationErrors.push({ sheet: 'Variable Sets', index, field: 'Item Temp ID', value: '', error: 'Item Temp ID is mandatory.' });
            } else if (!itemTempIds.has(itemTempId)) {
                validationErrors.push({ sheet: 'Variable Sets', index, field: 'Item Temp ID', value: itemTempId, error: `Item Temp ID "${itemTempId}" does not exist in Catalog Items sheet.` });
            }

            if (!vs['Variable Set Name']) {
                validationErrors.push({ sheet: 'Variable Sets', index, field: 'Variable Set Name', value: '', error: 'Variable Set Name/Title is mandatory.' });
            }
        });

        // Validate UI Policies
        uiPolicies.forEach((pol: any, index: number) => {
            const itemTempId = String(pol['Item Temp ID'] || '').trim();
            if (!itemTempId) {
                validationErrors.push({ sheet: 'UI Policies', index, field: 'Item Temp ID', value: '', error: 'Item Temp ID is mandatory.' });
            } else if (!itemTempIds.has(itemTempId)) {
                validationErrors.push({ sheet: 'UI Policies', index, field: 'Item Temp ID', value: itemTempId, error: `Item Temp ID "${itemTempId}" does not exist in Catalog Items sheet.` });
            }

            if (!pol['Short Description']) {
                validationErrors.push({ sheet: 'UI Policies', index, field: 'Short Description', value: '', error: 'Short Description is mandatory.' });
            }
        });

        renderValidationErrors();
    }

    function renderValidationErrors() {
        if (!bulkErrorArea || !bulkErrorBody || !bulkErrorCount) return;

        if (validationErrors.length === 0) {
            bulkErrorArea.classList.add('hidden');
            bulkErrorBody.innerHTML = '';
            bulkErrorCount.textContent = '0';
            
            if (bulkPayload && bulkPayload.items && bulkPayload.items.length > 0) {
                btnRunBulkDryRun.disabled = false;
            } else {
                btnRunBulkDryRun.disabled = true;
            }
            return;
        }

        btnRunBulkDryRun.disabled = true;
        btnCommitBulk.disabled = true;
        bulkErrorCount.textContent = validationErrors.length.toString();
        bulkErrorBody.innerHTML = '';

        validationErrors.forEach((err: any) => {
            const tr = document.createElement('tr');
            
            const tdSheet = document.createElement('td');
            tdSheet.className = 'bulk-table-cell';
            tdSheet.textContent = err.sheet;
            tr.appendChild(tdSheet);

            const tdRow = document.createElement('td');
            tdRow.className = 'bulk-table-cell';
            tdRow.textContent = err.index === -1 ? 'N/A' : err.index + 2;
            tr.appendChild(tdRow);

            const tdField = document.createElement('td');
            tdField.className = 'bulk-table-cell';
            tdField.textContent = err.field;
            tr.appendChild(tdField);

            const tdError = document.createElement('td');
            tdError.className = 'bulk-table-cell';
            tdError.textContent = err.error;
            tr.appendChild(tdError);

            const tdCorrect = document.createElement('td');
            tdCorrect.className = 'bulk-table-cell';
            
            if (err.index !== -1) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'inline-edit-input';
                input.value = err.value || '';
                input.placeholder = 'Fix cell...';

                input.addEventListener('change', (e) => {
                    const newVal = (e.target as HTMLInputElement).value;
                    let targetArray: any[] = [];
                    if (err.sheet === 'Catalog Items') targetArray = bulkPayload.items;
                    else if (err.sheet === 'Variables') targetArray = bulkPayload.variables;
                    else if (err.sheet === 'Variable Sets') targetArray = bulkPayload.variable_sets;
                    else if (err.sheet === 'UI Policies') targetArray = bulkPayload.ui_policies;

                    if (targetArray[err.index]) {
                        targetArray[err.index][err.field] = newVal;
                        validateUploadedData(bulkPayload);
                    }
                });
                tdCorrect.appendChild(input);
            } else {
                tdCorrect.textContent = 'N/A';
            }
            
            tr.appendChild(tdCorrect);
            bulkErrorBody.appendChild(tr);
        });

        bulkErrorArea.classList.remove('hidden');
    }

    async function executeBulkBuild(isDryRun: boolean) {
        if (!bulkPayload || !window.activeInstanceData) return;

        const targetBtn = isDryRun ? btnRunBulkDryRun : btnCommitBulk;
        const initialText = targetBtn.textContent;
        targetBtn.textContent = isDryRun ? "Validating..." : "Committing...";
        targetBtn.disabled = true;
        
        btnRunBulkDryRun.disabled = true;
        btnCommitBulk.disabled = true;
        bulkResultsBox.classList.remove('hidden');
        bulkOutput.textContent = isDryRun ? "[Dry Run] Submitting atomic transaction block to ServiceNow server...\n" : "[Commit] Submitting final transaction block to ServiceNow server...\n";

        try {
            // Map payloads to server expected fields
            const items = bulkPayload.items.map((item: any) => ({
                temp_id: item['Temp ID'],
                name: item['Name'],
                short_description: item['Short Description'] || '',
                description: item['Description'] || '',
                category: item['Category'] || '',
                scope: item['Scope'] || 'global',
                table: item['Table Class'] || 'sc_cat_item'
            }));

            const variables = bulkPayload.variables.map((v: any) => ({
                item_temp_id: v['Item Temp ID'],
                name: v['Name'],
                label: v['Label'] || '',
                type: v['Type'] || 'Single Line Text',
                order: v['Order'] || 100,
                mandatory: v['Mandatory'] || 'No',
                reference: v['Reference Table'] || '',
                choices: v['Choices'] || ''
            }));

            const variableSets = bulkPayload.variable_sets.map((vs: any) => ({
                item_temp_id: vs['Item Temp ID'],
                variable_set: vs['Variable Set Name']
            }));

            const uiPolicies = bulkPayload.ui_policies.map((pol: any) => ({
                item_temp_id: pol['Item Temp ID'],
                short_description: pol['Short Description'],
                conditions: pol['Conditions'] || '',
                variable_name: pol['Variable Name'] || '',
                mandatory: pol['Mandatory'] || '',
                read_only: pol['Read Only'] || '',
                visible: pol['Visible'] || ''
            }));

            const serverPayload = {
                items,
                variables,
                variable_sets: variableSets,
                ui_policies: uiPolicies
            };

            const output = await SNOW_API.bulkCreateCatalogItems(serverPayload, isDryRun);
            
            // Format log response, extracting success links
            bulkOutput.textContent += output;

            if (output.includes(">>>DRY_RUN_PASSED<<<")) {
                bulkOutput.textContent += "\n[DRY RUN SUCCESS] The transaction was validated successfully and all database changes were aborted. You can now safely Commit.";
                btnCommitBulk.disabled = false;
                btnRunBulkDryRun.disabled = false;
            } else if (output.includes(">>>BULK_SUCCESS<<<")) {
                bulkOutput.textContent += "\n[BULK BUILD SUCCESS] All Catalog Items and related lists successfully committed to database!\n";
                
                // Parse created catalog item sys_ids from the output logs
                const sysIdMatches = [...output.matchAll(/Created Catalog Item: (.*?) \(sys_id: ([a-f0-9]{32})\)/g)];
                if (sysIdMatches.length > 0) {
                    bulkOutput.textContent += "\n--- Created Catalog Items Links ---\n";
                    sysIdMatches.forEach(match => {
                        if (!window.activeInstanceData) return;
                        const name = match[1];
                        const sysId = match[2];
                        const url = `${window.activeInstanceData.url}/nav_to.do?uri=sc_cat_item.do?sys_id=${sysId}`;
                        bulkOutput.textContent += `${name}: ${url}\n`;
                    });
                }
                
                btnCommitBulk.disabled = true;
                btnRunBulkDryRun.disabled = true;
            } else {
                bulkOutput.textContent += "\n[TRANSACTION FAILED] Server transaction returned errors or aborted. Database rolled back.";
                btnRunBulkDryRun.disabled = false;
            }

        } catch (err: any) {
            bulkOutput.textContent += `\n[ERROR] Server communication failure: ${err.message}`;
            btnRunBulkDryRun.disabled = false;
        } finally {
            targetBtn.textContent = initialText;
        }
    }

    if (btnRunBulkDryRun) {
        btnRunBulkDryRun.addEventListener('click', () => executeBulkBuild(true));
    }

    if (btnCommitBulk) {
        btnCommitBulk.addEventListener('click', () => executeBulkBuild(false));
    }

    // Auto-Connect on Open
    btnConnect.click();
});