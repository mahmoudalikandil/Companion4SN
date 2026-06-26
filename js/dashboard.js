document.addEventListener('DOMContentLoaded', () => {
    
    window.activeInstanceData = null;

    const btnConnect = document.getElementById('btnConnect');
    const connStatus = document.getElementById('connStatus');
    const toolNav = document.getElementById('toolNav');
    const navItems = document.querySelectorAll('.nav-list li');
    const toolPanels = document.querySelectorAll('.tool-panel');

    const searchInput = document.getElementById('impersonateSearch');
    const btnSearch = document.getElementById('btnSearchUser');
    const searchResults = document.getElementById('userSearchResults');

    const btnRunScript = document.getElementById('btnRunScript');
    const codeArea = document.getElementById('codeArea');
    const scriptResultsBox = document.getElementById('scriptResultsBox');
    const scriptOutput = document.getElementById('scriptOutput');
    const snippetSelector = document.getElementById('snippetSelector');

    const scopeSelect = document.getElementById('scopeSelect');
    const updateSetSelect = document.getElementById('updateSetSelect');
    const scopeSearch = document.getElementById('scopeSearch');
    const updateSetSearch = document.getElementById('updateSetSearch');
    const btnApplyUpdateSet = document.getElementById('btnApplyUpdateSet');
    const updateSetStatus = document.getElementById('updateSetStatus');

    const schemaTableInput = document.getElementById('schemaTableInput');
    const btnDetectTable = document.getElementById('btnDetectTable');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const btnExportJSON = document.getElementById('btnExportJSON');
    const schemaStatus = document.getElementById('schemaStatus');

    const flowSysIdInput = document.getElementById('flowSysIdInput');
    const btnTrackFlow = document.getElementById('btnTrackFlow');
    const flowTrackerStatus = document.getElementById('flowTrackerStatus');

    const clonerSourceTable = document.getElementById('clonerSourceTable');
    const clonerSourceSysId = document.getElementById('clonerSourceSysId');
    const clonerSourceName = document.getElementById('clonerSourceName');
    const btnDetectClonerSource = document.getElementById('btnDetectClonerSource');
    const clonerNewName = document.getElementById('clonerNewName');
    const clonerScopeSelect = document.getElementById('clonerScopeSelect');
    const btnRunClone = document.getElementById('btnRunClone');
    const clonerResultsBox = document.getElementById('clonerResultsBox');
    const clonerOutput = document.getElementById('clonerOutput');

    let scopesLoaded = false;
    let currentScopeId = 'global';

    const SNIPPETS = {
        incident: "var gr = new GlideRecord('incident');\ngr.setLimit(5);\ngr.query();\nwhile(gr.next()) {\n    gs.info(gr.number + ' - ' + gr.short_description);\n}",
        user: "var gr = new GlideRecord('sys_user');\ngr.addEncodedQuery('active=true');\ngr.query();\ngs.info('Total Active Users: ' + gr.getRowCount());",
        property: "var gr = new GlideRecord('sys_properties');\ngr.addQuery('name', 'glide.sys.language');\ngr.query();\nif(gr.next()) {\n    gs.info('System Language: ' + gr.value);\n}"
    };

    if(snippetSelector) {
        snippetSelector.addEventListener('change', (e) => {
            if (SNIPPETS[e.target.value]) codeArea.value = SNIPPETS[e.target.value];
        });
    }

    // --- CENTRALIZED BRIDGE CONNECTION ---
    btnConnect.addEventListener('click', async () => {
        try {
            btnConnect.textContent = "Connecting...";
            window.activeInstanceData = await window.SNOW_Bridge.connectToInstance();

            connStatus.textContent = "Connected Live";
            connStatus.className = "status-indicator success";
            document.getElementById('instanceUrl').textContent = window.activeInstanceData.url;
            document.getElementById('tokenStatus').innerHTML = `<span class="dot active"></span> Token Captured`;

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

            switchPanel('panel-cloner');
        } catch (error) {
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
            switchPanel(item.dataset.target);
        });
    });

    function switchPanel(panelId) {
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
            const users = await window.SNOW_API.searchUsers(query);
            if (users.length === 0) {
                searchResults.innerHTML = '<li class="empty-state">No users found.</li>';
            } else {
                users.forEach(user => {
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
        } catch (error) {
            searchResults.innerHTML = `<li class="empty-state" style="color:red;">Error: ${error.message}</li>`;
        }
        btnSearch.textContent = "Search";
    });

    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnSearch.click(); });

    async function triggerImpersonation(sysId, name) {
        try {
            await window.SNOW_API.impersonateUser(sysId);
            alert(`Success! Impersonating ${name}. Refreshing page...`);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.reload(tabs[0].id);
            });
            setTimeout(() => window.close(), 1000);
        } catch (error) {
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
            const output = await window.SNOW_API.runBackgroundScript(script);
            scriptOutput.textContent = output;
            scriptResultsBox.classList.remove('hidden');
        } catch (error) {
            scriptOutput.textContent = `Execution Error: ${error.message}`;
            scriptResultsBox.classList.remove('hidden');
        }

        btnRunScript.textContent = "Execute Script";
        btnRunScript.disabled = false;
    });

    // --- UPDATE SET & SCOPE LOGIC ---
    if(scopeSearch && scopeSelect) {
        scopeSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
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
            const term = e.target.value.trim();
            clearTimeout(window.usTimer);
            window.usTimer = setTimeout(async () => {
                updateSetSelect.innerHTML = '<option>Searching server...</option>';
                updateSetSelect.disabled = true;
                
                try {
                    const results = await window.SNOW_API.fetchUpdateSets(currentScopeId, term, 20);
                    updateSetSelect.innerHTML = '';
                    
                    if(results.length === 0) {
                        updateSetSelect.innerHTML = '<option value="">No matches found</option>';
                    } else {
                        results.forEach(us => {
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
            const scopes = await window.SNOW_API.fetchScopes();
            
            scopeSelect.innerHTML = '';
            if (clonerScopeSelect) clonerScopeSelect.innerHTML = '';
            scopes.forEach(scope => {
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

    async function loadUpdateSets(scopeId) {
        try {
            currentScopeId = scopeId;
            updateSetSelect.innerHTML = '<option>Loading initial 20 records...</option>';
            updateSetSelect.disabled = true;
            updateSetSearch.disabled = true;
            updateSetSearch.value = ""; 
            btnApplyUpdateSet.disabled = true;

            const updateSets = await window.SNOW_API.fetchUpdateSets(scopeId, "", 20);
            
            updateSetSelect.innerHTML = '';
            if (updateSets.length === 0) {
                updateSetSelect.innerHTML = '<option value="">No "In Progress" Update Sets found</option>';
            } else {
                updateSets.forEach(us => {
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
        scopeSelect.addEventListener('change', (e) => loadUpdateSets(e.target.value));
    }

    if (btnApplyUpdateSet) {
        btnApplyUpdateSet.addEventListener('click', async () => {
            const scopeId = scopeSelect.value;
            const updateSetId = updateSetSelect.value;

            btnApplyUpdateSet.textContent = "Applying...";
            btnApplyUpdateSet.disabled = true;
            updateSetStatus.textContent = "";

            try {
                await window.SNOW_API.setUpdateSetAndScope(scopeId, updateSetId);
                
                updateSetStatus.style.color = "#2e7d32";
                updateSetStatus.textContent = "Success! Refreshing page...";

                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if(tabs[0]) chrome.tabs.reload(tabs[0].id);
                });
                
                setTimeout(() => window.close(), 1000);

            } catch (error) {
                updateSetStatus.style.color = "#c62828";
                updateSetStatus.textContent = "Error: " + error.message;
                btnApplyUpdateSet.textContent = "Apply Changes";
                btnApplyUpdateSet.disabled = false;
            }
        });
    }

    // --- SCHEMA EXPORTER LOGIC ---
    if (btnDetectTable) {
        btnDetectTable.addEventListener('click', () => {
            if (window.activeInstanceData && window.activeInstanceData.table) {
                schemaTableInput.value = window.activeInstanceData.table;
                schemaStatus.style.color = "#2e7d32";
                schemaStatus.textContent = "Table detected automatically.";
            } else {
                schemaStatus.style.color = "#c62828";
                schemaStatus.textContent = "Could not detect table. Please type it manually.";
            }
        });
    }

    function triggerFileDownload(content, filename, type) {
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

    async function handleExport(format) {
        const table = schemaTableInput.value.trim().toLowerCase();
        if (!table) return alert('Please enter or detect a table name first.');

        schemaStatus.style.color = "#181a1f";
        schemaStatus.textContent = "Fetching schema from server...";
        btnExportCSV.disabled = true;
        btnExportJSON.disabled = true;

        try {
            const records = await window.SNOW_API.exportDictionary(table);
            
            if (!records || records.length === 0) {
                schemaStatus.style.color = "#c62828";
                schemaStatus.textContent = `No dictionary records found for table: ${table}`;
            } else {
                if (format === 'json') {
                    triggerFileDownload(JSON.stringify(records, null, 2), `${table}_schema.json`, "application/json");
                } else if (format === 'csv') {
                    let csv = "Column Label,Backend Name (element),Type,Reference Table,Max Length\n";
                    records.forEach(r => {
                        const label = r.column_label ? `"${r.column_label.replace(/"/g, '""')}"` : '""';
                        const ref = r.reference ? r.reference.value : '';
                        csv += `${label},${r.element},${r.internal_type},${ref},${r.max_length}\n`;
                    });
                    triggerFileDownload(csv, `${table}_schema.csv`, "text/csv");
                }
                schemaStatus.style.color = "#2e7d32";
                schemaStatus.textContent = `Success! Exported ${records.length} fields.`;
            }
        } catch (error) {
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

            chrome.runtime.sendMessage({
                action: "START_FLOW_TRACKING",
                url: window.activeInstanceData.url,
                token: window.activeInstanceData.token,
                sysId: sysId
            }, (response) => {
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
    const btnStreamLogs = document.getElementById('btnStreamLogs');
    const btnClearLogs = document.getElementById('btnClearLogs');
    const logFilterInput = document.getElementById('logFilterInput');
    const logTerminal = document.getElementById('logTerminal');

    let logStreamInterval = null;
    let seenLogIds = new Set();
    let isStreaming = false;

    function appendLog(level, source, message, time, isSystem = false) {
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
            const logs = await window.SNOW_API.fetchLogs();
            const filterText = logFilterInput.value.trim().toLowerCase();
            
            // ServiceNow returns DESC. We reverse it so the oldest prints first, newest at the bottom.
            const newLogs = logs.reverse().filter(log => {
                if (seenLogIds.has(log.sys_id)) return false;
                
                // If user typed a filter, check if source or message contains it
                if (filterText) {
                    const matchSource = (log.source || '').toLowerCase().includes(filterText);
                    const matchMsg = (log.message || '').toLowerCase().includes(filterText);
                    if (!matchSource && !matchMsg) return false;
                }
                
                return true;
            });

            newLogs.forEach(log => {
                seenLogIds.add(log.sys_id);
                appendLog(log.level, log.source, log.message, log.sys_created_on);
            });

        } catch (error) {
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
            if (item.dataset.target !== 'panel-logs' && isStreaming) {
                toggleStream();
            }
        });
    });

    // --- XML PAYLOAD STUDIO LOGIC ---
    const xmlEditorArea = document.getElementById('xmlEditorArea');
    const btnFormatXML = document.getElementById('btnFormatXML');
    const btnStripSysMeta = document.getElementById('btnStripSysMeta');
    const btnCopyXML = document.getElementById('btnCopyXML');
    const btnDownloadXML = document.getElementById('btnDownloadXML');
    const xmlStatus = document.getElementById('xmlStatus');

    function showXmlStatus(message, isError = false) {
        xmlStatus.style.color = isError ? "#c62828" : "#2e7d32";
        xmlStatus.textContent = message;
        setTimeout(() => xmlStatus.textContent = "", 3000);
    }

    // Lightweight Vanilla JS XML Beautifier
    function formatXMLText(xml) {
        let formatted = '';
        let pad = 0;
        // Strip existing whitespace between tags to ensure clean format
        xml = xml.replace(/(>)\s*(<)/g, "$1\n$2");
        
        xml.split('\n').forEach(function(node) {
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
            }).catch(err => {
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
            btnTrackFlow.disabled = (e.target.value.trim().length !== 32); 
        });
    }

    if (btnDetectClonerSource) {
        btnDetectClonerSource.addEventListener('click', () => {
            if (window.activeInstanceData && window.activeInstanceData.catItemSysId) {
                clonerSourceTable.value = window.activeInstanceData.catItemTable || '';
                clonerSourceSysId.value = window.activeInstanceData.catItemSysId || '';
                clonerSourceName.value = window.activeInstanceData.catItemName || '';
            } else {
                alert("Could not auto-detect a Catalog Item on the active tab.");
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
                        variables: document.getElementById('chkClonerVariables').checked,
                        variable_sets: document.getElementById('chkClonerVariableSets').checked,
                        ui_policies: document.getElementById('chkClonerUiPolicies').checked,
                        client_scripts: document.getElementById('chkClonerClientScripts').checked,
                        user_criteria: document.getElementById('chkClonerUserCriteria').checked,
                        categories: document.getElementById('chkClonerCategories').checked,
                        data_lookups: document.getElementById('chkClonerDataLookups').checked,
                        related_articles: document.getElementById('chkClonerRelatedArticles').checked,
                        related_items: document.getElementById('chkClonerRelatedItems').checked,
                        topics: document.getElementById('chkClonerTopics').checked
                    }
                };

                const output = await window.SNOW_API.cloneCatalogItem(config);
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
            } catch (error) {
                clonerOutput.textContent += `\n[CRITICAL ERROR] Connection failed: ${error.message}`;
            }

            btnRunClone.textContent = "Execute Clone";
            btnRunClone.disabled = false;
        });
    }

    // Auto-Connect on Open
    btnConnect.click();
});