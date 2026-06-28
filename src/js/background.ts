/// <reference types="chrome"/>

// Listens for messages from the Popup
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    if (message.action === "START_FLOW_TRACKING") {
        setupFlowTracking(message.url, message.token, message.sysId);
        sendResponse({ status: "Tracking Initiated" });
    }
    return true; 
});

// Listener for alarms
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
    if (alarm.name.startsWith("poll_flow_")) {
        const sysId = alarm.name.replace("poll_flow_", "");
        await checkFlowStatus(sysId);
    }
});

async function setupFlowTracking(url: string, token: string, sysId: string) {
    // Save settings to storage
    chrome.storage.local.get({ activeFlows: {} }, async (data) => {
        const activeFlows: Record<string, any> = data.activeFlows || {};
        activeFlows[sysId] = { url, token, sysId };
        chrome.storage.local.set({ activeFlows }, async () => {
            // Create alarm (periodInMinutes: 1 is minimum for alarms)
            chrome.alarms.create("poll_flow_" + sysId, { periodInMinutes: 1 });
            await checkFlowStatus(sysId);
        });
    });
}

async function checkFlowStatus(sysId: string) {
    chrome.storage.local.get({ activeFlows: {} }, async (data) => {
        const activeFlows: Record<string, any> = data.activeFlows || {};
        const flow = activeFlows[sysId];
        if (!flow) {
            console.warn(`[Worker] No storage data found for flow: ${sysId}. Clearing alarm.`);
            chrome.alarms.clear("poll_flow_" + sysId);
            return;
        }

        const endpoint = `${flow.url}/api/now/table/sys_flow_context/${sysId}?sysparm_fields=state,name`;
        try {
            let res = await fetch(endpoint, {
                headers: { 
                    'X-UserToken': flow.token, 
                    'Accept': 'application/json' 
                }
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            let resData = await res.json();
            let state = resData.result.state;
            let flowName = resData.result.name;

            // States: IN_PROGRESS, WAITING, ERROR, COMPLETE, CANCELLED
            if (state === 'COMPLETE' || state === 'ERROR' || state === 'CANCELLED') {
                // Fire native Chrome Desktop Notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 
                    title: `ServiceNow Flow: ${state}`,
                    message: `Flow "${flowName}" has finished executing.`,
                    priority: 2,
                    requireInteraction: true
                });

                // Clean up alarm and storage
                chrome.alarms.clear("poll_flow_" + sysId);
                delete activeFlows[sysId];
                chrome.storage.local.set({ activeFlows });
            }
        } catch (error) {
            console.error("[Worker] Tracking failed to fetch:", error);
        }
    });
}
