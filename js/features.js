// --- START FEATURES ENGINE ---
const SNOW_Features = {

    // ==========================================
    // 1. RAPID IMPERSONATOR
    // ==========================================
    searchUsers: async function(query) {
        // Search active users, limit to 5 results to keep UI clean
        const endpoint = `/api/now/table/sys_user?sysparm_query=nameLIKE${query}^active=true&sysparm_limit=5&sysparm_fields=sys_id,name,user_name`;
        const response = await window.SNOW_API.request(endpoint);
        return response.result || [];
    },

    impersonateUser: async function(userName) {
        // ServiceNow's native impersonate API
        const endpoint = `/api/now/ui/impersonate/${userName}`;
        await window.SNOW_API.request(endpoint, 'POST', {});
        
        // Reload the active tab so the impersonation takes effect visually
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.reload(tab.id);
    },

    // ==========================================
    // 2. BACKGROUND SCRIPT QUICK-RUNNER
    // ==========================================
    runBackgroundScript: async function(scriptCode) {
        // We simulate a form submission to sys.scripts.do
        const payload = `script=${encodeURIComponent(scriptCode)}&runscript=Run script&sys_scope=global`;
        const htmlResponse = await window.SNOW_API.postForm('/sys.scripts.do', payload);
        
        // Extract the result from the <PRE> tag in the returned HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlResponse, 'text/html');
        const preTag = doc.querySelector('pre');
        
        return preTag ? preTag.textContent : "Execution finished, but no output was returned.";
    },

    // ==========================================
    // 3. UPDATE SET SWITCHER
    // ==========================================
    getInProgressUpdateSets: async function() {
        // Fetch all in-progress update sets
        const endpoint = `/api/now/table/sys_update_set?sysparm_query=state=in progress&sysparm_fields=sys_id,name,application&sysparm_display_value=true`;
        const response = await window.SNOW_API.request(endpoint);
        return response.result || [];
    },

    setUpdateSet: async function(sysId) {
        // Use the native Concourse picker API to change the session Update Set
        const endpoint = `/api/now/ui/concoursepicker/updateset`;
        await window.SNOW_API.request(endpoint, 'POST', { updateSet: sysId });
        
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.reload(tab.id);
    }
};

window.SNOW_Features = SNOW_Features;
// --- END FEATURES ENGINE ---