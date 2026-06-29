(function () {
    window.UpdateSetManager = {
        scopesLoaded: false,
        currentScopeId: 'global',

        init: function () {
            const scopeSelect = document.getElementById('scopeSelect');
            const updateSetSelect = document.getElementById('updateSetSelect');
            const scopeSearch = document.getElementById('scopeSearch');
            const updateSetSearch = document.getElementById('updateSetSearch');
            const btnApplyUpdateSet = document.getElementById('btnApplyUpdateSet');
            const updateSetStatus = document.getElementById('updateSetStatus');

            if (!scopeSelect || !updateSetSelect) return;

            if (scopeSearch) {
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

            if (updateSetSearch) {
                updateSetSearch.addEventListener('input', (e) => {
                    const term = e.target.value.trim();
                    clearTimeout(window.usTimer);
                    window.usTimer = setTimeout(async () => {
                        updateSetSelect.innerHTML = '<option>Searching server...</option>';
                        updateSetSelect.disabled = true;
                        
                        try {
                            const results = await window.SNOW_API.fetchUpdateSets(this.currentScopeId, term, 20);
                            updateSetSelect.innerHTML = '';
                            
                            if (results.length === 0) {
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

            scopeSelect.addEventListener('change', (e) => this.loadUpdateSets(e.target.value));

            if (btnApplyUpdateSet) {
                btnApplyUpdateSet.addEventListener('click', async () => {
                    const scopeId = scopeSelect.value;
                    const updateSetId = updateSetSelect.value;

                    btnApplyUpdateSet.textContent = "Applying...";
                    btnApplyUpdateSet.disabled = true;
                    if (updateSetStatus) updateSetStatus.textContent = "";

                    try {
                        await window.SNOW_API.setUpdateSetAndScope(scopeId, updateSetId);
                        
                        if (updateSetStatus) {
                            updateSetStatus.style.color = "#2e7d32";
                            updateSetStatus.textContent = "Success! Refreshing page...";
                        }

                        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                            if (tabs[0]) chrome.tabs.reload(tabs[0].id);
                        });
                        
                        setTimeout(() => window.close(), 1000);

                    } catch (error) {
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
            const scopeSelect = document.getElementById('scopeSelect');
            const clonerScopeSelect = document.getElementById('clonerScopeSelect');
            const scopeSearch = document.getElementById('scopeSearch');

            if (scopeSelect) {
                scopeSelect.innerHTML = '';
                scopes.forEach(scope => {
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
                scopes.forEach(scope => {
                    const opt = document.createElement('option');
                    opt.value = scope.sys_id;
                    opt.textContent = scope.name;
                    clonerScopeSelect.appendChild(opt);
                });
            }
        },

        loadScopes: async function () {
            const scopeSelect = document.getElementById('scopeSelect');
            const clonerScopeSelect = document.getElementById('clonerScopeSelect');

            try {
                if (scopeSelect) scopeSelect.innerHTML = '<option>Loading...</option>';
                if (clonerScopeSelect) clonerScopeSelect.innerHTML = '<option>Loading...</option>';
                const scopes = await window.SNOW_API.fetchScopes();
                
                this.populateScopeDropdowns(scopes);
                this.scopesLoaded = true;

                if (scopeSelect) {
                    this.loadUpdateSets(scopeSelect.value);
                }
            } catch (error) {
                if (scopeSelect) scopeSelect.innerHTML = `<option>Error loading scopes</option>`;
                if (clonerScopeSelect) clonerScopeSelect.innerHTML = `<option>Error loading scopes</option>`;
            }
        },

        loadUpdateSets: async function (scopeId) {
            const updateSetSelect = document.getElementById('updateSetSelect');
            const updateSetSearch = document.getElementById('updateSetSearch');
            const btnApplyUpdateSet = document.getElementById('btnApplyUpdateSet');

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

                const updateSets = await window.SNOW_API.fetchUpdateSets(scopeId, "", 20);
                
                if (updateSetSelect) {
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
                        if (updateSetSearch) updateSetSearch.disabled = false;
                        if (btnApplyUpdateSet) btnApplyUpdateSet.disabled = false;
                    }
                }
            } catch (error) {
                if (updateSetSelect) updateSetSelect.innerHTML = `<option>Error loading update sets</option>`;
            }
        }
    };
})();
