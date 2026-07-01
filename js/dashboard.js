document.addEventListener('DOMContentLoaded', () => {
    
    window.activeInstanceData = null;

    const btnConnect = document.getElementById('btnConnect');
    const connStatus = document.getElementById('connStatus');
    const toolNav = document.getElementById('toolNav');
    const navItems = document.querySelectorAll('.nav-list li');
    const toolPanels = document.querySelectorAll('.tool-panel');

    const flowSysIdInput = document.getElementById('flowSysIdInput');
    const btnTrackFlow = document.getElementById('btnTrackFlow');
    const flowTrackerStatus = document.getElementById('flowTrackerStatus');

    const clonerSourceTable = document.getElementById('clonerSourceTable');
    const clonerSourceSysId = document.getElementById('clonerSourceSysId');
    const clonerSourceName = document.getElementById('clonerSourceName');

    // Initialize all modules
    if (window.Impersonator) window.Impersonator.init();
    if (window.BgScriptExecutor) window.BgScriptExecutor.init();
    if (window.UpdateSetManager) window.UpdateSetManager.init();
    if (window.SchemaExporter) window.SchemaExporter.init();
    if (window.FlowTracker) window.FlowTracker.init();
    if (window.RealTimeLogViewer) window.RealTimeLogViewer.init();
    if (window.XmlStudio) window.XmlStudio.init();
    if (window.CatalogCloner) window.CatalogCloner.init();
    if (window.AclAnalyzer) window.AclAnalyzer.init();
    if (window.BulkBuilderManager) window.BulkBuilderManager.init();
    if (window.StatsManager) window.StatsManager.init();
    if (window.TransactionManager) window.TransactionManager.init();
    if (window.LldGenerator) window.LldGenerator.init();
    if (window.IntegrationStudioManager) window.IntegrationStudioManager.init();

    // --- CENTRALIZED BRIDGE CONNECTION ---
    if (btnConnect) {
        btnConnect.addEventListener('click', async () => {
            try {
                btnConnect.textContent = "Connecting...";
                window.activeInstanceData = await window.SNOW_Bridge.connectToInstance();

                if (connStatus) {
                    connStatus.textContent = "Connected Live";
                    connStatus.className = "status-indicator success";
                }
                const instanceUrlEl = document.getElementById('instanceUrl');
                if (instanceUrlEl) instanceUrlEl.textContent = window.activeInstanceData.url;
                
                const tokenStatusEl = document.getElementById('tokenStatus');
                if (tokenStatusEl) tokenStatusEl.innerHTML = `<span class="dot active"></span> Token Captured`;

                btnConnect.style.display = "none";
                if (toolNav) toolNav.classList.remove('hidden');
                
                // Flow Tracker Auto-Detect Injection
                if (window.activeInstanceData.flowSysId && flowSysIdInput) {
                    flowSysIdInput.value = window.activeInstanceData.flowSysId;
                    if (btnTrackFlow) btnTrackFlow.disabled = false;
                    if (flowTrackerStatus) {
                        flowTrackerStatus.style.color = "#2e7d32";
                        flowTrackerStatus.textContent = "Flow Execution Context auto-detected!";
                    }
                }

                // Cloner Auto-Detect Injection
                if (window.activeInstanceData.catItemSysId) {
                    if (clonerSourceTable) clonerSourceTable.value = window.activeInstanceData.catItemTable || '';
                    if (clonerSourceSysId) clonerSourceSysId.value = window.activeInstanceData.catItemSysId || '';
                    if (clonerSourceName) clonerSourceName.value = window.activeInstanceData.catItemName || '';
                }

                // Only switch to bulk panel if welcome panel is currently active
                const welcomePanel = document.getElementById('panel-welcome');
                if (welcomePanel && welcomePanel.classList.contains('active')) {
                    switchPanel('panel-bulk');
                }
                if (window.BulkBuilderManager) {
                    window.BulkBuilderManager.loadBulkBuilderMetadata();
                }
            } catch (error) {
                if (connStatus) {
                    connStatus.textContent = "Connection Failed";
                    connStatus.className = "status-indicator error";
                }
                btnConnect.textContent = "Retry Connection";
            }
        });
    }

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

        // Trigger module actions based on tab switch
        if ((panelId === 'panel-updateset' || panelId === 'panel-cloner') && window.UpdateSetManager && !window.UpdateSetManager.scopesLoaded && window.activeInstanceData) {
            window.UpdateSetManager.loadScopes();
        }
        if (panelId === 'panel-stats' && window.StatsManager && window.activeInstanceData) {
            window.StatsManager.loadInstanceStats();
        }
        if (panelId === 'panel-cancel-tx' && window.TransactionManager && window.activeInstanceData) {
            window.TransactionManager.loadActiveTransactions();
        }
        if (panelId === 'panel-lld' && window.LldGenerator && window.activeInstanceData) {
            window.LldGenerator.loadLiveUpdateSets();
        }
        
        // Stop stream if they navigate away from the logs tab to save bandwidth
        if (panelId !== 'panel-logs' && window.RealTimeLogViewer && window.RealTimeLogViewer.isStreaming) {
            window.RealTimeLogViewer.pause();
        }
    }

    // Auto-Connect on Open
    if (btnConnect) btnConnect.click();
});