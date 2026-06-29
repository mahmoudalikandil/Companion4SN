(function () {
    window.BulkBuilderManager = {
        bulkMetadata: {
            scopes: [],
            categories: [],
            variableSets: []
        },
        bulkPayload: null,
        validationErrors: [],

        init: function () {
            const btnDownloadBulkTemplate = document.getElementById('btnDownloadBulkTemplate');
            const bulkDropzone = document.getElementById('bulkDropzone');
            const bulkFileInput = document.getElementById('bulkFileInput');
            const btnRunBulkDryRun = document.getElementById('btnRunBulkDryRun');
            const btnCommitBulk = document.getElementById('btnCommitBulk');

            if (!btnDownloadBulkTemplate && !bulkDropzone && !bulkFileInput) return;

            if (btnDownloadBulkTemplate) {
                btnDownloadBulkTemplate.addEventListener('click', async () => {
                    try {
                        btnDownloadBulkTemplate.textContent = "Downloading...";
                        btnDownloadBulkTemplate.disabled = true;

                        const response = await fetch(chrome.runtime.getURL('templates/ServiceNow_Bulk_Catalog_Items_Template.xlsx'));
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'ServiceNow_Bulk_Catalog_Items_Template.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    } catch (err) {
                        alert("Failed to download template: " + err.message);
                    } finally {
                        btnDownloadBulkTemplate.textContent = "Download Excel Template";
                        btnDownloadBulkTemplate.disabled = false;
                    }
                });
            }

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
                    if (e.dataTransfer.files.length > 0) {
                        this.processExcelFile(e.dataTransfer.files[0]);
                    }
                });
            }

            if (bulkFileInput) {
                bulkFileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.processExcelFile(e.target.files[0]);
                    }
                });
            }

            if (btnRunBulkDryRun) {
                btnRunBulkDryRun.addEventListener('click', () => this.executeBulkBuild(true));
            }

            if (btnCommitBulk) {
                btnCommitBulk.addEventListener('click', () => this.executeBulkBuild(false));
            }
        },

        loadBulkBuilderMetadata: async function () {
            if (!window.activeInstanceData) return;
            try {
                const [scopes, categories, variableSets] = await Promise.all([
                    window.SNOW_API.fetchScopes(),
                    window.SNOW_API.fetchCategories(),
                    window.SNOW_API.fetchVariableSets()
                ]);
                this.bulkMetadata.scopes = scopes;
                this.bulkMetadata.categories = categories;
                this.bulkMetadata.variableSets = variableSets;

                if (window.UpdateSetManager) {
                    window.UpdateSetManager.populateScopeDropdowns(scopes);
                    window.UpdateSetManager.scopesLoaded = true;
                    const scopeSelect = document.getElementById('scopeSelect');
                    if (scopeSelect && scopeSelect.value) {
                        window.UpdateSetManager.loadUpdateSets(scopeSelect.value);
                    }
                }
            } catch (e) {
                console.warn('[Bulk Builder] Error caching metadata: ', e);
            }
        },

        processExcelFile: function (file) {
            if (!file) return;
            const reader = new FileReader();
            const bulkDropzoneText = document.getElementById('bulkDropzoneText');
            if (bulkDropzoneText) bulkDropzoneText.textContent = `Reading ${file.name}...`;

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const payload = {
                        items: [],
                        variables: [],
                        variable_sets: [],
                        ui_policies: []
                    };

                    if (workbook.Sheets['Catalog Items']) {
                        payload.items = this.normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['Catalog Items']));
                    }
                    if (workbook.Sheets['Variables']) {
                        payload.variables = this.normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['Variables']));
                    }
                    if (workbook.Sheets['Variable Sets']) {
                        payload.variable_sets = this.normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['Variable Sets']));
                    }
                    if (workbook.Sheets['UI Policies']) {
                        payload.ui_policies = this.normalizeParsedData(XLSX.utils.sheet_to_json(workbook.Sheets['UI Policies']));
                    }

                    if (bulkDropzoneText) bulkDropzoneText.textContent = `Loaded: ${file.name} (Items: ${payload.items.length})`;
                    this.validateUploadedData(payload);
                } catch (err) {
                    if (bulkDropzoneText) bulkDropzoneText.textContent = "Drag & drop completed template Excel sheet, or click to upload";
                    alert("Failed to parse Excel file. Ensure it is a valid .xlsx template file. Details: " + err.message);
                }
            };

            reader.readAsArrayBuffer(file);
        },

        normalizeParsedData: function (sheetData) {
            if (!sheetData) return [];
            return sheetData.map(row => {
                const normalized = {};
                for (let key in row) {
                    const trimmedKey = String(key).trim();
                    let val = row[key];
                    if (typeof val === 'string') val = val.trim();
                    normalized[trimmedKey] = val;
                }
                return normalized;
            });
        },

        validateUploadedData: function (payload) {
            this.bulkPayload = payload;
            this.validationErrors = [];
            const btnCommitBulk = document.getElementById('btnCommitBulk');
            const btnRunBulkDryRun = document.getElementById('btnRunBulkDryRun');

            if (btnCommitBulk) {
                btnCommitBulk.disabled = true;
            }

            const items = payload.items || [];
            const variables = payload.variables || [];
            const varSets = payload.variable_sets || [];
            const uiPolicies = payload.ui_policies || [];

            if (items.length === 0) {
                this.validationErrors.push({ sheet: 'Catalog Items', index: -1, field: 'Catalog Items Sheet', value: '', error: 'Sheet is empty or missing.' });
            }

            const isYesNo = (val) => {
                if (val === undefined || val === null || val === '') return true;
                const s = String(val).toLowerCase().trim();
                return s === 'yes' || s === 'no' || s === 'true' || s === 'false';
            };

            const isYesNoLeave = (val) => {
                if (val === undefined || val === null || val === '') return true;
                const s = String(val).toLowerCase().trim();
                return s === 'yes' || s === 'no' || s === 'leave' || s === 'true' || s === 'false';
            };

            const isInteger = (val) => {
                if (val === undefined || val === null || val === '') return true;
                return !isNaN(parseInt(val, 10));
            };

            const itemTempIds = new Set();
            items.forEach((item, index) => {
                const tempIdStr = String(item['Temp ID'] || '').trim();
                if (!tempIdStr) {
                    this.validationErrors.push({ sheet: 'Catalog Items', index, field: 'Temp ID', value: '', error: 'Temp ID is mandatory.' });
                } else {
                    itemTempIds.add(tempIdStr);
                }

                if (!item['Name']) {
                    this.validationErrors.push({ sheet: 'Catalog Items', index, field: 'Name', value: '', error: 'Catalog Item Name is mandatory.' });
                }

                if (!isYesNo(item['Active'])) {
                    this.validationErrors.push({ sheet: 'Catalog Items', index, field: 'Active', value: item['Active'], error: "Active must be 'Yes' or 'No'." });
                }

                if (!isInteger(item['Order'])) {
                    this.validationErrors.push({ sheet: 'Catalog Items', index, field: 'Order', value: item['Order'], error: 'Order must be a valid number.' });
                }

                if (!isYesNo(item['Hide on Portal'])) {
                    this.validationErrors.push({ sheet: 'Catalog Items', index, field: 'Hide on Portal', value: item['Hide on Portal'], error: "Hide on Portal must be 'Yes' or 'No'." });
                }
            });

            variables.forEach((v, index) => {
                const itemTempId = String(v['Item Temp ID'] || '').trim();
                if (!itemTempId) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Item Temp ID', value: '', error: 'Item Temp ID is mandatory.' });
                } else if (!itemTempIds.has(itemTempId)) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Item Temp ID', value: itemTempId, error: `Item Temp ID "${itemTempId}" does not exist in Catalog Items sheet.` });
                }

                if (!v['Name']) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Name', value: '', error: 'Variable Name is mandatory.' });
                } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v['Name'])) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Name', value: v['Name'], error: 'Name must be alphanumeric starting with letter/underscore.' });
                }

                const qText = (v['Question'] || v['Label'] || '').trim();
                if (!qText) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Question', value: '', error: 'Question is mandatory.' });
                }

                const type = (v['Type'] || '').trim();
                if (!type) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Type', value: '', error: 'Type is mandatory.' });
                } else {
                    const validTypes = [
                        'single line text', 'multi line text', 'wide single line text', 'select box',
                        'multiple choice', 'reference', 'checkbox', 'yes/no', 'date', 'date/time',
                        'integer', 'html', 'lookup select box', 'list collector', 'attachment',
                        '1', '2', '3', '5', '6', '7', '8', '9', '10', '15', '16', '18', '21', '23', '33'
                    ];
                    if (!validTypes.includes(type.toLowerCase())) {
                        this.validationErrors.push({ sheet: 'Variables', index, field: 'Type', value: type, error: 'Invalid variable type.' });
                    }
                }

                if (!isYesNo(v['Active'])) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Active', value: v['Active'], error: "Active must be 'Yes' or 'No'." });
                }

                if (!isYesNo(v['Mandatory'])) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Mandatory', value: v['Mandatory'], error: "Mandatory must be 'Yes' or 'No'." });
                }

                if (!isInteger(v['Order'])) {
                    this.validationErrors.push({ sheet: 'Variables', index, field: 'Order', value: v['Order'], error: 'Order must be a valid number.' });
                }
            });

            varSets.forEach((vs, index) => {
                const itemTempId = String(vs['Item Temp ID'] || '').trim();
                if (!itemTempId) {
                    this.validationErrors.push({ sheet: 'Variable Sets', index, field: 'Item Temp ID', value: '', error: 'Item Temp ID is mandatory.' });
                } else if (!itemTempIds.has(itemTempId)) {
                    this.validationErrors.push({ sheet: 'Variable Sets', index, field: 'Item Temp ID', value: itemTempId, error: `Item Temp ID "${itemTempId}" does not exist in Catalog Items sheet.` });
                }

                if (!vs['Variable Set Name']) {
                    this.validationErrors.push({ sheet: 'Variable Sets', index, field: 'Variable Set Name', value: '', error: 'Variable Set Name/Title is mandatory.' });
                }

                if (!isInteger(vs['Order'])) {
                    this.validationErrors.push({ sheet: 'Variable Sets', index, field: 'Order', value: vs['Order'], error: 'Order must be a valid number.' });
                }
            });

            uiPolicies.forEach((pol, index) => {
                const itemTempId = String(pol['Item Temp ID'] || '').trim();
                if (!itemTempId) {
                    this.validationErrors.push({ sheet: 'UI Policies', index, field: 'Item Temp ID', value: '', error: 'Item Temp ID is mandatory.' });
                } else if (!itemTempIds.has(itemTempId)) {
                    this.validationErrors.push({ sheet: 'UI Policies', index, field: 'Item Temp ID', value: itemTempId, error: `Item Temp ID "${itemTempId}" does not exist in Catalog Items sheet.` });
                }

                if (!pol['Short Description']) {
                    this.validationErrors.push({ sheet: 'UI Policies', index, field: 'Short Description', value: '', error: 'Short Description is mandatory.' });
                }

                if (!isYesNoLeave(pol['Mandatory'])) {
                    this.validationErrors.push({ sheet: 'UI Policies', index, field: 'Mandatory', value: pol['Mandatory'], error: "Mandatory must be 'Yes', 'No', or 'Leave'." });
                }

                if (!isYesNoLeave(pol['Read Only'])) {
                    this.validationErrors.push({ sheet: 'UI Policies', index, field: 'Read Only', value: pol['Read Only'], error: "Read Only must be 'Yes', 'No', or 'Leave'." });
                }

                if (!isYesNoLeave(pol['Visible'])) {
                    this.validationErrors.push({ sheet: 'UI Policies', index, field: 'Visible', value: pol['Visible'], error: "Visible must be 'Yes', 'No', or 'Leave'." });
                }
            });

            this.renderValidationErrors();
        },

        renderValidationErrors: function () {
            const bulkErrorArea = document.getElementById('bulkErrorArea');
            const bulkErrorBody = document.getElementById('bulkErrorBody');
            const bulkErrorCount = document.getElementById('bulkErrorCount');
            const btnRunBulkDryRun = document.getElementById('btnRunBulkDryRun');
            const btnCommitBulk = document.getElementById('btnCommitBulk');

            if (!bulkErrorArea || !bulkErrorBody || !bulkErrorCount) return;

            if (this.validationErrors.length === 0) {
                bulkErrorArea.classList.add('hidden');
                bulkErrorBody.innerHTML = '';
                bulkErrorCount.textContent = '0';
                
                if (btnRunBulkDryRun) {
                    btnRunBulkDryRun.disabled = !(this.bulkPayload && this.bulkPayload.items && this.bulkPayload.items.length > 0);
                }
                return;
            }

            if (btnRunBulkDryRun) btnRunBulkDryRun.disabled = true;
            if (btnCommitBulk) btnCommitBulk.disabled = true;
            
            bulkErrorCount.textContent = this.validationErrors.length;
            bulkErrorBody.innerHTML = '';

            this.validationErrors.forEach((err) => {
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
                        const newVal = e.target.value;
                        let targetArray = [];
                        if (err.sheet === 'Catalog Items') targetArray = this.bulkPayload.items;
                        else if (err.sheet === 'Variables') targetArray = this.bulkPayload.variables;
                        else if (err.sheet === 'Variable Sets') targetArray = this.bulkPayload.variable_sets;
                        else if (err.sheet === 'UI Policies') targetArray = this.bulkPayload.ui_policies;

                        if (targetArray[err.index]) {
                            targetArray[err.index][err.field] = newVal;
                            this.validateUploadedData(this.bulkPayload);
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
        },

        executeBulkBuild: async function (isDryRun) {
            if (!this.bulkPayload) return;

            const btnRunBulkDryRun = document.getElementById('btnRunBulkDryRun');
            const btnCommitBulk = document.getElementById('btnCommitBulk');
            const bulkResultsBox = document.getElementById('bulkResultsBox');
            const bulkOutput = document.getElementById('bulkOutput');

            const targetBtn = isDryRun ? btnRunBulkDryRun : btnCommitBulk;
            if (!targetBtn || !bulkResultsBox || !bulkOutput) return;

            const initialText = targetBtn.textContent;
            targetBtn.textContent = isDryRun ? "Validating..." : "Committing...";
            targetBtn.disabled = true;
            
            if (btnRunBulkDryRun) btnRunBulkDryRun.disabled = true;
            if (btnCommitBulk) btnCommitBulk.disabled = true;
            
            bulkResultsBox.classList.remove('hidden');
            bulkOutput.textContent = isDryRun ? "[Dry Run] Submitting atomic transaction block to ServiceNow server...\n" : "[Commit] Submitting final transaction block to ServiceNow server...\n";

            try {
                const items = this.bulkPayload.items.map(item => ({
                    temp_id: item['Temp ID'],
                    name: item['Name'],
                    short_description: item['Short Description'] || '',
                    description: item['Description'] || '',
                    category: item['Category'] || '',
                    scope: item['Scope'] || 'global',
                    table: item['Table Class'] || 'sc_cat_item',
                    active: item['Active'] || 'Yes',
                    catalogs: item['Catalogs'] || 'Service Catalog',
                    order: item['Order'] || 100,
                    hide_portal: item['Hide on Portal'] || 'No'
                }));

                const variables = this.bulkPayload.variables.map(v => ({
                    item_temp_id: v['Item Temp ID'],
                    name: v['Name'],
                    label: v['Question'] || v['Label'] || '',
                    type: v['Type'] || 'Single Line Text',
                    order: v['Order'] || 100,
                    active: v['Active'] || 'Yes',
                    mandatory: v['Mandatory'] || 'No',
                    default_value: v['Default Value'] || '',
                    help_text: v['Help Text'] || '',
                    tooltip: v['Tooltip'] || '',
                    reference: v['Reference Table'] || '',
                    choices: v['Choices'] || ''
                }));

                const variableSets = this.bulkPayload.variable_sets.map(vs => ({
                    item_temp_id: vs['Item Temp ID'],
                    variable_set: vs['Variable Set Name'],
                    order: vs['Order'] || 100
                }));

                const uiPolicies = this.bulkPayload.ui_policies.map(pol => ({
                    item_temp_id: pol['Item Temp ID'],
                    short_description: pol['Short Description'],
                    conditions: pol['Conditions'] || '',
                    variable_name: pol['Variable Name'] || '',
                    mandatory: pol['Mandatory'] || 'Leave',
                    read_only: pol['Read Only'] || 'Leave',
                    visible: pol['Visible'] || 'Leave'
                }));

                const serverPayload = {
                    items,
                    variables,
                    variable_sets: variableSets,
                    ui_policies: uiPolicies
                };

                const output = await window.SNOW_API.bulkCreateCatalogItems(serverPayload, isDryRun);
                bulkOutput.textContent += output;

                const hasHardErrors = output.includes(">>>BULK_ERROR<<<") || output.includes("[ERROR] Script Execution Terminated:");

                if (output.includes(">>>DRY_RUN_PASSED<<<") && !hasHardErrors) {
                    bulkOutput.textContent += "\n[DRY RUN SUCCESS] The transaction was validated successfully and all database changes were aborted. You can now safely Commit.";
                    if (btnCommitBulk) btnCommitBulk.disabled = false;
                    if (btnRunBulkDryRun) btnRunBulkDryRun.disabled = false;
                } else if (output.includes(">>>BULK_SUCCESS<<<") && !hasHardErrors) {
                    bulkOutput.textContent += "\n[BULK BUILD SUCCESS] All Catalog Items and related lists successfully committed to database!\n";
                    
                    const sysIdMatches = [...output.matchAll(/Created Catalog Item: (.*?) \(sys_id: ([a-f0-9]{32})\)/g)];
                    if (sysIdMatches.length > 0) {
                        bulkOutput.textContent += "\n--- Created Catalog Items Links ---\n";
                        sysIdMatches.forEach(match => {
                            const name = match[1];
                            const sysId = match[2];
                            const url = `${window.activeInstanceData.url}/nav_to.do?uri=sc_cat_item.do?sys_id=${sysId}`;
                            bulkOutput.textContent += `${name}: ${url}\n`;
                        });
                    }
                    
                    if (btnCommitBulk) btnCommitBulk.disabled = true;
                    if (btnRunBulkDryRun) btnRunBulkDryRun.disabled = true;
                } else {
                    bulkOutput.textContent += "\n[TRANSACTION FAILED] Server transaction returned errors or aborted. Database rolled back.";
                    if (btnRunBulkDryRun) btnRunBulkDryRun.disabled = false;
                    if (btnCommitBulk) btnCommitBulk.disabled = true;
                }

            } catch (err) {
                bulkOutput.textContent += `\n[ERROR] Server communication failure: ${err.message}`;
                if (btnRunBulkDryRun) btnRunBulkDryRun.disabled = false;
                if (btnCommitBulk) btnCommitBulk.disabled = true;
            } finally {
                targetBtn.textContent = initialText;
            }
        }
    };
})();
