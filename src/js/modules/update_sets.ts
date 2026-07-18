import { SNOW_API } from '../api';
import { SNOW_Bridge } from '../bridge';

export const UpdateSetManager = {
        scopesLoaded: false,
        currentScopeId: 'global',

        init: function () {
            const scopeSelect = (document.getElementById('scopeSelect') as HTMLSelectElement);
            const updateSetSelect = (document.getElementById('updateSetSelect') as HTMLSelectElement);
            const scopeSearch = (document.getElementById('scopeSearch') as HTMLInputElement);
            const updateSetSearch = (document.getElementById('updateSetSearch') as HTMLInputElement);
            const btnApplyUpdateSet = (document.getElementById('btnApplyUpdateSet') as HTMLButtonElement);
            const updateSetStatus = document.getElementById('updateSetStatus');

            if (!scopeSelect || !updateSetSelect) return;

            if (scopeSearch) {
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

            if (updateSetSearch) {
                updateSetSearch.addEventListener('input', (e) => {
                    const term = (e.target as HTMLInputElement).value.trim();
                    clearTimeout(window.usTimer);
                    window.usTimer = setTimeout(async () => {
                        updateSetSelect.innerHTML = '<option>Searching server...</option>';
                        updateSetSelect.disabled = true;
                        
                        try {
                            const results = await SNOW_API.fetchUpdateSets(this.currentScopeId, term, 20);
                            updateSetSelect.innerHTML = '';
                            
                            if (results.length === 0) {
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

            scopeSelect.addEventListener('change', (e) => this.loadUpdateSets((e.target as HTMLInputElement).value));

            if (btnApplyUpdateSet) {
                btnApplyUpdateSet.addEventListener('click', async () => {
                    const scopeId = scopeSelect.value;
                    const updateSetId = updateSetSelect.value;

                    btnApplyUpdateSet.textContent = "Applying...";
                    btnApplyUpdateSet.disabled = true;
                    if (updateSetStatus) updateSetStatus.textContent = "";

                    try {
                        await SNOW_API.setUpdateSetAndScope(scopeId, updateSetId);
                        
                        if (updateSetStatus) {
                            updateSetStatus.style.color = "#2e7d32";
                            updateSetStatus.textContent = "Success! Refreshing page...";
                        }

                        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                            if (tabs[0]) if (tabs[0] && tabs[0].id !== undefined) chrome.tabs.reload(tabs[0].id);
                        });
                        
                        setTimeout(() => window.close(), 1000);

                    } catch (error: any) {
                        if (updateSetStatus) {
                            updateSetStatus.style.color = "#c62828";
                            updateSetStatus.textContent = "Error: " + error.message;
                        }
                        btnApplyUpdateSet.textContent = "Apply Changes";
                        btnApplyUpdateSet.disabled = false;
                    }
                });
            }
        },

        populateScopeDropdowns: function (scopes) {
            const scopeSelect = (document.getElementById('scopeSelect') as HTMLSelectElement);
            const clonerScopeSelect = (document.getElementById('clonerScopeSelect') as HTMLSelectElement);
            const scopeSearch = (document.getElementById('scopeSearch') as HTMLInputElement);

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
        },

        loadScopes: async function () {
            const scopeSelect = (document.getElementById('scopeSelect') as HTMLSelectElement);
            const clonerScopeSelect = (document.getElementById('clonerScopeSelect') as HTMLSelectElement);

            try {
                if (scopeSelect) scopeSelect.innerHTML = '<option>Loading...</option>';
                if (clonerScopeSelect) clonerScopeSelect.innerHTML = '<option>Loading...</option>';
                const scopes = await SNOW_API.fetchScopes();
                
                this.populateScopeDropdowns(scopes);
                this.scopesLoaded = true;

                if (scopeSelect) {
                    this.loadUpdateSets(scopeSelect.value);
                }
            } catch (error: any) {
                if (scopeSelect) scopeSelect.innerHTML = `<option>Error loading scopes</option>`;
                if (clonerScopeSelect) clonerScopeSelect.innerHTML = `<option>Error loading scopes</option>`;
            }
        },

        async loadUpdateSets(scopeId: string) {
            const updateSetSelect = (document.getElementById('updateSetSelect') as HTMLSelectElement);
            const updateSetSearch = (document.getElementById('updateSetSearch') as HTMLInputElement);
            const btnApplyUpdateSet = (document.getElementById('btnApplyUpdateSet') as HTMLButtonElement);

            try {
                this.currentScopeId = scopeId;
                if (updateSetSelect) {
                    updateSetSelect.innerHTML = '<option>Loading initial 20 records...</option>';
                    updateSetSelect.disabled = true;
                }
                if (updateSetSearch) {
                    updateSetSearch.disabled = true;
                    updateSetSearch.value = ""; 
                }
                if (btnApplyUpdateSet) btnApplyUpdateSet.disabled = true;

                const updateSets = await SNOW_API.fetchUpdateSets(scopeId, "", 20);
                
                if (updateSetSelect) {
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
                        if (updateSetSearch) updateSetSearch.disabled = false;
                        if (btnApplyUpdateSet) btnApplyUpdateSet.disabled = false;
                    }
                }
            } catch (error: any) {
                if (updateSetSelect) updateSetSelect.innerHTML = `<option>Error loading update sets</option>`;
            }
        }
    };
