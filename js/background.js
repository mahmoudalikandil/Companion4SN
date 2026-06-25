console.log("SNOW Companion Background Worker Ready.");

// Listens for messages from the Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "START_FLOW_TRACKING") {
        trackFlowExecution(message.url, message.token, message.sysId);
        sendResponse({ status: "Tracking Initiated" });
    }
    return true; 
});

/**
 * Polls the ServiceNow API every 5 seconds.
 * The continuous fetch requests keep the Service Worker awake until completion.
 */
async function trackFlowExecution(url, token, sysId) {
    const endpoint = `${url}/api/now/table/sys_flow_context/${sysId}?sysparm_fields=state,name`;
    
    const checkStatus = async () => {
        try {
            console.log(`[Worker] Polling flow status for: ${sysId}`);
            let res = await fetch(endpoint, {
                headers: { 
                    'X-UserToken': token, 
                    'Accept': 'application/json' 
                }
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            let data = await res.json();
            let state = data.result.state;
            let flowName = data.result.name;

            // States: IN_PROGRESS, WAITING, ERROR, COMPLETE, CANCELLED
            if (state === 'COMPLETE' || state === 'ERROR' || state === 'CANCELLED') {
                console.log(`[Worker] Flow Finished. State: ${state}`);
                
                // Fire native Chrome Desktop Notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Transparent 1x1 fallback icon
                    title: `ServiceNow Flow: ${state}`,
                    message: `Flow "${flowName}" has finished executing.`,
                    priority: 2,
                    requireInteraction: true // Keeps notification on screen until dismissed
                });
            } else {
                // If still running, wait 5 seconds and poll again
                setTimeout(checkStatus, 5000); 
            }
        } catch (error) {
            console.error("[Worker] Tracking failed to fetch:", error);
        }
    };

    // Kick off the first check
    checkStatus();
}