(function () {
    window.LldGenerator = {
        uploadedXmlContent: null,
        liveLoaded: false,
        parsedRegistry: null,

        init: function () {
            // Bind UI tabs
            const lldSourceTabs = document.getElementById('lldSourceTabs');
            const lldPreviewTabs = document.getElementById('lldPreviewTabs');
            const btnGenerateLLD = document.getElementById('btnGenerateLLD');
            const btnExportLLD = document.getElementById('btnExportLLD');
            const lldDropzone = document.getElementById('lldDropzone');
            const lldFileInput = document.getElementById('lldFileInput');
            const lldLiveSearch = document.getElementById('lldLiveSearch');
            const lldLiveSelect = document.getElementById('lldLiveSelect');
            const lldLiveTypeRadio = document.getElementsByName('lldLiveType');

            if (lldSourceTabs) {
                lldSourceTabs.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        lldSourceTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        
                        document.querySelectorAll('.lld-tab-content').forEach(pane => {
                            pane.classList.add('hidden');
                            pane.classList.remove('active');
                        });
                        const targetPane = document.getElementById(btn.dataset.tab);
                        if (targetPane) {
                            targetPane.classList.remove('hidden');
                            targetPane.classList.add('active');
                        }
                    });
                });
            }

            if (lldPreviewTabs) {
                lldPreviewTabs.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        lldPreviewTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        document.querySelectorAll('.lld-preview-tab-pane').forEach(pane => {
                            pane.classList.add('hidden');
                            pane.classList.remove('active');
                        });
                        const targetPane = document.getElementById(btn.dataset.preview_tab || btn.getAttribute('data-preview-tab'));
                        if (targetPane) {
                            targetPane.classList.remove('hidden');
                            targetPane.classList.add('active');
                        }
                    });
                });
            }

            if (lldDropzone) {
                lldDropzone.addEventListener('click', () => {
                    if (lldFileInput) lldFileInput.click();
                });
                lldDropzone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    lldDropzone.classList.add('dragover');
                });
                lldDropzone.addEventListener('dragleave', () => {
                    lldDropzone.classList.remove('dragover');
                });
                lldDropzone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    lldDropzone.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) {
                        this.handleFileSelect(e.dataTransfer.files[0]);
                    }
                });
            }

            if (lldFileInput) {
                lldFileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.handleFileSelect(e.target.files[0]);
                    }
                });
            }

            if (lldLiveSearch) {
                let liveSearchTimer;
                lldLiveSearch.addEventListener('input', (e) => {
                    clearTimeout(liveSearchTimer);
                    liveSearchTimer = setTimeout(() => {
                        this.loadLiveUpdateSets(e.target.value.trim());
                    }, 500);
                });
            }

            if (lldLiveTypeRadio) {
                lldLiveTypeRadio.forEach(radio => {
                    radio.addEventListener('change', () => {
                        this.loadLiveUpdateSets(lldLiveSearch ? lldLiveSearch.value.trim() : "");
                    });
                });
            }

            if (btnGenerateLLD) {
                btnGenerateLLD.addEventListener('click', () => this.generateLLD());
            }

            const btnGenerateOverallLLD = document.getElementById('btnGenerateOverallLLD');
            if (btnGenerateOverallLLD) {
                btnGenerateOverallLLD.addEventListener('click', () => this.generateOverallLLD());
            }

            if (btnExportLLD) {
                btnExportLLD.addEventListener('click', () => this.exportWordDoc());
            }
        },

        showStatus: function (message, isError = false) {
            const statusDiv = document.getElementById('lldStatus');
            if (!statusDiv) return;
            statusDiv.style.color = isError ? "#c62828" : "#2e7d32";
            statusDiv.textContent = message;
        },

        handleFileSelect: function (file) {
            if (!file) return;
            const lldDropzoneText = document.getElementById('lldDropzoneText');
            if (lldDropzoneText) lldDropzoneText.textContent = `Reading ${file.name}...`;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.uploadedXmlContent = e.target.result;
                if (lldDropzoneText) lldDropzoneText.textContent = `Loaded file: ${file.name}`;
                this.showStatus("XML file uploaded successfully. Ready to generate preview.");
            };
            reader.onerror = () => {
                if (lldDropzoneText) lldDropzoneText.textContent = "Error reading file. Drag & drop again.";
                this.showStatus("Error reading XML file.", true);
            };
            reader.readAsText(file);
        },

        loadLiveUpdateSets: async function (searchTerm = "") {
            const lldLiveSelect = document.getElementById('lldLiveSelect');
            if (!lldLiveSelect) return;
            
            if (!window.activeInstanceData) {
                lldLiveSelect.innerHTML = '<option value="">-- Connect Live Instance First --</option>';
                return;
            }

            try {
                lldLiveSelect.innerHTML = '<option>Loading update sets...</option>';
                const isRemote = document.querySelector('input[name="lldLiveType"]:checked')?.value === 'remote';
                
                let results = [];
                if (isRemote) {
                    results = await window.SNOW_API.fetchRemoteUpdateSetsList(searchTerm, 40);
                } else {
                    results = await window.SNOW_API.fetchActiveUpdateSetsList(searchTerm, 40);
                }

                lldLiveSelect.innerHTML = '';
                if (results.length === 0) {
                    lldLiveSelect.innerHTML = '<option value="">No update sets found</option>';
                } else {
                    const defaultOpt = document.createElement('option');
                    defaultOpt.value = "";
                    defaultOpt.textContent = `-- Select ${isRemote ? 'Remote' : 'Local'} Update Set (${results.length}) --`;
                    lldLiveSelect.appendChild(defaultOpt);

                    results.forEach(us => {
                        const opt = document.createElement('option');
                        opt.value = us.sys_id;
                        opt.textContent = `${us.name} (${us.state || 'loaded'})`;
                        lldLiveSelect.appendChild(opt);
                    });
                }
                this.liveLoaded = true;
            } catch (err) {
                lldLiveSelect.innerHTML = '<option value="">Failed to load from server</option>';
                console.error("Error loading update sets: ", err);
            }
        },

        generateLLD: async function () {
            const lldSourceTabs = document.getElementById('lldSourceTabs');
            const activeTab = lldSourceTabs?.querySelector('.tab-btn.active')?.dataset.tab;
            let rawXmlData = "";
            let updateSetTitle = "ServiceNow Implementation LLD";
            let updateSetId = "";
            let isRemote = false;

            this.showStatus("Analyzing configurations...");
            const previewBox = document.getElementById('lldPreviewBox');
            if (previewBox) previewBox.classList.add('hidden');

            try {
                if (activeTab === "lld-tab-upload") {
                    if (!this.uploadedXmlContent) {
                        this.showStatus("Please select or drop an XML file first.", true);
                        return;
                    }
                    rawXmlData = this.uploadedXmlContent;
                    this.parsedRegistry = this.parseXmlPayloads(rawXmlData);
                } else {
                    // Live fetch
                    const lldLiveSelect = document.getElementById('lldLiveSelect');
                    updateSetId = lldLiveSelect?.value;
                    if (!updateSetId) {
                        this.showStatus("Please select an update set from the dropdown.", true);
                        return;
                    }
                    isRemote = document.querySelector('input[name="lldLiveType"]:checked')?.value === 'remote';
                    const selectedText = lldLiveSelect.options[lldLiveSelect.selectedIndex].text;
                    updateSetTitle = selectedText.substring(0, selectedText.lastIndexOf('(')).trim();

                    this.showStatus("Fetching update set XML components from ServiceNow...");
                    const updates = await window.SNOW_API.fetchUpdateXmls(updateSetId, isRemote);
                    if (!updates || updates.length === 0) {
                        this.showStatus("No updates found in the selected update set.", true);
                        return;
                    }
                    
                    this.showStatus("Compiling data models...");
                    this.parsedRegistry = this.compileLiveXmls(updates, updateSetTitle);
                }

                // Render Preview
                this.renderPreview(this.parsedRegistry);
                this.showStatus("LLD Preview generated successfully!");
                
                if (previewBox) previewBox.classList.remove('hidden');
                const btnExportLLD = document.getElementById('btnExportLLD');
                if (btnExportLLD) btnExportLLD.disabled = false;

            } catch (error) {
                console.error("LLD Generator Error: ", error);
                this.showStatus("Generation failed: " + error.message, true);
            }
        },

        generateOverallLLD: async function () {
            if (!window.activeInstanceData) {
                this.showStatus("Active connection to a ServiceNow instance is required to generate Overall LLD.", true);
                return;
            }

            const previewBox = document.getElementById('lldPreviewBox');
            if (previewBox) previewBox.classList.add('hidden');

            const progressBarContainer = document.getElementById('lldProgressBarContainer');
            const consoleLog = document.getElementById('lldConsoleLog');
            
            if (progressBarContainer) progressBarContainer.classList.remove('hidden');
            if (consoleLog) consoleLog.classList.remove('hidden');

            this.clearConsole();
            this.showStatus("Initializing Overall Instance scan...");
            this.updateProgressBar(0, "Connecting to instance...");

            try {
                this.appendConsoleLog("Querying list of update sets from target instance...", "info");
                
                // Fetch local and remote retrieved update sets
                const [localSets, remoteSets] = await Promise.all([
                    window.SNOW_API.fetchAllUpdateSetsSorted().catch(err => {
                        this.appendConsoleLog(`Warning: Failed to fetch Local Update Sets: ${err.message}`, "warning");
                        return [];
                    }),
                    window.SNOW_API.fetchAllRemoteUpdateSetsSorted().catch(err => {
                        this.appendConsoleLog(`Warning: Failed to fetch Remote Update Sets: ${err.message}`, "warning");
                        return [];
                    })
                ]);

                // Combine and sort chronologically
                let allSets = [];
                if (localSets && localSets.length > 0) {
                    localSets.forEach(s => {
                        s.isRemote = false;
                        allSets.push(s);
                    });
                }
                if (remoteSets && remoteSets.length > 0) {
                    remoteSets.forEach(s => {
                        s.isRemote = true;
                        allSets.push(s);
                    });
                }

                if (allSets.length === 0) {
                    throw new Error("No update sets found on this instance.");
                }

                // Sort ascending by sys_updated_on so that newer updates overwrite older updates
                allSets.sort((a, b) => {
                    const timeA = a.sys_updated_on ? new Date(a.sys_updated_on.replace(' ', 'T')).getTime() : 0;
                    const timeB = b.sys_updated_on ? new Date(b.sys_updated_on.replace(' ', 'T')).getTime() : 0;
                    return timeA - timeB;
                });

                this.appendConsoleLog(`Found ${localSets?.length || 0} Local and ${remoteSets?.length || 0} Remote update sets.`, "success");
                this.appendConsoleLog(`Consolidated into ${allSets.length} update sets to process chronologically.`, "success");

                // We will use a Map to de-duplicate updates by their metadata name key
                const consolidatedUpdatesMap = new Map();
                let totalXmlRecordsProcessed = 0;

                for (let i = 0; i < allSets.length; i++) {
                    const us = allSets[i];
                    const progressPct = Math.round((i / allSets.length) * 100);
                    this.updateProgressBar(progressPct, `Scanning ${i + 1}/${allSets.length} sets...`);
                    this.appendConsoleLog(`[Set ${i + 1}/${allSets.length}] Fetching updates from "${us.name}" (${us.isRemote ? 'Remote' : 'Local'} - ${us.state})...`, "info");
                    
                    let updates = [];
                    try {
                        updates = await window.SNOW_API.fetchUpdateXmls(us.sys_id, us.isRemote);
                    } catch (fetchErr) {
                        this.appendConsoleLog(`Error fetching updates for "${us.name}": ${fetchErr.message}. Skipping.`, "warning");
                        continue;
                    }

                    if (updates && updates.length > 0) {
                        this.appendConsoleLog(`Processing ${updates.length} records in "${us.name}"...`, "info");
                        totalXmlRecordsProcessed += updates.length;
                        
                        let overwriteCount = 0;
                        let deleteCount = 0;
                        
                        updates.forEach(u => {
                            if (consolidatedUpdatesMap.has(u.name)) {
                                overwriteCount++;
                            }
                            if (u.action === "DELETE") {
                                deleteCount++;
                            }
                            // Store the latest state of the record, referencing its origin update set
                            consolidatedUpdatesMap.set(u.name, {
                                name: u.name,
                                type: u.type,
                                target_name: u.target_name,
                                action: u.action,
                                payload: u.payload,
                                sourceUpdateSet: us.name,
                                sourceUpdateSetType: us.isRemote ? "Remote" : "Local"
                            });
                        });
                        
                        if (overwriteCount > 0 || deleteCount > 0) {
                            this.appendConsoleLog(`--> Consolidation: Overwrote ${overwriteCount} older versions. Registered ${deleteCount} deletions.`, "debug");
                        }
                    } else {
                        this.appendConsoleLog(`No configurations found in "${us.name}".`, "debug");
                    }

                    // Yield execution to keep browser UI responsive
                    await new Promise(resolve => setTimeout(resolve, 30));
                }

                this.updateProgressBar(100, "De-duplicating and cleaning registry...");
                this.appendConsoleLog(`Total raw update XMLs processed: ${totalXmlRecordsProcessed}`, "info");

                // Filter out records that are deleted in their latest state
                const activeUpdatesList = [];
                let deletedCount = 0;

                for (const [key, val] of consolidatedUpdatesMap.entries()) {
                    if (val.action === "DELETE") {
                        deletedCount++;
                    } else {
                        activeUpdatesList.push(val);
                    }
                }

                this.appendConsoleLog(`Consolidated ${consolidatedUpdatesMap.size} unique keys. Filtered out ${deletedCount} deleted items. Active items: ${activeUpdatesList.length}.`, "success");
                this.appendConsoleLog("Running LLD Generator parsing registry on consolidated active payload list...", "info");

                // Build registry from active de-duplicated list
                const overallMetadata = {
                    name: `Instance Consolidation LLD - ${window.activeInstanceData.instanceName || 'ServiceNow'}`,
                    createdBy: window.activeInstanceData.username || "ServiceNow Developer",
                    createdOn: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    scope: "Consolidated Instance Scope"
                };

                this.parsedRegistry = this.buildUnifiedRegistry(activeUpdatesList, overallMetadata);

                // Render Preview
                this.renderPreview(this.parsedRegistry);
                this.showStatus("Overall LLD generated successfully!");
                
                if (previewBox) previewBox.classList.remove('hidden');
                const btnExportLLD = document.getElementById('btnExportLLD');
                if (btnExportLLD) btnExportLLD.disabled = false;
                
                this.appendConsoleLog("Overall LLD Generation completed successfully!", "success");

            } catch (err) {
                console.error("Overall LLD Generation Error: ", err);
                this.showStatus("Overall LLD Generation failed: " + err.message, true);
                this.appendConsoleLog(`Overall LLD Generation failed: ${err.message}`, "error");
            }
        },

        clearConsole: function () {
            const consoleDiv = document.getElementById('lldConsoleLog');
            if (consoleDiv) {
                consoleDiv.innerHTML = '';
            }
        },

        appendConsoleLog: function (message, type = "info") {
            const consoleDiv = document.getElementById('lldConsoleLog');
            if (!consoleDiv) return;
            const time = new Date().toLocaleTimeString();
            const logLine = document.createElement('div');
            logLine.className = `log-entry ${type}`;
            
            let color = "#e2e8f0";
            if (type === "success") color = "#4ade80"; 
            else if (type === "warning") color = "#facc15"; 
            else if (type === "error") color = "#f87171"; 
            else if (type === "debug") color = "#94a3b8"; 
            else if (type === "info") color = "#38bdf8"; 
            
            logLine.style.color = color;
            logLine.style.marginBottom = "3px";
            logLine.textContent = `[${time}] ${message}`;
            
            consoleDiv.appendChild(logLine);
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        },

        generateComponentDescription: function (item, type) {
            if (!item) return "No configuration details available.";

            try {
                switch (type) {
                    case "Catalog Item":
                    case "Record Producer":
                    case "Composite Record Producer":
                        const itemType = item.type || "Catalog Item";
                        return `This is a <strong>${itemType}</strong> configuration named '<strong>${item.name || 'Unnamed'}</strong>'. It is mapped to target the <code>${item.table || 'N/A'}</code> database table, allowing users to submit requests through the Service Catalog.`;

                    case "Variable":
                        const vType = item.type || "String";
                        let varDesc = `This form variable '${item.label || item.name || 'Unnamed'}' (name: <code>${item.name || 'N/A'}</code>) is a <strong>${vType}</strong> data type. It is positioned at order ${item.order || '0'}.`;
                        if (item.mandatory) varDesc += " It is mandatory.";
                        if (item.readOnly) varDesc += " It is read-only.";
                        if (item.reference) varDesc += ` It references the '<code>${item.reference}</code>' database table.`;
                        if (item.choices && item.choices.length > 0) {
                            const choiceVals = item.choices.map(c => c.label || c.value).join(', ');
                            varDesc += ` Options: [${choiceVals}].`;
                        }
                        return varDesc;

                    case "Variable Set":
                        return `This <strong>Variable Set</strong> '${item.name || 'Unnamed'}' groups variables together for reuse. Under the conditions mapped, it dynamically renders variables: ${item.variables ? item.variables.map(v => v.label || v.name).join(', ') : 'None'}.`;

                    case "Catalog UI Policy":
                        let actionsDesc = "";
                        if (item.actions && item.actions.length > 0) {
                            actionsDesc = item.actions.map(act => {
                                const field = act.variable || act.field || "Unknown Field";
                                const parts = [];
                                if (act.visible === "true") parts.push("visible");
                                if (act.visible === "false") parts.push("hidden");
                                if (act.mandatory === "true") parts.push("mandatory");
                                if (act.mandatory === "false") parts.push("optional");
                                if (act.readOnly === "true") parts.push("read-only");
                                if (act.readOnly === "false") parts.push("editable");
                                return `makes '<code>${field}</code>' ${parts.length > 0 ? parts.join(' and ') : 'unchanged'}`;
                            }).join(', ');
                        } else {
                            actionsDesc = "applies field behavior scripts";
                        }
                        return `This UI Policy automatically executes on the form. Under the conditions where [<strong>${item.conditions || 'Always'}</strong>], it ${actionsDesc || 'performs no actions'}.${item.reverseIfFalse ? ' It reverses this behavior if the conditions evaluate to False.' : ''}`;

                    case "Catalog Client Script":
                    case "Client Script":
                        const scriptTable = item.table || "Catalog Item";
                        const runType = item.type || "onLoad";
                        let scDesc = `This Client Script automates front-end behavior on '<strong>${scriptTable}</strong>'. It executes <strong>${runType}</strong>`;
                        if (runType === "onChange" && item.field) {
                            scDesc += ` (monitoring the field '<code>${item.field}</code>')`;
                        }
                        scDesc += ` to validate inputs and manipulate the UI in real-time.`;
                        return scDesc;

                    case "Table":
                        const tblExt = item.extendsTable && item.extendsTable !== "Unknown" ? ` (extending parent table '<code>${item.extendsTable}</code>')` : "";
                        return `This database table represents the '<strong>${item.label || item.name}</strong>' (name: <code>${item.name}</code>) schema${tblExt}. It is defined to store specialized application records.`;

                    case "Dictionary Field":
                        const fType = item.type || "string";
                        let fieldDesc = `Column '<strong>${item.label || item.element}</strong>' (element: <code>${item.element}</code>) is a <strong>${fType}</strong> data type.`;
                        if (item.mandatory) fieldDesc += " It is mandatory.";
                        if (item.readOnly) fieldDesc += " It is read-only.";
                        if (item.reference) fieldDesc += ` It references the '<code>${item.reference}</code>' table.`;
                        if (item.choices && item.choices.length > 0) {
                            const choiceList = item.choices.map(c => c.label || c.value).join(', ');
                            fieldDesc += ` Choice options: [${choiceList}].`;
                        }
                        return fieldDesc;

                    case "Business Rule":
                        const when = item.when || "before";
                        const ops = [];
                        if (item.insert) ops.push("insert");
                        if (item.update) ops.push("update");
                        if (item.delete) ops.push("delete");
                        if (item.query) ops.push("query");
                        const opText = ops.length > 0 ? ops.join('/') : "operations";
                        return `This Business Rule executes database logic on table '<code>${item.table || 'N/A'}</code>'. It triggers <strong>${when}</strong> record <strong>${opText}</strong> under conditions: [<strong>${item.conditions || 'None - Runs Always'}</strong>] to process server actions.`;

                    case "UI Action":
                        const buttonLabel = item.name || "Button";
                        return `This UI Action renders an interactive button/link labeled '<strong>${buttonLabel}</strong>' on the '<code>${item.table || 'N/A'}</code>' form or list. It is visible when: [<strong>${item.condition || 'Always'}</strong>] and executes custom scripts onClick.`;

                    case "Script Include":
                        const callable = item.clientCallable ? "client-callable and server-callable" : "server-callable only";
                        return `This Script Include is a reusable JavaScript class library named '<code>${item.name || 'Unnamed'}</code>'. It is defined as <strong>${callable}</strong>, providing backend utility functions and APIs.`;

                    case "Flow":
                        const flowActionsCount = item.actions ? item.actions.length : 0;
                        return `This Workflow Engine Flow is triggered by <strong>${item.trigger || 'system events or record modifications'}</strong>. It executes a chronological sequence of <strong>${flowActionsCount}</strong> custom actions/steps to automate the process lifecycle.`;

                    case "SLA Definition":
                        return `This Service Level Agreement (SLA) tracks response/resolution targets on the '<code>${item.table || 'N/A'}</code>' table. It has a duration of <strong>${item.duration || 'N/A'}</strong> and starts when [<strong>${item.start_condition || 'N/A'}</strong>].`;

                    case "Email Notification":
                        return `This Email Notification is triggered on the '<code>${item.table || 'N/A'}</code>' table when records are <strong>${item.trigger || 'inserted/updated'}</strong>. It formats and sends communication templates to configured users or groups.`;

                    case "REST Message Function":
                        return `This Outbound REST web service method manages communication with external endpoints. It executes an HTTP <strong>${item.method || 'GET'}</strong> request targeting <code>${item.endpoint || 'N/A'}</code>.`;

                    case "System Property":
                        return `This System Property ('<code>${item.name}</code>') stores instance configuration values. Current configured value: '<code>${item.value || ''}</code>'.`;

                    case "Access Control (ACL)":
                        const rolesList = item.roles || "Public (No roles)";
                        return `This Access Control List (ACL) rule enforces security permissions. It grants <strong>${item.operation || 'read'}</strong> access on object '<code>${item.name}</code>' to users with roles: [<strong>${rolesList}</strong>].`;

                    default:
                        return `This configuration record represents a custom <strong>${type}</strong> change named '<strong>${item.name || 'Unnamed'}</strong>' to implement tailored ServiceNow logic.`;
                }
            } catch (err) {
                console.warn("Error generating description: ", err);
                return "Technical configuration details registered in update set.";
            }
        },

        updateProgressBar: function (pct, text) {
            const progressFill = document.getElementById('lldProgressFill');
            const progressText = document.getElementById('lldProgressText');
            if (progressFill) progressFill.style.width = `${pct}%`;
            if (progressText) progressText.textContent = `${pct}% - ${text}`;
        },

        // Helper to parse uploaded XML file
        parseXmlPayloads: function (xmlString) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");
            
            // Check for parse error
            const parseError = xmlDoc.getElementsByTagName("parsererror");
            if (parseError.length > 0) {
                throw new Error("Invalid XML file structure: " + parseError[0].textContent);
            }

            const rootElement = xmlDoc.documentElement;
            let usName = "ServiceNow Update Set";
            let usCreatedBy = "Unknown";
            let usCreatedOn = "N/A";
            let usScope = "global";

            // Find update set header info
            const headerSet = rootElement.getElementsByTagName("sys_remote_update_set")[0] || 
                              rootElement.getElementsByTagName("sys_update_set")[0];
            
            if (headerSet) {
                usName = headerSet.getElementsByTagName("name")[0]?.textContent || usName;
                usCreatedBy = headerSet.getElementsByTagName("sys_created_by")[0]?.textContent || usCreatedBy;
                usCreatedOn = headerSet.getElementsByTagName("sys_created_on")[0]?.textContent || usCreatedOn;
                usScope = headerSet.getElementsByTagName("application_scope")[0]?.textContent || 
                          headerSet.getElementsByTagName("application")[0]?.textContent || usScope;
            }

            const updatesList = [];
            const xmlNodes = rootElement.getElementsByTagName("sys_update_xml");
            for (let i = 0; i < xmlNodes.length; i++) {
                const node = xmlNodes[i];
                updatesList.push({
                    name: node.getElementsByTagName("name")[0]?.textContent || "",
                    type: node.getElementsByTagName("type")[0]?.textContent || "",
                    target_name: node.getElementsByTagName("target_name")[0]?.textContent || "",
                    action: node.getElementsByTagName("action")[0]?.textContent || "INSERT_OR_UPDATE",
                    payload: node.getElementsByTagName("payload")[0]?.textContent || ""
                });
            }

            return this.buildUnifiedRegistry(updatesList, {
                name: usName,
                createdBy: usCreatedBy,
                createdOn: usCreatedOn,
                scope: usScope
            });
        },

        // Helper to compile live updates lists
        compileLiveXmls: function (updates, usName) {
            const meta = {
                name: usName,
                createdBy: window.activeInstanceData?.user || "Live Session",
                createdOn: new Date().toISOString().slice(0, 19).replace('T', ' '),
                scope: "Live Instance"
            };

            const updatesList = updates.map(u => ({
                name: u.name,
                type: u.type,
                target_name: u.target_name,
                action: u.action,
                payload: u.payload
            }));

            return this.buildUnifiedRegistry(updatesList, meta);
        },

        // Map escaped HTML payload strings back to clean XML node objects
        buildUnifiedRegistry: function (updatesList, metadata) {
            const registry = {
                metadata: metadata,
                rawUpdates: updatesList,
                catalogItems: {},
                variableSets: {},
                tables: {},
                flows: {},
                slas: [],
                restMessages: {},
                notifications: [],
                scriptIncludes: [],
                businessRules: [],
                uiActions: [],
                clientScripts: [],
                scheduledJobs: [],
                sysProperties: [],
                acls: [],
                otherConfigs: [],
                variableMap: {}, // mapping of IO:sys_id -> variable details for UI policy conditions mapping
            };

            const parser = new DOMParser();

            // First Pass: Index Catalog Variables & Sets to map mapping relations
            updatesList.forEach(update => {
                if (!update.payload || update.action === "DELETE") return;
                
                try {
                    const payloadDoc = parser.parseFromString(update.payload, "application/xml");
                    
                    if (update.type === "Variable") {
                        const vNode = payloadDoc.getElementsByTagName("item_option_new")[0];
                        if (vNode) {
                            const sysId = vNode.getElementsByTagName("sys_id")[0]?.textContent || "";
                            const name = vNode.getElementsByTagName("name")[0]?.textContent || "";
                            const label = vNode.getElementsByTagName("question_text")[0]?.textContent || name;
                            if (sysId) {
                                registry.variableMap[sysId] = { name, label };
                                registry.variableMap["IO:" + sysId] = { name, label };
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Pre-parse error on payload: ", e);
                }
            });

            // Second Pass: Parse full details
            updatesList.forEach(update => {
                if (!update.payload) return;
                
                try {
                    const payloadDoc = parser.parseFromString(update.payload, "application/xml");
                    const rootNode = payloadDoc.documentElement;
                    if (!rootNode) return;

                    const mainRecord = rootNode.nodeName === "record_update" 
                        ? (Array.from(rootNode.childNodes).find(n => n.nodeType === 1 && n.nodeName !== "sys_translated_text"))
                        : rootNode;

                    if (!mainRecord) return;

                    const recordValues = {};
                    Array.from(mainRecord.childNodes).forEach(child => {
                        if (child.nodeType === 1) {
                            recordValues[child.nodeName] = child.textContent;
                        }
                    });

                    const sysId = recordValues["sys_id"] || "";
                    const name = recordValues["name"] || update.target_name || "";
                    const active = recordValues["active"] === "true";
                    const description = recordValues["description"] || "";

                    if (update.action === "DELETE") {
                        // Mark as deleted but catalog it
                        registry.otherConfigs.push({
                            type: update.type,
                            name: update.target_name || update.name,
                            action: "DELETE",
                            details: "Record deleted in this update set."
                        });
                        return;
                    }

                    // Mapping Switch based on type
                    switch (update.type) {
                        case "Catalog Item":
                        case "Record Producer":
                        case "Composite Record Producer":
                            const existingItem = registry.catalogItems[sysId] || {};
                            registry.catalogItems[sysId] = {
                                sys_id: sysId,
                                type: update.type,
                                name: name,
                                active: active,
                                description: description,
                                table: recordValues["table_name"] || recordValues["table"] || "",
                                category: recordValues["category"] || "",
                                catalogs: recordValues["sc_catalogs"] || "",
                                variables: existingItem.variables || [],
                                variableSets: existingItem.variableSets || [],
                                clientScripts: existingItem.clientScripts || [],
                                uiPolicies: existingItem.uiPolicies || []
                            };
                            break;

                        case "Variable":
                            const catItemRef = recordValues["cat_item"] || "";
                            const varSetRef = recordValues["variable_set"] || "";
                            const varType = this.resolveVariableType(recordValues["type"]);
                            
                            const variableData = {
                                sys_id: sysId,
                                name: recordValues["name"] || "",
                                label: recordValues["question_text"] || recordValues["name"] || "",
                                type: varType,
                                order: recordValues["order"] || "0",
                                mandatory: recordValues["mandatory"] === "true",
                                readOnly: recordValues["read_only"] === "true",
                                reference: recordValues["reference"] || "",
                                lookupTable: recordValues["lookup_table"] || "",
                                choiceTable: recordValues["choice_table"] || "",
                                choices: []
                            };

                            if (catItemRef) {
                                if (!registry.catalogItems[catItemRef]) {
                                    registry.catalogItems[catItemRef] = { name: "External/Unresolved Catalog Item", variables: [], variableSets: [], clientScripts: [], uiPolicies: [] };
                                }
                                registry.catalogItems[catItemRef].variables.push(variableData);
                            } else if (varSetRef) {
                                if (!registry.variableSets[varSetRef]) {
                                    registry.variableSets[varSetRef] = { name: "Variable Set", variables: [], isSet: true };
                                }
                                registry.variableSets[varSetRef].variables.push(variableData);
                            }
                            break;

                        case "Variable Set":
                        case "Catalog Variable Set":
                            registry.variableSets[sysId] = {
                                sys_id: sysId,
                                name: recordValues["title"] || recordValues["name"] || name,
                                type: recordValues["type"] || "one_to_one",
                                description: description,
                                variables: registry.variableSets[sysId]?.variables || [],
                                isSet: true
                            };
                            break;

                        case "Catalog Variable Set Link":
                        case "io_set_item":
                            const setLinkItem = recordValues["sc_cat_item"] || "";
                            const setLinkSet = recordValues["variable_set"] || "";
                            if (setLinkItem && setLinkSet) {
                                if (!registry.catalogItems[setLinkItem]) {
                                    registry.catalogItems[setLinkItem] = { name: "External Catalog Item", variables: [], variableSets: [], clientScripts: [], uiPolicies: [] };
                                }
                                registry.catalogItems[setLinkItem].variableSets.push(setLinkSet);
                            }
                            break;

                        case "Catalog UI Policy":
                            const policyItem = recordValues["catalog_item"] || "";
                            const policySet = recordValues["variable_set"] || "";
                            const policyData = {
                                sys_id: sysId,
                                short_description: recordValues["short_description"] || "",
                                active: active,
                                order: recordValues["order"] || "100",
                                conditions: this.resolveConditions(recordValues["catalog_conditions"] || "", registry.variableMap),
                                reverseIfFalse: recordValues["reverse_if_false"] === "true",
                                runScripts: recordValues["run_scripts"] === "true",
                                actions: []
                            };

                            if (policyItem) {
                                if (!registry.catalogItems[policyItem]) {
                                    registry.catalogItems[policyItem] = { name: "External Catalog Item", variables: [], variableSets: [], clientScripts: [], uiPolicies: [] };
                                }
                                registry.catalogItems[policyItem].uiPolicies.push(policyData);
                            } else if (policySet) {
                                if (!registry.variableSets[policySet]) {
                                    registry.variableSets[policySet] = { name: "Variable Set", variables: [], uiPolicies: [], isSet: true };
                                }
                                if (!registry.variableSets[policySet].uiPolicies) {
                                    registry.variableSets[policySet].uiPolicies = [];
                                }
                                registry.variableSets[policySet].uiPolicies.push(policyData);
                            }
                            break;

                        case "Catalog UI Policy Action":
                            const actionPolicy = recordValues["ui_policy"] || "";
                            const targetVariable = recordValues["variable"] || recordValues["field"] || "";
                            const actionData = {
                                variable: targetVariable,
                                mandatory: recordValues["mandatory"] || "ignore",
                                visible: recordValues["visible"] || "ignore",
                                disabled: recordValues["disabled"] || "ignore",
                                clearValue: recordValues["cleared"] === "true"
                            };

                            // Look for the policy in catalog items or sets
                            let actionLinked = false;
                            Object.values(registry.catalogItems).forEach(item => {
                                const policy = item.uiPolicies?.find(p => p.sys_id === actionPolicy);
                                if (policy) {
                                    policy.actions.push(actionData);
                                    actionLinked = true;
                                }
                            });
                            if (!actionLinked) {
                                Object.values(registry.variableSets).forEach(set => {
                                    const policy = set.uiPolicies?.find(p => p.sys_id === actionPolicy);
                                    if (policy) {
                                        policy.actions.push(actionData);
                                        actionLinked = true;
                                    }
                                });
                            }
                            if (!actionLinked) {
                                registry.otherConfigs.push({
                                    type: "Orphan UI Policy Action",
                                    name: name,
                                    details: `Modifies variable [${targetVariable}] -> Visible: ${actionData.visible}, Mandatory: ${actionData.mandatory}`
                                });
                            }
                            break;

                        case "Client Script":
                        case "Catalog Client Script":
                            const scriptItem = recordValues["cat_item"] || "";
                            const scriptData = {
                                name: name,
                                active: active,
                                type: recordValues["type"] || "onLoad",
                                uiType: recordValues["ui_type"] || "All",
                                description: recordValues["description"] || "",
                                script: recordValues["script"] || "",
                                isolate: recordValues["isolate_script"] === "true"
                            };

                            if (scriptItem) {
                                if (!registry.catalogItems[scriptItem]) {
                                    registry.catalogItems[scriptItem] = { name: "External Catalog Item", variables: [], variableSets: [], clientScripts: [], uiPolicies: [] };
                                }
                                registry.catalogItems[scriptItem].clientScripts.push(scriptData);
                            } else {
                                registry.clientScripts.push({
                                    name: name,
                                    active: active,
                                    table: recordValues["table"] || "global",
                                    type: recordValues["type"] || "onLoad",
                                    script: recordValues["script"] || "",
                                    description: description
                                });
                            }
                            break;

                        case "Table":
                            const tblName = recordValues["name"] || "";
                            registry.tables[tblName] = {
                                name: tblName,
                                label: recordValues["label"] || name,
                                extendsTable: recordValues["super_class"] || "None",
                                active: true,
                                fields: registry.tables[tblName]?.fields || []
                            };
                            break;

                        case "Dictionary":
                            const dictTable = recordValues["name"] || mainRecord.getAttribute("table") || "";
                            const dictElement = recordValues["element"] || mainRecord.getAttribute("element") || "";
                            if (!dictTable || !dictElement) break;

                            const dictData = {
                                element: dictElement,
                                label: recordValues["column_label"] || dictElement,
                                type: recordValues["internal_type"] || "string",
                                mandatory: recordValues["mandatory"] === "true",
                                readOnly: recordValues["read_only"] === "true",
                                maxLength: recordValues["max_length"] || "40",
                                reference: recordValues["reference"] || "",
                                choices: []
                            };

                            if (!registry.tables[dictTable]) {
                                registry.tables[dictTable] = { name: dictTable, label: dictTable, extendsTable: "Unknown", fields: [] };
                            }
                            registry.tables[dictTable].fields.push(dictData);
                            break;

                        case "Choice list":
                        case "Choice":
                            const cTable = recordValues["name"] || "";
                            const cElement = recordValues["element"] || "";
                            const cValue = recordValues["value"] || "";
                            const cLabel = recordValues["label"] || cValue;
                            
                            if (cTable && cElement) {
                                if (!registry.tables[cTable]) {
                                    registry.tables[cTable] = { name: cTable, label: cTable, extendsTable: "Unknown", fields: [] };
                                }
                                let field = registry.tables[cTable].fields.find(f => f.element === cElement);
                                if (!field) {
                                    field = { element: cElement, label: cElement, type: "choice", choices: [] };
                                    registry.tables[cTable].fields.push(field);
                                }
                                if (!field.choices) field.choices = [];
                                field.choices.push({ value: cValue, label: cLabel });
                            }
                            break;

                        case "Flow":
                            // Parse triggering condition & nested actions
                            const flowActions = [];
                            const actionNodes = payloadDoc.getElementsByTagName("sys_hub_action_instance_v2");
                            for (let idx = 0; idx < actionNodes.length; idx++) {
                                const act = actionNodes[idx];
                                flowActions.push({
                                    order: act.getElementsByTagName("order")[0]?.textContent || (idx + 1).toString(),
                                    type: act.getElementsByTagName("action_type")[0]?.getAttribute("display_value") || "Action Step",
                                    comment: act.getElementsByTagName("comment")[0]?.textContent || ""
                                });
                            }
                            // Sort by order ascending
                            flowActions.sort((a,b) => parseInt(a.order) - parseInt(b.order));

                            const triggerType = payloadDoc.getElementsByTagName("sys_hub_trigger_instance_v2")[0]?.getElementsByTagName("name")[0]?.textContent || "Service Catalog / Event Trigger";

                            registry.flows[sysId] = {
                                name: name,
                                internalName: recordValues["internal_name"] || "",
                                active: active,
                                description: recordValues["description"] || "",
                                runAs: recordValues["run_as"] || "system",
                                trigger: triggerType,
                                actions: flowActions
                            };
                            break;

                        case "SLA Definition":
                            registry.slas.push({
                                name: name,
                                table: recordValues["table"] || "",
                                active: active,
                                duration: recordValues["duration"] || "",
                                startCondition: recordValues["start_condition"] || "",
                                pauseCondition: recordValues["pause_condition"] || "",
                                stopCondition: recordValues["stop_condition"] || ""
                            });
                            break;

                        case "REST Message":
                            registry.restMessages[sysId] = {
                                sys_id: sysId,
                                name: name,
                                endpoint: recordValues["endpoint"] || "",
                                authType: recordValues["authentication_type"] || "No Auth",
                                description: description,
                                methods: []
                            };
                            break;

                        case "REST Message Function":
                            const restParent = recordValues["rest_message"] || "";
                            const methodData = {
                                name: recordValues["function_name"] || name,
                                method: recordValues["http_method"] || "GET",
                                endpoint: recordValues["endpoint"] || "",
                                headers: recordValues["headers"] || ""
                            };
                            if (restParent) {
                                if (!registry.restMessages[restParent]) {
                                    registry.restMessages[restParent] = { name: "Outbound Service", methods: [] };
                                }
                                registry.restMessages[restParent].methods.push(methodData);
                            }
                            break;

                        case "Notification":
                            registry.notifications.push({
                                name: name,
                                table: recordValues["table"] || "",
                                active: active,
                                subject: recordValues["subject"] || "",
                                event: recordValues["event_name"] || "",
                                recipients: recordValues["recipient_users"] || recordValues["recipient_groups"] || "Fields specified",
                                body: recordValues["message_html"] || ""
                            });
                            break;

                        case "Script Include":
                            registry.scriptIncludes.push({
                                name: name,
                                active: active,
                                apiName: recordValues["api_name"] || name,
                                script: recordValues["script"] || "",
                                description: recordValues["description"] || ""
                            });
                            break;

                        case "Business Rule":
                            registry.businessRules.push({
                                name: name,
                                active: active,
                                table: recordValues["table"] || "",
                                when: recordValues["when"] || "before",
                                insert: recordValues["action_insert"] === "true",
                                update: recordValues["action_update"] === "true",
                                condition: recordValues["condition"] || "",
                                script: recordValues["script"] || "",
                                description: description
                            });
                            break;

                        case "UI Action":
                            registry.uiActions.push({
                                name: name,
                                active: active,
                                table: recordValues["table"] || "",
                                actionName: recordValues["action_name"] || "",
                                condition: recordValues["condition"] || "",
                                client: recordValues["client"] === "true",
                                formButton: recordValues["form_button"] === "true",
                                script: recordValues["script"] || ""
                            });
                            break;

                        case "Scheduled Job":
                        case "Scheduled Script Execution":
                            registry.scheduledJobs.push({
                                name: name,
                                active: active,
                                runAs: recordValues["run_as"] || "",
                                runType: recordValues["run_type"] || "daily",
                                script: recordValues["script"] || ""
                            });
                            break;

                        case "System Property":
                            registry.sysProperties.push({
                                name: recordValues["name"] || name,
                                description: recordValues["description"] || "",
                                value: recordValues["value"] || ""
                            });
                            break;

                        case "Access Control":
                        case "Access Control Rule":
                            registry.acls.push({
                                name: recordValues["name"] || name,
                                operation: recordValues["operation"] || "",
                                active: active,
                                roles: recordValues["roles"] || "None"
                            });
                            break;

                        default:
                            // Fallback Parser
                            const keyDetails = [];
                            if (recordValues["description"]) keyDetails.push(`Description: ${recordValues["description"]}`);
                            if (recordValues["active"]) keyDetails.push(`Active: ${recordValues["active"]}`);
                            if (recordValues["table"]) keyDetails.push(`Table: ${recordValues["table"]}`);
                            if (recordValues["value"]) keyDetails.push(`Value: ${recordValues["value"]}`);

                            registry.otherConfigs.push({
                                type: update.type,
                                name: update.target_name || name,
                                action: update.action,
                                details: keyDetails.length > 0 ? keyDetails.join(" | ") : "Metadata configuration updated."
                            });
                            break;
                    }

                } catch (e) {
                    console.warn(`Failed parsing update payload: ${update.name}`, e);
                }
            });

            // Clean registry: Filter out mock item headers generated by children pre-parsing
            Object.keys(registry.catalogItems).forEach(key => {
                if (!registry.catalogItems[key].name) {
                    delete registry.catalogItems[key];
                }
            });
            Object.keys(registry.variableSets).forEach(key => {
                if (!registry.variableSets[key].name) {
                    delete registry.variableSets[key];
                }
            });

            return registry;
        },

        resolveVariableType: function (typeInt) {
            const types = {
                "1": "Yes/No", "2": "Multi Line Text", "3": "Multiple Choice", "4": "Numeric Scale",
                "5": "Select Box", "6": "Single Line Text", "7": "Wide Single Line", "8": "Reference",
                "9": "Date", "10": "Date/Time", "11": "Label", "12": "Break", "13": "Container Start",
                "14": "Container Split", "15": "Container End", "16": "Wide Single Line Text",
                "17": "IP Address", "18": "Lookup Select Box", "19": "Lookup Multiple Choice",
                "20": "Scrolling Text", "21": "List Collector", "22": "HTML", "23": "URL",
                "24": "Attachment", "25": "Masked", "26": "Custom", "27": "Custom with Label"
            };
            return types[typeInt] || `Other (${typeInt})`;
        },

        resolveConditions: function (conditionString, varMap) {
            if (!conditionString) return "None (Always runs)";
            // Replace IO:sys_id links with variable labels
            let readable = conditionString;
            const regex = /IO:([a-f0-9]{32})/g;
            let match;
            while ((match = regex.exec(conditionString)) !== null) {
                const sysId = match[1];
                const variable = varMap[sysId];
                if (variable) {
                    readable = readable.replace("IO:" + sysId, `[${variable.label}]`);
                }
            }
            // Clean syntax indicators (e.g. ^EQ)
            readable = readable.replace(/\^EQ$/, "").replace(/\^/g, " AND ").replace(/=/g, " is ");
            return readable;
        },

        // Render dynamic tabbed sections in the Dashboard preview box
        renderPreview: function (reg) {
            // Render Summary
            const totalItems = reg.rawUpdates.length;
            const summaryHtml = `
                <div class="lld-summary-cards">
                    <div class="lld-summary-card">
                        <div class="card-val">${totalItems}</div>
                        <div class="card-key">Total Updates</div>
                    </div>
                    <div class="lld-summary-card">
                        <div class="card-val">${Object.keys(reg.catalogItems).length}</div>
                        <div class="card-key">Catalog Items</div>
                    </div>
                    <div class="lld-summary-card">
                        <div class="card-val">${Object.keys(reg.tables).length}</div>
                        <div class="card-key">Tables</div>
                    </div>
                    <div class="lld-summary-card">
                        <div class="card-val">${Object.keys(reg.flows).length}</div>
                        <div class="card-key">Flows</div>
                    </div>
                    <div class="lld-summary-card">
                        <div class="card-val">${reg.scriptIncludes.length + reg.businessRules.length}</div>
                        <div class="card-key">Server Scripts</div>
                    </div>
                </div>
                <div style="font-size: 11px; line-height: 1.6; color: var(--p4m-text-dark); background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                    <p style="margin:0 0 6px 0;"><strong>Update Set Name:</strong> ${reg.metadata.name}</p>
                    <p style="margin:0 0 6px 0;"><strong>Created By:</strong> ${reg.metadata.createdBy}</p>
                    <p style="margin:0 0 6px 0;"><strong>Scope / Pack:</strong> ${reg.metadata.scope}</p>
                    <p style="margin:0;"><strong>Extracted Timestamp:</strong> ${reg.metadata.createdOn}</p>
                </div>
            `;
            document.getElementById('lldSummaryArea').innerHTML = summaryHtml;

            // Render Catalog
            let catalogHtml = "";
            const catItems = Object.values(reg.catalogItems);
            if (catItems.length === 0) {
                catalogHtml = "<p>No Catalog Items or Record Producers found in this update set.</p>";
            } else {
                catItems.forEach(item => {
                    const variablesList = item.variables.map(v => `
                        <tr>
                            <td>${v.label}</td>
                            <td><code>${v.name}</code></td>
                            <td>${v.type}</td>
                            <td>${v.order}</td>
                            <td>${v.mandatory ? 'Yes' : 'No'}</td>
                            <td>${v.readOnly ? 'Yes' : 'No'}</td>
                            <td>${this.generateComponentDescription(v, 'Variable')}</td>
                        </tr>
                    `).join("");

                    const uiPoliciesList = item.uiPolicies.map(p => `
                        <div style="border-bottom:1px solid #f1f5f9; padding: 8px 0;">
                            <p style="margin:0; font-size:10px; font-weight:600; color:#1e293b;">${p.short_description || 'Catalog UI Policy'}</p>
                            <p style="margin:2px 0; font-size:9.5px; color:#334155; line-height:1.4;"><strong>Description:</strong> ${this.generateComponentDescription(p, 'Catalog UI Policy')}</p>
                            <p style="margin:2px 0; font-size:9px; color:#64748b;"><strong>Condition:</strong> <code>${p.conditions}</code></p>
                            <p style="margin:0; font-size:9px; color:#64748b;"><strong>Actions:</strong> ${p.actions.map(a => `[${a.variable}] (Visible: ${a.visible}, Mandatory: ${a.mandatory}, ReadOnly: ${a.disabled})`).join("; ")}</p>
                        </div>
                    `).join("");

                    const clientScriptsList = item.clientScripts.map(cs => `
                        <div style="border-bottom:1px solid #f1f5f9; padding: 8px 0;">
                            <p style="margin:0; font-size:10px; font-weight:600; color:#1e293b;">${cs.name} (${cs.type})</p>
                            <p style="margin:2px 0; font-size:9.5px; color:#334155; line-height:1.4;"><strong>Description:</strong> ${this.generateComponentDescription(cs, 'Catalog Client Script')}</p>
                            <p style="margin:2px 0 0 0; font-size:9px; color:#64748b;"><strong>Isolate:</strong> ${cs.isolate ? 'Yes' : 'No'} | <strong>UI Type:</strong> ${cs.uiType}</p>
                        </div>
                    `).join("");

                    catalogHtml += `
                        <div class="lld-collapsible collapsed">
                            <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                <span><span class="badge-us-type catalog">${item.type}</span> ${item.name}</span>
                            </div>
                            <div class="lld-collapsible-content">
                                <p style="margin-bottom:8px;"><strong>Target Table:</strong> <code>${item.table || 'N/A'}</code></p>
                                <p style="margin-bottom:10px;">${item.description ? item.description.replace(/<[^>]*>/g, '').substring(0, 150) : 'No description provided.'}</p>
                                
                                <h4>Form Fields (Variables)</h4>
                                <div class="lld-preview-table-container">
                                    <table class="lld-preview-table">
                                        <thead>
                                            <tr>
                                                <th>Question / Label</th>
                                                <th>Name</th>
                                                <th>Type</th>
                                                <th>Order</th>
                                                <th>Mandatory</th>
                                                <th>Read-Only</th>
                                                <th>Description / Explanation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${variablesList || '<tr><td colspan="7" style="text-align:center;">No direct variables defined.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>

                                ${uiPoliciesList ? `<h4>UI Policies</h4><div>${uiPoliciesList}</div>` : ''}
                                ${clientScriptsList ? `<h4>Client Scripts</h4><div>${clientScriptsList}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
            }
            document.getElementById('lldCatalogArea').innerHTML = catalogHtml;

            // Render Tables/Data Model
            let dataHtml = "";
            const tables = Object.values(reg.tables);
            if (tables.length === 0) {
                dataHtml = "<p>No custom tables or schema definitions found in this update set.</p>";
            } else {
                tables.forEach(tbl => {
                    const fieldsList = tbl.fields.map(f => {
                        const choiceText = f.choices && f.choices.length > 0
                            ? f.choices.map(c => `${c.label} (${c.value})`).join(", ")
                            : "";

                        return `
                            <tr>
                                <td>${f.label}</td>
                                <td><code>${f.element}</code></td>
                                <td>${f.type}</td>
                                <td>${f.maxLength}</td>
                                <td>${f.mandatory ? 'Yes' : 'No'}</td>
                                <td>${this.generateComponentDescription(f, 'Dictionary Field')}</td>
                            </tr>
                        `;
                    }).join("");

                    dataHtml += `
                        <div class="lld-collapsible collapsed">
                            <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                <span><span class="badge-us-type data">Table</span> ${tbl.label} (${tbl.name})</span>
                            </div>
                            <div class="lld-collapsible-content">
                                <p style="margin-bottom:10px;"><strong>Extends:</strong> <code>${tbl.extendsTable}</code></p>
                                <p style="margin-bottom:10px; font-size:11px; color:#334155; line-height:1.4;"><strong>Description:</strong> ${this.generateComponentDescription(tbl, 'Table')}</p>
                                
                                <h4>Field Definitions</h4>
                                <div class="lld-preview-table-container">
                                    <table class="lld-preview-table">
                                        <thead>
                                            <tr>
                                                <th>Label</th>
                                                <th>Field Name</th>
                                                <th>Data Type</th>
                                                <th>Length</th>
                                                <th>Mandatory</th>
                                                <th>Description / Explanation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${fieldsList || '<tr><td colspan="6" style="text-align:center;">No dictionary attributes captured.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            document.getElementById('lldDataArea').innerHTML = dataHtml;

            // Render Business Logic
            let logicHtml = "";
            if (reg.scriptIncludes.length === 0 && reg.businessRules.length === 0 && reg.uiActions.length === 0 && reg.clientScripts.length === 0) {
                logicHtml = "<p>No business rules, script includes, client scripts, or UI actions detected.</p>";
            } else {
                const renderCodeBlock = (script) => {
                    if (!script) return "";
                    // Grab comments or first 10 lines
                    const lines = script.trim().split("\n");
                    const snippet = lines.slice(0, 10).join("\n");
                    const ellipsis = lines.length > 10 ? "\n\n// ... [Code Truncated for Documentation Snippet] ..." : "";
                    return `<pre style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; padding:8px; font-family:monospace; font-size:9px; white-space:pre-wrap; margin-top:5px;">${this.escapeHtml(snippet + ellipsis)}</pre>`;
                };

                reg.scriptIncludes.forEach(si => {
                    logicHtml += `
                        <div class="lld-collapsible collapsed">
                            <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                <span><span class="badge-us-type logic">Script Include</span> ${si.name}</span>
                            </div>
                             <div class="lld-collapsible-content">
                                <p><strong>API Name:</strong> <code>${si.apiName}</code> | <strong>Active:</strong> ${si.active ? 'Yes' : 'No'}</p>
                                <p style="margin-top:5px; font-size:11px; color:#334155; line-height:1.4;"><strong>Explanation:</strong> ${this.generateComponentDescription(si, 'Script Include')}</p>
                                <p style="margin-top:5px;">${si.description || 'No description.'}</p>
                                ${renderCodeBlock(si.script)}
                            </div>
                        </div>
                    `;
                });

                reg.businessRules.forEach(br => {
                    logicHtml += `
                        <div class="lld-collapsible collapsed">
                            <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                <span><span class="badge-us-type logic">Business Rule</span> ${br.name}</span>
                            </div>
                            <div class="lld-collapsible-content">
                                <p><strong>Table:</strong> <code>${br.table}</code> | <strong>When:</strong> ${br.when} | <strong>Active:</strong> ${br.active ? 'Yes' : 'No'}</p>
                                <p style="margin-top:5px; font-size:11px; color:#334155; line-height:1.4;"><strong>Explanation:</strong> ${this.generateComponentDescription(br, 'Business Rule')}</p>
                                <p style="margin-top:5px;"><strong>Condition:</strong> <code>${br.condition || 'None'}</code></p>
                                ${renderCodeBlock(br.script)}
                            </div>
                        </div>
                    `;
                });

                reg.uiActions.forEach(ua => {
                    logicHtml += `
                        <div class="lld-collapsible collapsed">
                            <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                <span><span class="badge-us-type logic">UI Action</span> ${ua.name}</span>
                            </div>
                            <div class="lld-collapsible-content">
                                <p><strong>Table:</strong> <code>${ua.table}</code> | <strong>Form Button:</strong> ${ua.formButton ? 'Yes' : 'No'} | <strong>Active:</strong> ${ua.active ? 'Yes' : 'No'}</p>
                                <p style="margin-top:5px; font-size:11px; color:#334155; line-height:1.4;"><strong>Explanation:</strong> ${this.generateComponentDescription(ua, 'UI Action')}</p>
                                <p style="margin-top:5px;"><strong>Condition:</strong> <code>${ua.condition || 'None'}</code></p>
                                ${renderCodeBlock(ua.script)}
                            </div>
                        </div>
                    `;
                });

                reg.clientScripts.forEach(cs => {
                    logicHtml += `
                        <div class="lld-collapsible collapsed">
                            <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                <span><span class="badge-us-type logic">Client Script</span> ${cs.name}</span>
                            </div>
                            <div class="lld-collapsible-content">
                                <p><strong>Table:</strong> <code>${cs.table}</code> | <strong>Type:</strong> ${cs.type} | <strong>Active:</strong> ${cs.active ? 'Yes' : 'No'}</p>
                                <p style="margin-top:5px; font-size:11px; color:#334155; line-height:1.4;"><strong>Explanation:</strong> ${this.generateComponentDescription(cs, 'Client Script')}</p>
                                ${renderCodeBlock(cs.script)}
                            </div>
                        </div>
                    `;
                });
            }
            document.getElementById('lldLogicArea').innerHTML = logicHtml;

            // Render Flows & SLAs
            let flowsHtml = "";
            const flows = Object.values(reg.flows);
            if (flows.length === 0 && reg.slas.length === 0) {
                flowsHtml = "<p>No Flows or SLA Definitions found.</p>";
            } else {
                flows.forEach(flow => {
                    const stepList = flow.actions.map(a => `
                        <li style="margin-bottom:5px; font-size:10px;">
                            <strong>Step ${a.order}:</strong> ${a.type}
                            ${a.comment ? `<span style="color:#64748b; font-style:italic;"> - "${a.comment}"</span>` : ''}
                        </li>
                    `).join("");

                    flowsHtml += `
                        <div class="lld-collapsible collapsed">
                            <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                <span><span class="badge-us-type logic">Flow</span> ${flow.name}</span>
                            </div>
                            <div class="lld-collapsible-content">
                                <p><strong>Trigger:</strong> ${flow.trigger} | <strong>Active:</strong> ${flow.active ? 'Yes' : 'No'} | <strong>Run As:</strong> ${flow.runAs}</p>
                                <p style="margin-top:5px; font-size:11px; color:#334155; line-height:1.4;"><strong>Explanation:</strong> ${this.generateComponentDescription(flow, 'Flow')}</p>
                                <h4 style="margin-top:10px;">Execution Steps</h4>
                                <ol style="padding-left:15px; margin-top:5px;">
                                    ${stepList || '<li style="font-size:10px; color:#64748b;">No actions parsed.</li>'}
                                </ol>
                            </div>
                        </div>
                    `;
                });

                if (reg.slas.length > 0) {
                    const slaRows = reg.slas.map(s => `
                        <tr>
                            <td>${s.name}</td>
                            <td><code>${s.table}</code></td>
                            <td>${s.duration}</td>
                            <td><code>${s.startCondition}</code></td>
                            <td><code>${s.stopCondition}</code></td>
                            <td>${this.generateComponentDescription(s, 'SLA Definition')}</td>
                        </tr>
                    `).join("");

                    flowsHtml += `
                        <h4 style="margin-top:20px;">SLA Definitions</h4>
                        <div class="lld-preview-table-container">
                            <table class="lld-preview-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Target Table</th>
                                        <th>Duration</th>
                                        <th>Start Condition</th>
                                        <th>Stop Condition</th>
                                        <th>Description / Explanation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${slaRows}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }
            document.getElementById('lldFlowsArea').innerHTML = flowsHtml;

            // Render Other (REST, Notifications, Fallbacks)
            let otherHtml = "";
            const rest = Object.values(reg.restMessages);
            if (rest.length === 0 && reg.notifications.length === 0 && reg.otherConfigs.length === 0) {
                otherHtml = "<p>No integrations, notification triggers, or miscellaneous settings.</p>";
            } else {
                if (rest.length > 0) {
                    rest.forEach(rm => {
                        const methodsList = rm.methods.map(m => `
                            <div style="border-bottom:1px dashed #e2e8f0; padding:6px 0; font-size:10px;">
                                <span style="font-weight:bold; color:var(--p4m-primary-color);">${m.method}</span> <strong>${m.name}</strong> 
                                <p style="margin:2px 0; color:#334155; font-size:9.5px; line-height:1.4;"><strong>Description:</strong> ${this.generateComponentDescription(m, 'REST Message Function')}</p>
                                <p style="margin:2px 0 0 0; color:#64748b; font-family:monospace; font-size:9px;">Endpoint: ${m.endpoint}</p>
                            </div>
                        `).join("");

                        otherHtml += `
                            <div class="lld-collapsible collapsed">
                                <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                    <span><span class="badge-us-type integration">REST Message</span> ${rm.name}</span>
                                </div>
                                <div class="lld-collapsible-content">
                                    <p><strong>Base Endpoint:</strong> <code>${rm.endpoint}</code> | <strong>Authentication:</strong> ${rm.authType}</p>
                                    <h4 style="margin-top:10px;">HTTP Methods / Endpoints</h4>
                                    <div>${methodsList || '<p style="font-size:10px; color:#64748b;">No methods mapped.</p>'}</div>
                                </div>
                            </div>
                        `;
                    });
                }

                if (reg.notifications.length > 0) {
                    otherHtml += '<h4>Triggered Email Notifications</h4>';
                    reg.notifications.forEach(n => {
                        otherHtml += `
                            <div class="lld-collapsible collapsed">
                                <div class="lld-collapsible-header" onclick="this.parentNode.classList.toggle('collapsed')">
                                    <span><span class="badge-us-type integration">Notification</span> ${n.name}</span>
                                </div>
                                <div class="lld-collapsible-content">
                                    <p><strong>Table:</strong> <code>${n.table}</code> | <strong>Event Name:</strong> <code>${n.event || 'Record update'}</code></p>
                                    <p style="margin:2px 0; font-size:11px; color:#334155; line-height:1.45;"><strong>Description:</strong> ${this.generateComponentDescription(n, 'Email Notification')}</p>
                                    <p><strong>Subject:</strong> "${n.subject}"</p>
                                    <p><strong>Recipients:</strong> ${n.recipients}</p>
                                </div>
                            </div>
                        `;
                    });
                }

                if (reg.otherConfigs.length > 0) {
                    otherHtml += '<h4 style="margin-top:20px;">System Properties & Misc. Configs</h4>';
                    const otherRows = reg.otherConfigs.map(oc => `
                        <tr>
                            <td><span class="badge-us-type other">${oc.type}</span></td>
                            <td><code>${oc.name}</code></td>
                            <td>${oc.action}</td>
                            <td>${this.generateComponentDescription(oc, oc.type)}</td>
                        </tr>
                    `).join("");

                    otherHtml += `
                        <div class="lld-preview-table-container">
                            <table class="lld-preview-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Configuration Target</th>
                                        <th>Action</th>
                                        <th>Extracted Highlights</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${otherRows}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }
            document.getElementById('lldOtherArea').innerHTML = otherHtml;
        },

        escapeHtml: function (text) {
            if (!text) return "";
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        // Native Word exporter (.docx) utilizing MS HTML/CSS namespaces to output formal cover pages, styled tables, code blocks, etc.
        exportWordDoc: function () {
            if (!this.parsedRegistry) return;
            const reg = this.parsedRegistry;

            // 1. Build word HTML container
            let docHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${reg.metadata.name} LLD</title>
                <!--[if gte mso 9]>
                <xml>
                    <w:WordDocument>
                        <w:View>Print</w:View>
                        <w:Zoom>100</w:Zoom>
                        <w:DoNotOptimizeForBrowser/>
                    </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        color: #1e293b;
                        font-size: 11.5pt;
                        line-height: 1.45;
                    }
                    @page Section1 {
                        size: 8.5in 11.0in;
                        margin: 1.0in 1.0in 1.0in 1.0in;
                        mso-header-margin: 0.5in;
                        mso-footer-margin: 0.5in;
                        mso-header: h1;
                        mso-footer: f1;
                    }
                    div.Section1 {
                        page: Section1;
                    }
                    
                    /* Cover Page Styles */
                    .cover-page {
                        mso-special-character: page-break-before;
                        page-break-after: always;
                        height: 9.0in;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        border-top: 15px solid #cb1214;
                        padding-top: 1.5in;
                    }
                    .cover-title {
                        font-size: 32pt;
                        font-weight: bold;
                        color: #121214;
                        margin-bottom: 5pt;
                        line-height: 1.1;
                    }
                    .cover-subtitle {
                        font-size: 16pt;
                        color: #cb1214;
                        margin-bottom: 2.0in;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        font-weight: 600;
                    }
                    
                    .meta-table {
                        border-collapse: collapse;
                        width: 100%;
                        margin-top: 1.0in;
                    }
                    .meta-table td {
                        padding: 6px 12px;
                        font-size: 10pt;
                        border: 1px solid #e2e8f0;
                        color: #475569;
                    }
                    .meta-table td.label-cell {
                        background-color: #f8fafc;
                        font-weight: bold;
                        width: 150px;
                        color: #1e293b;
                    }

                    /* General Typography & Headers */
                    h1 {
                        font-size: 20pt;
                        color: #121214;
                        border-bottom: 2px solid #cb1214;
                        padding-bottom: 5px;
                        margin-top: 30pt;
                        margin-bottom: 12pt;
                        page-break-before: always;
                    }
                    h2 {
                        font-size: 14pt;
                        color: #cb1214;
                        margin-top: 20pt;
                        margin-bottom: 8pt;
                    }
                    h3 {
                        font-size: 12pt;
                        color: #121214;
                        margin-top: 15pt;
                        margin-bottom: 6pt;
                    }
                    h4 {
                        font-size: 10.5pt;
                        color: #475569;
                        text-transform: uppercase;
                        margin-top: 12pt;
                        margin-bottom: 4pt;
                        letter-spacing: 0.5px;
                    }
                    
                    p {
                        margin: 0 0 8pt 0;
                    }
                    code {
                        font-family: 'Consolas', monospace;
                        background-color: #f1f5f9;
                        padding: 2px 4px;
                        font-size: 9.5pt;
                        color: #cb1214;
                    }
                    
                    /* Tables */
                    table.data-table {
                        border-collapse: collapse;
                        width: 100%;
                        margin-bottom: 15pt;
                        margin-top: 8pt;
                    }
                    table.data-table th {
                        background-color: #1e1e24;
                        color: #ffffff;
                        font-weight: bold;
                        text-align: left;
                        padding: 8px 12px;
                        font-size: 9.5pt;
                        border: 1px solid #1e1e24;
                        text-transform: uppercase;
                    }
                    table.data-table td {
                        padding: 8px 12px;
                        border: 1px solid #e2e8f0;
                        font-size: 9.5pt;
                        vertical-align: top;
                    }
                    table.data-table tr:nth-child(even) {
                        background-color: #f8fafc;
                    }
                    
                    /* Code blocks */
                    pre.code-snippet {
                        background-color: #1e1e24;
                        color: #a5d6a7;
                        border-left: 4px solid #cb1214;
                        padding: 10px 15px;
                        font-family: 'Consolas', monospace;
                        font-size: 9pt;
                        margin: 8pt 0 15pt 0;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    
                    /* Table of Contents Placeholder */
                    .toc-box {
                        border: 1px solid #cbd5e1;
                        background-color: #f8fafc;
                        padding: 15px;
                        margin-bottom: 20pt;
                        page-break-after: always;
                    }
                    .toc-title {
                        font-size: 14pt;
                        font-weight: bold;
                        margin-bottom: 10pt;
                        color: #121214;
                        border-bottom: 1px solid #cbd5e1;
                        padding-bottom: 5px;
                    }
                    .toc-item {
                        display: flex;
                        justify-content: space-between;
                        font-size: 10.5pt;
                        margin-bottom: 5pt;
                        color: #475569;
                    }
                    
                    /* Header and Footer styles */
                    header#h1 {
                        position: running(h1);
                    }
                    footer#f1 {
                        position: running(f1);
                        text-align: right;
                        font-size: 9pt;
                        color: #94a3b8;
                    }
                </style>
            </head>
            <body>
            <div class="Section1">
                
                <!-- COVER PAGE -->
                <div class="cover-page">
                    <div style="font-size: 11pt; color: #64748b; font-weight: bold; margin-bottom: 15pt; text-transform: uppercase;">Technical Low Level Documentation</div>
                    <div class="cover-title">${this.escapeHtml(reg.metadata.name)}</div>
                    <div class="cover-subtitle">ServiceNow Implementation LLD</div>
                    
                    <table class="meta-table">
                        <tr>
                            <td class="label-cell">Author / Creator</td>
                            <td>${this.escapeHtml(reg.metadata.createdBy)}</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Application Scope</td>
                            <td><code>${this.escapeHtml(reg.metadata.scope)}</code></td>
                        </tr>
                        <tr>
                            <td class="label-cell">Extracted Date</td>
                            <td>${this.escapeHtml(reg.metadata.createdOn)}</td>
                        </tr>
                        <tr>
                            <td class="label-cell">Source Type</td>
                            <td>ServiceNow Update Set XML Package</td>
                        </tr>
                    </table>
                </div>

                <!-- TABLE OF CONTENTS -->
                <div class="toc-box">
                    <div class="toc-title">Table of Contents</div>
                    <div class="toc-item"><span>1. Document Scope & Summary</span><span>Page 3</span></div>
                    <div class="toc-item"><span>2. Service Catalog & Form Configurations</span><span>Page 4</span></div>
                    <div class="toc-item"><span>3. Database Schema & Data Models</span><span>Page 5</span></div>
                    <div class="toc-item"><span>4. Business Logic, Client Scripts & Code</span><span>Page 6</span></div>
                    <div class="toc-item"><span>5. Workflows, Flows & SLA Rules</span><span>Page 7</span></div>
                    <div class="toc-item"><span>6. Integrations & Notifications</span><span>Page 8</span></div>
                    <div class="toc-item"><span>7. Security Roles & System Properties</span><span>Page 9</span></div>
                </div>

                <!-- SECTION 1: SUMMARY -->
                <h1>1. Document Scope & Summary</h1>
                <p>This technical Low Level Documentation (LLD) describes the system configuration packages deployed in the update set <strong>${this.escapeHtml(reg.metadata.name)}</strong>.</p>
                <p>The deployed packages include Catalog Forms, Table Schemas, Automations, Integrations, and Client Actions configured and validated under scope <code>${this.escapeHtml(reg.metadata.scope)}</code>.</p>
                
                <h2>1.1 Package Summary Dashboard</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Configuration Component</th>
                            <th>Total Deployed Records</th>
                            <th>Active Deployed Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Service Catalog Forms (Items & Record Producers)</strong></td>
                            <td>${Object.keys(reg.catalogItems).length} records</td>
                            <td>Validated & Formatted</td>
                        </tr>
                        <tr>
                            <td><strong>Custom Tables & Schema Fields</strong></td>
                            <td>${Object.keys(reg.tables).length} tables</td>
                            <td>Dictionary Configured</td>
                        </tr>
                        <tr>
                            <td><strong>Automated Workflows & Flows</strong></td>
                            <td>${Object.keys(reg.flows).length} flows</td>
                            <td>Step Defined</td>
                        </tr>
                        <tr>
                            <td><strong>Server-Side Script Includes & Logic Rules</strong></td>
                            <td>${reg.scriptIncludes.length + reg.businessRules.length} scripts</td>
                            <td>Logic Highlights Mapped</td>
                        </tr>
                        <tr>
                            <td><strong>Integrations, Triggers & Emails</strong></td>
                            <td>${Object.keys(reg.restMessages).length + reg.notifications.length} targets</td>
                            <td>Configured</td>
                        </tr>
                        <tr>
                            <td><strong>Security Controls, System Settings & Misc.</strong></td>
                            <td>${reg.acls.length + reg.sysProperties.length + reg.otherConfigs.length} entries</td>
                            <td>Completed</td>
                        </tr>
                    </tbody>
                </table>

                <!-- SECTION 2: CATALOG -->
                <h1>2. Service Catalog & Form Configurations</h1>
                <p>This section outlines the Service Catalog items, Record Producers, and Composite item formats configured in this package. Variables and form layouts are grouped under their respective catalog items.</p>
            `;

            const catItems = Object.values(reg.catalogItems);
            if (catItems.length === 0) {
                docHtml += "<p>No Service Catalog form configurations were deployed in this package.</p>";
            } else {
                catItems.forEach(item => {
                    const cleanDesc = item.description ? item.description.replace(/<[^>]*>/g, '').trim() : "No description provided.";
                    docHtml += `
                        <h2>2.${catItems.indexOf(item) + 1} ${this.escapeHtml(item.name)} (${item.type})</h2>
                        <p><strong>Target Database Table:</strong> <code>${item.table || 'sc_req_item'}</code> | <strong>Scope:</strong> <code>${this.escapeHtml(reg.metadata.scope)}</code></p>
                        <p><strong>Description:</strong> ${this.escapeHtml(cleanDesc)}</p>
                        
                        <h3>Form Field Variables</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Field Label / Question</th>
                                    <th>Field Name</th>
                                    <th>Data Type</th>
                                    <th>Order</th>
                                    <th>Mandatory</th>
                                    <th>Description / Explanation</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    if (item.variables.length === 0) {
                        docHtml += `<tr><td colspan="6" style="text-align:center; color:#64748b;">No direct variables defined on this item header.</td></tr>`;
                    } else {
                        item.variables.forEach(v => {
                            const vDesc = this.generateComponentDescription(v, 'Variable');
                            docHtml += `
                                <tr>
                                    <td>${this.escapeHtml(v.label)}</td>
                                    <td><code>${this.escapeHtml(v.name)}</code></td>
                                    <td>${this.escapeHtml(v.type)}</td>
                                    <td>${v.order}</td>
                                    <td>${v.mandatory ? 'Yes' : 'No'}</td>
                                    <td>${vDesc}</td>
                                </tr>
                            `;
                        });
                    }

                    docHtml += `
                            </tbody>
                        </table>
                    `;

                    if (item.uiPolicies && item.uiPolicies.length > 0) {
                        docHtml += `<h3>Form UI Policies</h3>`;
                        item.uiPolicies.forEach(p => {
                            const pDesc = this.generateComponentDescription(p, 'Catalog UI Policy');
                            docHtml += `
                                <p style="margin-bottom:2px;"><strong>UI Policy:</strong> ${this.escapeHtml(p.short_description || 'Catalog UI Policy')}</p>
                                <p style="margin-bottom:4px; font-size:10pt; color:#334155; line-height:1.45;"><strong>Explanation:</strong> ${pDesc}</p>
                                <p style="margin-bottom:4px; font-size:9.5pt; color:#475569;"><strong>Trigger Condition:</strong> <code>${this.escapeHtml(p.conditions)}</code></p>
                                <table class="data-table" style="margin-top:2px; margin-bottom:10px;">
                                    <thead>
                                        <tr>
                                            <th>Target Variable</th>
                                            <th>Visible</th>
                                            <th>Mandatory</th>
                                            <th>Read-Only</th>
                                            <th>Clear Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;
                            p.actions.forEach(a => {
                                docHtml += `
                                    <tr>
                                        <td><code>${this.escapeHtml(a.variable)}</code></td>
                                        <td>${a.visible}</td>
                                        <td>${a.mandatory}</td>
                                        <td>${a.disabled}</td>
                                        <td>${a.clearValue ? 'Yes' : 'No'}</td>
                                    </tr>
                                `;
                            });
                            docHtml += `
                                    </tbody>
                                </table>
                            `;
                        });
                    }

                    if (item.clientScripts && item.clientScripts.length > 0) {
                        docHtml += `<h3>Form Client Script Actions</h3>`;
                        item.clientScripts.forEach(cs => {
                            const csDesc = this.generateComponentDescription(cs, 'Catalog Client Script');
                            docHtml += `
                                <p style="margin-bottom:2px;"><strong>Client Script:</strong> ${this.escapeHtml(cs.name)} (${this.escapeHtml(cs.type)})</p>
                                <p style="margin-bottom:4px; font-size:10pt; color:#334155; line-height:1.45;"><strong>Explanation:</strong> ${csDesc}</p>
                                <p style="margin-bottom:4px; font-size:9.5pt; color:#475569;"><strong>Isolate Script:</strong> ${cs.isolate ? 'Yes' : 'No'} | <strong>UI Type:</strong> ${cs.uiType}</p>
                            `;
                            if (cs.script) {
                                const lines = cs.script.trim().split("\n");
                                const snippet = lines.slice(0, 10).join("\n") + (lines.length > 10 ? "\n\n// ... [Code Truncated for Snippet] ..." : "");
                                docHtml += `<pre class="code-snippet">${this.escapeHtml(snippet)}</pre>`;
                            }
                        });
                    }
                });
            }

            // SECTION 3: DATA MODELS
            docHtml += `
                <!-- SECTION 3: DATA MODEL -->
                <h1>3. Database Schema & Data Models</h1>
                <p>This section documents the database schema modifications, including new tables, table extensions, custom dictionary columns, and their options/choice lists.</p>
            `;

            const tables = Object.values(reg.tables);
            if (tables.length === 0) {
                docHtml += "<p>No custom database tables or dictionary extensions were configured in this package.</p>";
            } else {
                tables.forEach(tbl => {
                    docHtml += `
                        <h2>3.${tables.indexOf(tbl) + 1} Table: ${this.escapeHtml(tbl.label)} (<code>${this.escapeHtml(tbl.name)}</code>)</h2>
                        <p><strong>Extends Table:</strong> <code>${this.escapeHtml(tbl.extendsTable)}</code> | <strong>Scope:</strong> <code>${this.escapeHtml(reg.metadata.scope)}</code></p>
                        <p style="font-size:10.5pt; color:#334155; line-height:1.45; margin-bottom:8pt;"><strong>Table Description:</strong> ${this.generateComponentDescription(tbl, 'Table')}</p>
                        
                        <h3>Field Definitions</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Field Label</th>
                                    <th>Element Name</th>
                                    <th>Data Type</th>
                                    <th>Length</th>
                                    <th>Mandatory</th>
                                    <th>Description / Explanation</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    if (tbl.fields.length === 0) {
                        docHtml += `<tr><td colspan="6" style="text-align:center; color:#64748b;">No direct dictionary attributes modified on this table.</td></tr>`;
                    } else {
                        tbl.fields.forEach(f => {
                            const fDesc = this.generateComponentDescription(f, 'Dictionary Field');
                            docHtml += `
                                <tr>
                                    <td>${this.escapeHtml(f.label)}</td>
                                    <td><code>${this.escapeHtml(f.element)}</code></td>
                                    <td>${this.escapeHtml(f.type)}</td>
                                    <td>${f.maxLength}</td>
                                    <td>${f.mandatory ? 'Yes' : 'No'}</td>
                                    <td>${fDesc}</td>
                                </tr>
                            `;
                        });
                    }

                    docHtml += `
                            </tbody>
                        </table>
                    `;
                });
            }

            // SECTION 4: SERVER SIDE LOGIC
            docHtml += `
                <!-- SECTION 4: SERVER LOGIC -->
                <h1>4. Business Logic, Client Scripts & Code</h1>
                <p>This section covers server-side logic rules, script includes, global client scripts, and custom UI action actions. Highlights showing the first 10 lines or scripting comment blocks are included.</p>
            `;

            if (reg.scriptIncludes.length === 0 && reg.businessRules.length === 0 && reg.uiActions.length === 0 && reg.clientScripts.length === 0) {
                docHtml += "<p>No custom server logic scripts, Script Includes, Client Scripts, or UI Actions were configured in this package.</p>";
            } else {
                const renderDocxCode = (script) => {
                    if (!script) return "";
                    const lines = script.trim().split("\n");
                    const snippet = lines.slice(0, 10).join("\n") + (lines.length > 10 ? "\n\n// ... [Code Truncated for Snippet] ..." : "");
                    return `<pre class="code-snippet">${this.escapeHtml(snippet)}</pre>`;
                };

                if (reg.scriptIncludes.length > 0) {
                    docHtml += "<h2>4.1 Script Includes</h2>";
                    reg.scriptIncludes.forEach(si => {
                        const siDesc = this.generateComponentDescription(si, 'Script Include');
                        docHtml += `
                            <h3>Script Include: ${this.escapeHtml(si.name)}</h3>
                            <p><strong>API Name:</strong> <code>${this.escapeHtml(si.apiName)}</code> | <strong>Active:</strong> ${si.active ? 'Yes' : 'No'}</p>
                            <p style="font-size:10pt; color:#334155; line-height:1.45; margin-bottom:4px;"><strong>Explanation:</strong> ${siDesc}</p>
                            <p><strong>Description:</strong> ${this.escapeHtml(si.description || 'No description provided.')}</p>
                            ${renderDocxCode(si.script)}
                        `;
                    });
                }

                if (reg.businessRules.length > 0) {
                    docHtml += "<h2>4.2 Business Rules (BRs)</h2>";
                    reg.businessRules.forEach(br => {
                        const brDesc = this.generateComponentDescription(br, 'Business Rule');
                        docHtml += `
                            <h3>Business Rule: ${this.escapeHtml(br.name)}</h3>
                            <p><strong>Target Table:</strong> <code>${this.escapeHtml(br.table)}</code> | <strong>When:</strong> ${this.escapeHtml(br.when)} | <strong>Active:</strong> ${br.active ? 'Yes' : 'No'}</p>
                            <p style="font-size:10pt; color:#334155; line-height:1.45; margin-bottom:4px;"><strong>Explanation:</strong> ${brDesc}</p>
                            <p><strong>Trigger Condition:</strong> <code>${this.escapeHtml(br.condition || 'None')}</code></p>
                            ${renderDocxCode(br.script)}
                        `;
                    });
                }

                if (reg.uiActions.length > 0) {
                    docHtml += "<h2>4.3 UI Actions</h2>";
                    reg.uiActions.forEach(ua => {
                        const uaDesc = this.generateComponentDescription(ua, 'UI Action');
                        docHtml += `
                            <h3>UI Action: ${this.escapeHtml(ua.name)}</h3>
                            <p><strong>Table:</strong> <code>${this.escapeHtml(ua.table)}</code> | <strong>Form Button:</strong> ${ua.formButton ? 'Yes' : 'No'} | <strong>Active:</strong> ${ua.active ? 'Yes' : 'No'}</p>
                            <p style="font-size:10pt; color:#334155; line-height:1.45; margin-bottom:4px;"><strong>Explanation:</strong> ${uaDesc}</p>
                            <p><strong>Condition:</strong> <code>${this.escapeHtml(ua.condition || 'None')}</code></p>
                            ${renderDocxCode(ua.script)}
                        `;
                    });
                }

                if (reg.clientScripts.length > 0) {
                    docHtml += "<h2>4.4 Client Scripts</h2>";
                    reg.clientScripts.forEach(cs => {
                        const csDesc = this.generateComponentDescription(cs, 'Client Script');
                        docHtml += `
                            <h3>Client Script: ${this.escapeHtml(cs.name)}</h3>
                            <p><strong>Table:</strong> <code>${this.escapeHtml(cs.table)}</code> | <strong>Type:</strong> ${cs.type} | <strong>Active:</strong> ${cs.active ? 'Yes' : 'No'}</p>
                            <p style="font-size:10pt; color:#334155; line-height:1.45; margin-bottom:4px;"><strong>Explanation:</strong> ${csDesc}</p>
                            ${renderDocxCode(cs.script)}
                        `;
                    });
                }
            }

            // SECTION 5: WORKFLOWS / FLOWS
            docHtml += `
                <!-- SECTION 5: FLOWS -->
                <h1>5. Workflows, Flows & SLA Rules</h1>
                <p>This section details the custom Flows configured via Flow Designer and the service level rules configured under SLA definitions.</p>
            `;

            const flows = Object.values(reg.flows);
            if (flows.length === 0 && reg.slas.length === 0) {
                docHtml += "<p>No custom flows or SLA configurations were deployed in this package.</p>";
            } else {
                flows.forEach(flow => {
                    const flowDesc = this.generateComponentDescription(flow, 'Flow');
                    docHtml += `
                        <h2>5.${flows.indexOf(flow) + 1} Flow: ${this.escapeHtml(flow.name)}</h2>
                        <p><strong>Internal Name:</strong> <code>${this.escapeHtml(flow.internalName)}</code> | <strong>Active:</strong> ${flow.active ? 'Yes' : 'No'} | <strong>Run As:</strong> ${flow.runAs}</p>
                        <p style="font-size:10.5pt; color:#334155; line-height:1.45; margin-bottom:8pt;"><strong>Flow Description:</strong> ${flowDesc}</p>
                        <p><strong>Trigger Type:</strong> ${this.escapeHtml(flow.trigger)}</p>
                        
                        <h3>Detailed Step Breakdown</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width:70px;">Step</th>
                                    <th style="width:200px;">Action / Operation</th>
                                    <th>Comments / Execution Context</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    if (flow.actions.length === 0) {
                        docHtml += `<tr><td colspan="3" style="text-align:center; color:#64748b;">No direct actions defined on this flow.</td></tr>`;
                    } else {
                        flow.actions.forEach(a => {
                            docHtml += `
                                <tr>
                                    <td><strong>${a.order}</strong></td>
                                    <td>${this.escapeHtml(a.type)}</td>
                                    <td><em>${this.escapeHtml(a.comment || 'N/A')}</em></td>
                                </tr>
                            `;
                        });
                    }

                    docHtml += `
                            </tbody>
                        </table>
                    `;
                });

                if (reg.slas.length > 0) {
                    docHtml += `
                        <h2>5.${flows.length + 1} SLA Definitions</h2>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Table</th>
                                    <th>Duration</th>
                                    <th>Start Condition</th>
                                    <th>Stop Condition</th>
                                    <th>Description / Explanation</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    reg.slas.forEach(s => {
                        const sDesc = this.generateComponentDescription(s, 'SLA Definition');
                        docHtml += `
                            <tr>
                                <td>${this.escapeHtml(s.name)}</td>
                                <td><code>${this.escapeHtml(s.table)}</code></td>
                                <td>${this.escapeHtml(s.duration)}</td>
                                <td><code>${this.escapeHtml(s.startCondition)}</code></td>
                                <td><code>${this.escapeHtml(s.stopCondition)}</code></td>
                                <td>${sDesc}</td>
                            </tr>
                        `;
                    });
                    docHtml += `
                            </tbody>
                        </table>
                    `;
                }
            }

            // SECTION 6: INTEGRATIONS & NOTIFICATIONS
            docHtml += `
                <!-- SECTION 6: INTEGRATIONS -->
                <h1>6. Integrations & Notifications</h1>
                <p>This section outlines outbound integration endpoints, rest messages, triggered email notifications, and communication templates deployed.</p>
            `;

            const restList = Object.values(reg.restMessages);
            if (restList.length === 0 && reg.notifications.length === 0) {
                docHtml += "<p>No custom web service integrations or email notifications were configured in this package.</p>";
            } else {
                if (restList.length > 0) {
                    docHtml += "<h2>6.1 Outbound REST Integrations</h2>";
                    restList.forEach(rm => {
                        docHtml += `
                            <h3>REST Message: ${this.escapeHtml(rm.name)}</h3>
                            <p><strong>Base Endpoint:</strong> <code>${this.escapeHtml(rm.endpoint)}</code> | <strong>Authentication:</strong> ${this.escapeHtml(rm.authType)}</p>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width:100px;">HTTP Method</th>
                                        <th style="width:150px;">Function Name</th>
                                        <th>Target Endpoint / URI</th>
                                        <th>Description / Explanation</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;
                        if (rm.methods.length === 0) {
                            docHtml += `<tr><td colspan="4" style="text-align:center; color:#64748b;">No methods defined.</td></tr>`;
                        } else {
                            rm.methods.forEach(m => {
                                const mDesc = this.generateComponentDescription(m, 'REST Message Function');
                                docHtml += `
                                    <tr>
                                        <td><strong>${this.escapeHtml(m.method)}</strong></td>
                                        <td>${this.escapeHtml(m.name)}</td>
                                        <td><code>${this.escapeHtml(m.endpoint)}</code></td>
                                        <td>${mDesc}</td>
                                    </tr>
                                `;
                            });
                        }
                        docHtml += `
                                </tbody>
                            </table>
                        `;
                    });
                }

                if (reg.notifications.length > 0) {
                    docHtml += "<h2>6.2 Triggered Email Notifications</h2>";
                    docHtml += `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Notification Name</th>
                                    <th>Target Table</th>
                                    <th>Trigger Event / Action</th>
                                    <th>Description / Explanation</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    reg.notifications.forEach(n => {
                        const nDesc = this.generateComponentDescription(n, 'Email Notification');
                        docHtml += `
                            <tr>
                                <td><strong>${this.escapeHtml(n.name)}</strong></td>
                                <td><code>${this.escapeHtml(n.table)}</code></td>
                                <td><code>${this.escapeHtml(n.event || 'Record update')}</code></td>
                                <td>${nDesc}<br/><br/>Subject: "${this.escapeHtml(n.subject)}"<br/>Recipients: ${this.escapeHtml(n.recipients)}</td>
                            </tr>
                        `;
                    });
                    docHtml += `
                            </tbody>
                        </table>
                    `;
                }
            }

            // SECTION 7: SECURITY & MISC
            docHtml += `
                <!-- SECTION 7: SECURITY -->
                <h1>7. Security Roles & System Properties</h1>
                <p>This section outlines security access definitions (ACL rules), system settings properties, and miscellaneous configuration entities configured.</p>
            `;

            if (reg.acls.length === 0 && reg.sysProperties.length === 0 && reg.otherConfigs.length === 0) {
                docHtml += "<p>No custom system properties, ACL definitions, or roles were deployed in this package.</p>";
            } else {
                if (reg.acls.length > 0) {
                    docHtml += "<h2>7.1 Access Control List (ACL) Rules</h2>";
                    docHtml += `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Target Resource</th>
                                    <th>Required Roles</th>
                                    <th>Operations</th>
                                    <th>Description / Explanation</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    reg.acls.forEach(a => {
                        const aDesc = this.generateComponentDescription(a, 'Access Control (ACL)');
                        docHtml += `
                            <tr>
                                <td><code>${this.escapeHtml(a.name)}</code></td>
                                <td>${this.escapeHtml(a.roles)}</td>
                                <td>${this.escapeHtml(a.operation)}</td>
                                <td>${aDesc}</td>
                            </tr>
                        `;
                    });
                    docHtml += `
                            </tbody>
                        </table>
                    `;
                }

                if (reg.sysProperties.length > 0) {
                    docHtml += "<h2>7.2 Custom System Properties</h2>";
                    docHtml += `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Property Name</th>
                                    <th>Description / Explanation</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    reg.sysProperties.forEach(p => {
                        const pDesc = this.generateComponentDescription(p, 'System Property');
                        docHtml += `
                            <tr>
                                <td><code>${this.escapeHtml(p.name)}</code></td>
                                <td>${pDesc}</td>
                                <td><code>${this.escapeHtml(p.value)}</code></td>
                            </tr>
                        `;
                    });
                    docHtml += `
                            </tbody>
                        </table>
                    `;
                }

                if (reg.otherConfigs.length > 0) {
                    docHtml += "<h2>7.3 Miscellaneous System Modifications</h2>";
                    docHtml += `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Configuration Tag</th>
                                    <th>Action</th>
                                    <th>Description / Explanation</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    reg.otherConfigs.forEach(oc => {
                        const ocDesc = this.generateComponentDescription(oc, oc.type);
                        docHtml += `
                            <tr>
                                <td><span class="badge-us-type other">${this.escapeHtml(oc.type)}</span></td>
                                <td><code>${this.escapeHtml(oc.name)}</code></td>
                                <td>${this.escapeHtml(oc.action || 'INSERT_OR_UPDATE')}</td>
                                <td>${ocDesc}</td>
                            </tr>
                        `;
                    });
                    docHtml += `
                            </tbody>
                        </table>
                    `;
                }
            }

            docHtml += `
            </div>
            </body>
            </html>
            `;

            // 2. Download docx file using standard download blob helpers
            const filename = `${reg.metadata.name.replace(/[^a-zA-Z0-9]/g, "_")}_LLD.doc`;
            const blob = new Blob([docHtml], { type: "application/msword" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatus("Word LLD Document downloaded successfully!");
        }
    };
})();
