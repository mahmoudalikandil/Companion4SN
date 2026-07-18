import { SNOW_API } from '../api';
import { SNOW_Bridge } from '../bridge';

export const FlowTracker = {
        init: function () {
            const flowSysIdInput = (document.getElementById('flowSysIdInput') as HTMLInputElement);
            const btnTrackFlow = (document.getElementById('btnTrackFlow') as HTMLButtonElement);
            const flowTrackerStatus = document.getElementById('flowTrackerStatus');

            if (!flowSysIdInput || !btnTrackFlow) return;

            flowSysIdInput.addEventListener('input', (e) => {
                btnTrackFlow.disabled = ((e.target as HTMLInputElement).value.trim().length !== 32); 
            });

            btnTrackFlow.addEventListener('click', () => {
                const sysId = flowSysIdInput.value.trim();
                if (sysId.length !== 32) return alert("Invalid Sys ID.");

                if (!window.activeInstanceData) return alert("Not connected to instance.");

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
    };
