import './types';
import { SNOW_Bridge } from './bridge';
import { Impersonator } from './modules/impersonator';
import { BgScriptExecutor } from './modules/bg_script';
import { UpdateSetManager } from './modules/update_sets';
import { SchemaExporter } from './modules/schema_exporter';
import { FlowTracker } from './modules/flow_tracker';
import { RealTimeLogViewer } from './modules/log_viewer';
import { XmlStudio } from './modules/xml_studio';
import { CatalogCloner } from './modules/catalog_cloner';
import { AclAnalyzer } from './modules/acl_analyzer';
import { BulkBuilderManager } from './modules/bulk_builder';
import { StatsManager } from './modules/instance_stats';
import { TransactionManager } from './modules/cancel_tx';
import { LldGenerator } from './modules/lld_generator';
import { IntegrationStudioManager } from './modules/integration_studio';

document.addEventListener('DOMContentLoaded', () => {
    
    window.activeInstanceData = null;

    const btnConnect = document.getElementById('btnConnect') as HTMLButtonElement | null;
    const connStatus = document.getElementById('connStatus') as HTMLElement | null;
    const toolNav = document.getElementById('toolNav') as HTMLElement | null;
    const navItems = document.querySelectorAll('.nav-list li');
    const toolPanels = document.querySelectorAll('.tool-panel');

    const flowSysIdInput = document.getElementById('flowSysIdInput') as HTMLInputElement | null;
    const btnTrackFlow = document.getElementById('btnTrackFlow') as HTMLButtonElement | null;
    const flowTrackerStatus = document.getElementById('flowTrackerStatus') as HTMLElement | null;

    const clonerSourceTable = document.getElementById('clonerSourceTable') as HTMLInputElement | null;
    const clonerSourceSysId = document.getElementById('clonerSourceSysId') as HTMLInputElement | null;
    const clonerSourceName = document.getElementById('clonerSourceName') as HTMLInputElement | null;

    // Initialize all modules
    Impersonator.init();
    BgScriptExecutor.init();
    UpdateSetManager.init();
    SchemaExporter.init();
    FlowTracker.init();
    RealTimeLogViewer.init();
    XmlStudio.init();
    CatalogCloner.init();
    AclAnalyzer.init();
    BulkBuilderManager.init();
    StatsManager.init();
    TransactionManager.init();
    LldGenerator.init();
    IntegrationStudioManager.init();

    // --- CENTRALIZED BRIDGE CONNECTION ---
    if (btnConnect) {
        btnConnect.addEventListener('click', async () => {
            try {
                btnConnect.textContent = "Connecting...";
                window.activeInstanceData = await SNOW_Bridge.connectToInstance();
                if (!window.activeInstanceData) return;

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
                BulkBuilderManager.loadBulkBuilderMetadata();
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

        // Trigger module actions based on tab switch
        if ((panelId === 'panel-updateset' || panelId === 'panel-cloner') && !UpdateSetManager.scopesLoaded && window.activeInstanceData) {
            UpdateSetManager.loadScopes();
        }
        if (panelId === 'panel-stats' && window.activeInstanceData) {
            StatsManager.loadInstanceStats();
        }
        if (panelId === 'panel-cancel-tx' && window.activeInstanceData) {
            TransactionManager.loadActiveTransactions();
        }
        if (panelId === 'panel-lld' && window.activeInstanceData) {
            LldGenerator.loadLiveUpdateSets();
        }
        
        // Stop stream if they navigate away from the logs tab to save bandwidth
        if (panelId !== 'panel-logs' && RealTimeLogViewer.isStreaming) {
            RealTimeLogViewer.pause();
        }
    }

    // Auto-Connect on Open
    if (btnConnect) btnConnect.click();
});