import { SNOW_API } from '../api';
import { SNOW_Bridge } from '../bridge';

export const CatalogCloner = {
        init: function () {
            const clonerSourceTable = (document.getElementById('clonerSourceTable') as HTMLInputElement);
            const clonerSourceSysId = (document.getElementById('clonerSourceSysId') as HTMLInputElement);
            const clonerSourceName = (document.getElementById('clonerSourceName') as HTMLInputElement);
            const btnDetectClonerSource = (document.getElementById('btnDetectClonerSource') as HTMLButtonElement);
            const clonerNewName = (document.getElementById('clonerNewName') as HTMLInputElement);
            const clonerScopeSelect = (document.getElementById('clonerScopeSelect') as HTMLSelectElement);
            const btnRunClone = (document.getElementById('btnRunClone') as HTMLButtonElement);
            const clonerResultsBox = document.getElementById('clonerResultsBox');
            const clonerOutput = document.getElementById('clonerOutput');

            if (!clonerSourceSysId || !btnRunClone) return;

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
                    } catch (err) {
                        alert("Auto-detect failed: " + err.message);
                    } finally {
                        btnDetectClonerSource.textContent = "Auto-Detect";
                    }
                });
            }

            btnRunClone.addEventListener('click', async () => {
                const sourceId = clonerSourceSysId.value.trim();
                const table = clonerSourceTable.value.trim();
                const newName = clonerNewName.value.trim();
                const scope = clonerScopeSelect.value;

                if (!sourceId || !table) {
                    return alert("Please select or auto-detect a source Catalog Item first.");
                }
                
                const scTables = ['sc_cat_item', 'sc_cat_item_producer', 'sc_cat_item_guide', 'sc_cat_item_content', 'std_change_record_producer', 'pc_hardware_cat_item'];
                const isValidTable = scTables.includes(table) || table.startsWith('sc_cat_item');
                if (!isValidTable) {
                    return alert(`Invalid Table: "${table}". The Catalog Item Cloner only supports cloning catalog item records (e.g., sc_cat_item, sc_cat_item_producer, sc_cat_item_guide).`);
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
                            clonerOutput.innerHTML += `\n\n<a href="${newUrl}" target="_blank" style="color: #16a34a; text-decoration: underline; font-weight: bold;">Open Cloned Item Form in Browser</a>`;
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
    };
