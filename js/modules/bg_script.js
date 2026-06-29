(function () {
    window.BgScriptExecutor = {
        init: function () {
            const btnRunScript = document.getElementById('btnRunScript');
            const btnCancelScript = document.getElementById('btnCancelScript');
            const codeArea = document.getElementById('codeArea');
            const scriptResultsBox = document.getElementById('scriptResultsBox');
            const scriptOutput = document.getElementById('scriptOutput');
            const snippetSelector = document.getElementById('snippetSelector');

            if (!btnRunScript || !codeArea) return;

            const SNIPPETS = {
                incident: `var gr = new GlideRecord('incident');
gr.orderByDesc('sys_created_on');
gr.setLimit(5);
gr.query();
while(gr.next()) {
    gs.info(gr.number + ' - ' + gr.short_description);
}`,
                user: `var gr = new GlideRecord('sys_user');
gr.addEncodedQuery('active=true');
gr.query();
gs.info('Total Active Users: ' + gr.getRowCount());`,
                property: `var gr = new GlideRecord('sys_properties');
gr.addQuery('name', 'glide.sys.language');
gr.query();
if(gr.next()) {
    gs.info('System Language: ' + gr.value);
}`,
                glide_aggregate: `var count = new GlideAggregate('incident');
count.addAggregate('COUNT');
count.query();
var incidents = 0;
if(count.next()) {
    incidents = count.getAggregate('COUNT');
}
gs.info('Total Incidents (Aggregate): ' + incidents);`,
                sys_id_search: `var searchId = 'put_sys_id_here';
var dict = new GlideRecord('sys_dictionary');
dict.addQuery('internal_type', 'GUID');
dict.query();
while(dict.next()) {
    var gr = new GlideRecord(dict.name);
    if(gr.get(searchId)) {
        gs.info('Found in Table: ' + dict.name);
        break;
    }
}`,
                table_size: `var tableName = 'syslog';
var gr = new GlideRecord(tableName);
gs.info('Record count for table ' + tableName + ': ' + gr.getEstimatedRowCount());`,
                transactions: `var tm = GlideTransactionManager.get();
var list = tm.getActiveTransactions();
gs.info('Active Transactions Count: ' + list.size());
for(var i=0; i<list.size(); i++) {
    var tx = list.get(i);
    gs.info(tx.getThreadName() + ' - ' + tx.getAgeSecs() + 's - ' + tx.getURL());
}`,
                slow_br: `var gr = new GlideRecord('sys_script_execution_tracker');
gr.orderByDesc('duration');
gr.setLimit(5);
gr.query();
while(gr.next()) {
    gs.info('Tracker: ' + gr.name + ' | Duration: ' + gr.duration + 'ms');
}`,
                mid_servers: `var gr = new GlideRecord('ecc_agent');
gr.addQuery('status', '!=', 'Up');
gr.query();
gs.info('Down MID Servers: ' + gr.getRowCount());
while(gr.next()) {
    gs.info('MID: ' + gr.name + ' | Status: ' + gr.status);
}`,
                workflow_active: `var gr = new GlideRecord('wf_context');
gr.addQuery('state', 'active');
gr.query();
gs.info('Active Workflows: ' + gr.getRowCount());
while(gr.next()) {
    gs.info('Workflow: ' + gr.name + ' | Table: ' + gr.table + ' | ID: ' + gr.id);
}`,
                attachment_size: `var gr = new GlideRecord('sys_attachment');
gr.orderByDesc('size_bytes');
gr.setLimit(5);
gr.query();
while(gr.next()) {
    var sizeMB = (gr.size_bytes / (1024 * 1024)).toFixed(2);
    gs.info('File: ' + gr.file_name + ' | Size: ' + sizeMB + ' MB | Table: ' + gr.table_name);
}`,
                portal_errors: `var gr = new GlideRecord('sys_log_error');
gr.addQuery('sys_created_on', '>=', 'javascript:gs.beginningOfToday()');
gr.addQuery('message', 'CONTAINS', 'sp');
gr.orderByDesc('sys_created_on');
gr.setLimit(5);
gr.query();
while(gr.next()) {
    gs.info('Portal Error: ' + gr.message.substring(0, 100));
}`,
                cache: `gs.invalidateCache();
gs.info('System Cache Invalidation completed successfully.');`,
                events: `var gr = new GlideRecord('sysevent');
gr.addQuery('state', 'ready');
gr.orderByDesc('sys_created_on');
gr.setLimit(10);
gr.query();
while(gr.next()) {
    gs.info('Event: ' + gr.name + ' | Created: ' + gr.sys_created_on);
}`,
                empty_groups: `var gr = new GlideRecord('sys_user_group');
gr.query();
var emptyCount = 0;
while(gr.next()) {
    var memberGr = new GlideRecord('sys_user_gmember');
    memberGr.addQuery('group', gr.getUniqueValue());
    memberGr.query();
    if(memberGr.getRowCount() === 0) {
        gs.info('Empty Group: ' + gr.name);
        emptyCount++;
    }
}
gs.info('Total Empty Groups: ' + emptyCount);`,
                update_set_preview: `var gr = new GlideRecord('sys_update_preview_problem');
gr.addQuery('status', 'error');
gr.query();
gs.info('Update Set Errors: ' + gr.getRowCount());
while(gr.next()) {
    gs.info('Problem: ' + gr.description + ' | Resolution: ' + gr.resolution);
}`,
                import_set_errors: `var gr = new GlideRecord('sys_import_set_row');
gr.addQuery('sys_import_state', 'error');
gr.orderByDesc('sys_created_on');
gr.setLimit(10);
gr.query();
while(gr.next()) {
    gs.info('Set: ' + gr.sys_import_set.number + ' | Target: ' + gr.sys_target_table + ' | Error: ' + gr.sys_import_state_comment);
}`,
                user_login_history: `var gr = new GlideRecord('sysevent');
gr.addQuery('name', 'login');
gr.orderByDesc('sys_created_on');
gr.setLimit(5);
gr.query();
while(gr.next()) {
    gs.info('User: ' + gr.user_id.name + ' (' + gr.user_id.user_name + ') | Login Time: ' + gr.sys_created_on);
}`,
                impersonate: `var oldUser = gs.getSession().impersonate('sys_id_of_user');
gs.info('Current user context: ' + gs.getUserName());
gs.getSession().impersonate(oldUser);
gs.info('Restored user context: ' + gs.getUserName());`,
                role_members: `var gr = new GlideRecord('sys_user_has_role');
gr.addQuery('role.name', 'admin');
gr.query();
gs.info('Admin count: ' + gr.getRowCount());
while(gr.next()) {
    gs.info('Admin: ' + gr.user.name + ' (' + gr.user.user_name + ')');
}`,
                br_search: `var gr = new GlideRecord('sys_script');
gr.addActiveQuery();
gr.addQuery('script', 'CONTAINS', 'setWorkflow(false)');
gr.query();
gs.info('Matching Business Rules: ' + gr.getRowCount());
while(gr.next()) {
    gs.info('BR: ' + gr.name + ' | Table: ' + gr.collection);
}`,
                script_include_check: `try {
    // Replace MyScriptInclude and myMethod
    var result = new global.MyScriptInclude().myMethod();
    gs.info('Result: ' + JSON.stringify(result));
} catch(e) {
    gs.info('Error: ' + e.message);
}`,
                audit_log: `var gr = new GlideRecord('sys_audit');
gr.addQuery('documentkey', 'record_sys_id_here');
gr.orderByDesc('sys_created_on');
gr.setLimit(10);
gr.query();
while(gr.next()) {
    gs.info('Field: ' + gr.fieldname + ' | Old: ' + gr.oldvalue + ' -> New: ' + gr.newvalue + ' | User: ' + gr.user);
}`,
                trigger_job: `// Trigger Scheduled Job
var gr = new GlideRecord('sys_trigger');
if (gr.get('sys_id_of_scheduled_job')) {
    gs.info('Triggering job: ' + gr.name);
    SncTriggerSynchronizer.executeNow(gr);
} else {
    gs.info('Scheduled Job not found.');
}`,
                rest_call: `try {
    var r = new sn_ws.RESTMessageV2();
    r.setEndpoint('https://httpbin.org/get');
    r.setMethod('GET');
    var response = r.execute();
    var responseBody = response.getBody();
    var httpStatus = response.getStatusCode();
    gs.info('Status: ' + httpStatus + ' | Body: ' + responseBody);
} catch(ex) {
    gs.info('Error: ' + ex.message);
}`
            };

            if (snippetSelector) {
                snippetSelector.addEventListener('change', (e) => {
                    if (SNIPPETS[e.target.value]) codeArea.value = SNIPPETS[e.target.value];
                });
            }

            let scriptAbortController = null;

            btnRunScript.addEventListener('click', async () => {
                const rawScript = codeArea.value.trim();
                if (!rawScript) return alert('Script cannot be empty.');

                // Static Analysis Checks
                if (/\bwhile\s*\(\s*[\w$.]+\.next\s*\)/i.test(rawScript)) {
                    alert('Safety Alert: Suspicious loop structure detected!\n\nIt looks like you wrote "while(gr.next)" without parentheses. This will cause an infinite loop because a function object is always truthy. Please write "while(gr.next())" instead.');
                    return;
                }
                if (/\bwhile\s*\(\s*(true|1)\s*\)/i.test(rawScript) || /\bfor\s*\(\s*;\s*;\s*\)/i.test(rawScript)) {
                    alert('Safety Alert: Explicit infinite loop structure ("while(true)" or "for(;;)") detected. This script execution has been blocked to prevent locking the instance node.');
                    return;
                }
                if (/\bwhile\s*\(\s*[\w$.]+\.query\s*\([^)]*\)\s*\)/i.test(rawScript)) {
                    alert('Safety Alert: Suspicious loop structure detected!\n\nYou used ".query()" inside a while loop condition. This will result in an infinite loop because query() does not advance the record pointer. Please use "while(gr.next())" instead.');
                    return;
                }

                // Programmatic safety guard injection
                const script = this.injectSafetyGuard(rawScript);

                btnRunScript.textContent = "Executing...";
                btnRunScript.disabled = true;
                if (btnCancelScript) btnCancelScript.classList.remove('hidden');
                scriptResultsBox.classList.add('hidden');
                scriptOutput.textContent = "";

                scriptAbortController = new AbortController();

                try {
                    const scopeSelectVal = document.getElementById('bgScope') ? document.getElementById('bgScope').value : 'global';
                    const output = await window.SNOW_API.runBackgroundScript(script, scopeSelectVal, scriptAbortController.signal);
                    scriptOutput.textContent = output;
                    scriptResultsBox.classList.remove('hidden');
                } catch (error) {
                    if (error.name === 'AbortError') {
                        scriptOutput.textContent = "Execution Cancelled.\n\nSent a thread abort command to the ServiceNow server to release the session thread.";
                    } else {
                        scriptOutput.textContent = `Execution Error: ${error.message}`;
                    }
                    scriptResultsBox.classList.remove('hidden');
                } finally {
                    btnRunScript.textContent = "Execute Script";
                    btnRunScript.disabled = false;
                    if (btnCancelScript) btnCancelScript.classList.add('hidden');
                    scriptAbortController = null;
                }
            });

            if (btnCancelScript) {
                btnCancelScript.addEventListener('click', () => {
                    if (scriptAbortController) {
                        scriptAbortController.abort();
                    }
                    try {
                        window.SNOW_API.cancelCurrentTransaction();
                    } catch (err) {
                        console.error("Failed to cancel server transaction:", err);
                    }
                });
            }
        },

        injectSafetyGuard: function (code) {
            const guardHeader = `// Safety loop guard injected by Scaler by P4
var __loop_counter = 0;
var __check_loop = function() {
    __loop_counter++;
    if (__loop_counter > 5000) {
        throw new Error("Loop limit exceeded (safety guard triggered at 5,000 iterations to prevent instance lockup).");
    }
};

`;
            let output = '';
            let i = 0;
            while (i < code.length) {
                let substr = code.substring(i);
                let match = substr.match(/^\b(while|for)\b/i);
                if (match) {
                    const keyword = match[1];
                    output += keyword;
                    i += keyword.length;
                    
                    let openParenIndex = code.indexOf('(', i);
                    if (openParenIndex !== -1 && code.substring(i, openParenIndex).trim() === '') {
                        output += code.substring(i, openParenIndex + 1);
                        i = openParenIndex + 1;
                        
                        let depth = 1;
                        while (i < code.length && depth > 0) {
                            const char = code[i];
                            if (char === '(') depth++;
                            else if (char === ')') depth--;
                            output += char;
                            i++;
                        }
                        
                        let lookAhead = i;
                        while (lookAhead < code.length && /\s/.test(code[lookAhead])) {
                            lookAhead++;
                        }
                        if (lookAhead < code.length && code[lookAhead] === '{') {
                            output += code.substring(i, lookAhead + 1);
                            output += ` __check_loop();`;
                            i = lookAhead + 1;
                        }
                    }
                } else {
                    output += code[i];
                    i++;
                }
            }
            return guardHeader + output;
        }
    };
})();
