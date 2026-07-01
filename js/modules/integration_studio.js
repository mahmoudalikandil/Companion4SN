(function () {
    window.IntegrationStudioManager = {
        init: function () {
            // Tab Managers
            this.bindTabs('intMainTabs', '.int-tab-content');
            this.bindTabs('intTestResultTabs', '.int-test-tab-pane');

            // Hook Auth Change
            const intMsgAuth = document.getElementById('intMsgAuth');
            const intBasicAuthGroup = document.getElementById('intBasicAuthGroup');
            if (intMsgAuth && intBasicAuthGroup) {
                intMsgAuth.addEventListener('change', () => {
                    if (intMsgAuth.value === 'basic') {
                        intBasicAuthGroup.style.display = 'flex';
                    } else {
                        intBasicAuthGroup.style.display = 'none';
                    }
                });
            }

            // Headers Binder
            const btnIntAddHeader = document.getElementById('btnIntAddHeader');
            if (btnIntAddHeader) {
                btnIntAddHeader.addEventListener('click', () => this.addHeaderRow('', ''));
            }
            const intHeadersBody = document.getElementById('intHeadersBody');
            if (intHeadersBody) {
                intHeadersBody.addEventListener('click', (e) => {
                    if (e.target.classList.contains('btn-delete-header') || e.target.parentNode.classList.contains('btn-delete-header')) {
                        e.target.closest('tr').remove();
                    }
                });
            }

            // Methods Binder
            const btnIntAddMethod = document.getElementById('btnIntAddMethod');
            if (btnIntAddMethod) {
                btnIntAddMethod.addEventListener('click', () => this.addMethodCard('get_details', 'get', '', ''));
            }
            const intMethodsList = document.getElementById('intMethodsList');
            if (intMethodsList) {
                intMethodsList.addEventListener('click', (e) => {
                    if (e.target.classList.contains('btn-delete-method') || e.target.parentNode.classList.contains('btn-delete-method')) {
                        e.target.closest('.int-method-card').remove();
                    }
                });
                intMethodsList.addEventListener('change', (e) => {
                    if (e.target.classList.contains('method-verb-select')) {
                        const card = e.target.closest('.int-method-card');
                        const textarea = card.querySelector('.method-body-textarea');
                        const verb = e.target.value.toLowerCase();
                        if (verb === 'post' || verb === 'put') {
                            textarea.style.display = 'block';
                        } else {
                            textarea.style.display = 'none';
                        }
                    }
                });
            }

            // Deploy Controls
            const btnIntDeploy = document.getElementById('btnIntDeploy');
            if (btnIntDeploy) {
                btnIntDeploy.addEventListener('click', () => this.deployLive());
            }
            const btnIntDownloadXml = document.getElementById('btnIntDownloadXml');
            if (btnIntDownloadXml) {
                btnIntDownloadXml.addEventListener('click', () => this.exportXmlUpdateSet());
            }

            // Tester Binders
            const intTesterTabHeader = document.getElementById('intTesterTabHeader');
            if (intTesterTabHeader) {
                intTesterTabHeader.addEventListener('click', () => this.syncMethodsToTester());
            }
            const intTestSelectMethod = document.getElementById('intTestSelectMethod');
            if (intTestSelectMethod) {
                intTestSelectMethod.addEventListener('change', () => this.renderTestParameters());
            }
            const btnIntRunTest = document.getElementById('btnIntRunTest');
            if (btnIntRunTest) {
                btnIntRunTest.addEventListener('click', () => this.runTest());
            }
            const intTestSnippetOutput = document.getElementById('intTestSnippetOutput');
            if (intTestSnippetOutput) {
                intTestSnippetOutput.addEventListener('click', () => {
                    navigator.clipboard.writeText(intTestSnippetOutput.textContent);
                    alert("ServiceNow snippet copied to clipboard!");
                });
            }
        },

        bindTabs: function (stripId, paneClass) {
            const strip = document.getElementById(stripId);
            if (!strip) return;
            strip.addEventListener('click', (e) => {
                const btn = e.target.closest('.tab-btn');
                if (!btn) return;
                
                // Toggle active buttons
                strip.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Toggle panes
                const targetPaneId = btn.dataset.intTab || btn.dataset.testTab;
                document.querySelectorAll(paneClass).forEach(pane => {
                    if (pane.id === targetPaneId) {
                        pane.classList.remove('hidden');
                        pane.style.display = paneClass.includes('content') ? 'flex' : 'block';
                    } else {
                        pane.classList.add('hidden');
                        pane.style.display = 'none';
                    }
                });
            });
        },

        addHeaderRow: function (name, val) {
            const intHeadersBody = document.getElementById('intHeadersBody');
            if (!intHeadersBody) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" placeholder="Header Name" value="${name}" class="form-control header-name-input"></td>
                <td><input type="text" placeholder="Value" value="${val}" class="form-control header-val-input"></td>
                <td style="text-align: center;"><button class="secondary-btn btn-delete-header" style="color: red; padding: 2px 6px; border:none; background:none; cursor:pointer;">✕</button></td>
            `;
            intHeadersBody.appendChild(tr);
        },

        addMethodCard: function (name, verb, suffix, body) {
            const intMethodsList = document.getElementById('intMethodsList');
            if (!intMethodsList) return;
            const div = document.createElement('div');
            div.className = 'int-method-card';
            div.style.border = '1px solid #e2e8f0';
            div.style.borderRadius = '6px';
            div.style.padding = '10px';
            div.style.background = 'white';

            const isPostPut = (verb === 'post' || verb === 'put');
            div.innerHTML = `
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
                    <select class="form-control method-verb-select" style="width: 90px; flex-shrink: 0;">
                        <option value="get" ${verb === 'get' ? 'selected' : ''}>GET</option>
                        <option value="post" ${verb === 'post' ? 'selected' : ''}>POST</option>
                        <option value="put" ${verb === 'put' ? 'selected' : ''}>PUT</option>
                        <option value="delete" ${verb === 'delete' ? 'selected' : ''}>DELETE</option>
                    </select>
                    <input type="text" placeholder="Method Name" value="${name}" class="form-control method-name-input" style="flex: 2;">
                    <input type="text" placeholder="Suffix (e.g. /${name})" value="${suffix}" class="form-control method-suffix-input" style="flex: 3;">
                    <button class="secondary-btn btn-delete-method" style="color: red; padding: 2px 8px; border:none; background:none; cursor:pointer;">✕</button>
                </div>
                <textarea class="form-control method-body-textarea" placeholder="Request Body payload (JSON)..." rows="2" style="font-family: monospace; font-size: 11px; margin-top: 5px; display: ${isPostPut ? 'block' : 'none'};">${body}</textarea>
            `;
            intMethodsList.appendChild(div);
        },

        getCreatorConfig: function () {
            const name = document.getElementById('intMsgName').value.trim();
            const endpoint = document.getElementById('intMsgEndpoint').value.trim();
            const auth = document.getElementById('intMsgAuth').value;
            const user = document.getElementById('intAuthUser').value.trim();
            const pass = document.getElementById('intAuthPassword').value;

            const headers = {};
            document.querySelectorAll('#intHeadersBody tr').forEach(tr => {
                const hName = tr.querySelector('.header-name-input').value.trim();
                const hVal = tr.querySelector('.header-val-input').value.trim();
                if (hName) headers[hName] = hVal;
            });

            const methods = [];
            document.querySelectorAll('#intMethodsList .int-method-card').forEach(card => {
                const verb = card.querySelector('.method-verb-select').value;
                const mName = card.querySelector('.method-name-input').value.trim();
                const suffix = card.querySelector('.method-suffix-input').value.trim();
                const body = card.querySelector('.method-body-textarea').value.trim();
                if (mName) {
                    methods.push({ verb: verb.toUpperCase(), name: mName, suffix: suffix, body: body });
                }
            });

            return { name, endpoint, auth, user, pass, headers, methods };
        },

        generateSysId: function () {
            let s = "";
            for (let i = 0; i < 32; i++) {
                s += Math.floor(Math.random() * 16).toString(16);
            }
            return s;
        },

        deployLive: async function () {
            const config = this.getCreatorConfig();
            const statusDiv = document.getElementById('intDeployStatus');
            if (!config.name || !config.endpoint) {
                statusDiv.style.color = 'red';
                statusDiv.textContent = "Error: Please provide both a REST Name and Base Endpoint.";
                return;
            }

            if (!window.activeInstanceData) {
                statusDiv.style.color = 'red';
                statusDiv.textContent = "Error: Please initialize Bridge connection first.";
                return;
            }

            statusDiv.style.color = '#334155';
            statusDiv.textContent = "Deploying REST Message and HTTP Functions to ServiceNow...";

            const deployScript = `(function() {
    try {
        gs.print('>>>START_DEPLOY<<<');
        var restMsg = new GlideRecord('sys_rest_message');
        restMsg.addQuery('name', '${config.name}');
        restMsg.query();
        var restMsgId;
        if (restMsg.next()) {
            restMsgId = restMsg.getUniqueValue();
            restMsg.setValue('endpoint', '${config.endpoint}');
            restMsg.setValue('use_basic_auth', ${config.auth === 'basic'});
            if (${config.auth === 'basic'}) {
                restMsg.setValue('basic_auth_user', '${config.user}');
                restMsg.setValue('basic_auth_password', '${config.pass}');
            }
            restMsg.update();
            gs.print('[INFO] Found existing REST Message, updating properties.');
        } else {
            restMsg.initialize();
            restMsg.setValue('name', '${config.name}');
            restMsg.setValue('endpoint', '${config.endpoint}');
            restMsg.setValue('use_basic_auth', ${config.auth === 'basic'});
            if (${config.auth === 'basic'}) {
                restMsg.setValue('basic_auth_user', '${config.user}');
                restMsg.setValue('basic_auth_password', '${config.pass}');
            }
            restMsgId = restMsg.insert();
            gs.print('[SUCCESS] Created new REST Message.');
        }

        if (!restMsgId) throw new Error('REST Message could not be created/updated.');

        // Clean headers and insert new
        var oldHeader = new GlideRecord('sys_rest_message_header');
        oldHeader.addQuery('rest_message', restMsgId);
        oldHeader.deleteMultiple();

        var headers = ${JSON.stringify(config.headers)};
        for (var key in headers) {
            var headerGr = new GlideRecord('sys_rest_message_header');
            headerGr.initialize();
            headerGr.setValue('rest_message', restMsgId);
            headerGr.setValue('name', key);
            headerGr.setValue('value', headers[key]);
            headerGr.insert();
        }

        // Clean methods and insert new
        var oldMethods = new GlideRecord('sys_rest_message_fn');
        oldMethods.addQuery('rest_message', restMsgId);
        oldMethods.deleteMultiple();

        var methods = ${JSON.stringify(config.methods)};
        for (var i = 0; i < methods.length; i++) {
            var m = methods[i];
            var fn = new GlideRecord('sys_rest_message_fn');
            fn.initialize();
            fn.setValue('rest_message', restMsgId);
            fn.setValue('name', m.name);
            fn.setValue('function_name', m.name);
            fn.setValue('http_method', m.verb);
            fn.setValue('rest_endpoint', m.suffix ? '${config.endpoint}' + m.suffix : '${config.endpoint}');
            if (m.body) {
                fn.setValue('content', m.body);
            }
            fn.insert();
        }

        gs.print('[SUCCESS] Deployed Outbound REST: ' + '${config.name}' + ' with ' + methods.length + ' functions.');
        gs.print('>>>DEPLOY_SUCCESS<<<');
    } catch (e) {
        gs.print('[ERROR] Deployment failed: ' + e.message);
        gs.print('>>>DEPLOY_ERROR<<<');
    }
})();`;

            try {
                const responseText = await window.SNOW_API.executeBackgroundScript(deployScript);
                if (responseText.includes(">>>DEPLOY_SUCCESS<<<")) {
                    statusDiv.style.color = 'green';
                    statusDiv.textContent = `Success! REST message "${config.name}" deployed live to active instance.`;
                } else {
                    const errorIdx = responseText.indexOf('[ERROR]');
                    const errorMsg = errorIdx !== -1 ? responseText.substring(errorIdx).split('\n')[0] : "Check system logs.";
                    statusDiv.style.color = 'red';
                    statusDiv.textContent = `Deployment Failed: ${errorMsg}`;
                }
            } catch (err) {
                statusDiv.style.color = 'red';
                statusDiv.textContent = `Failed to connect/execute: ${err.message}`;
            }
        },

        escapeXml: function (str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&apos;');
        },

        exportXmlUpdateSet: function () {
            const config = this.getCreatorConfig();
            const statusDiv = document.getElementById('intDeployStatus');
            if (!config.name || !config.endpoint) {
                statusDiv.style.color = 'red';
                statusDiv.textContent = "Error: Please provide both a REST Name and Base Endpoint.";
                return;
            }

            const usSysId = this.generateSysId();
            const msgSysId = this.generateSysId();

            let xmlStr = `<?xml version="1.0" encoding="UTF-8"?>\n<unload unload_date="2026-07-01 00:00:00">\n`;
            
            // 1. Remote Update Set Header record
            xmlStr += `  <sys_remote_update_set action="INSERT_OR_UPDATE">\n`;
            xmlStr += `    <application display_value="Global">global</application>\n`;
            xmlStr += `    <name>Outbound REST Integration: ${this.escapeXml(config.name)}</name>\n`;
            xmlStr += `    <state>loaded</state>\n`;
            xmlStr += `    <sys_id>${usSysId}</sys_id>\n`;
            xmlStr += `  </sys_remote_update_set>\n\n`;

            // Helper to add XML record payload wrapper
            const addXmlRecord = (table, sysId, targetName, innerXml) => {
                let rec = `  <sys_update_xml action="INSERT_OR_UPDATE">\n`;
                rec += `    <name>${table}_${sysId}</name>\n`;
                rec += `    <payload><![CDATA[<record_update table="${table}">\n${innerXml}\n</record_update>]]></payload>\n`;
                rec += `    <target_name>${this.escapeXml(targetName)}</target_name>\n`;
                rec += `    <type>${table === 'sys_rest_message' ? 'REST Message' : 'HTTP Method'}</type>\n`;
                rec += `    <update_set display_value="Outbound REST Integration: ${config.name}"/>\n`;
                rec += `  </sys_update_xml>\n\n`;
                return rec;
            };

            // 2. sys_rest_message record
            let msgXml = `  <sys_rest_message action="INSERT_OR_UPDATE">\n`;
            msgXml += `    <name>${this.escapeXml(config.name)}</name>\n`;
            msgXml += `    <endpoint>${this.escapeXml(config.endpoint)}</endpoint>\n`;
            msgXml += `    <use_basic_auth>${config.auth === 'basic'}</use_basic_auth>\n`;
            if (config.auth === 'basic') {
                msgXml += `    <basic_auth_user>${this.escapeXml(config.user)}</basic_auth_user>\n`;
                msgXml += `    <basic_auth_password>${this.escapeXml(config.pass)}</basic_auth_password>\n`;
            }
            msgXml += `    <sys_id>${msgSysId}</sys_id>\n`;
            msgXml += `  </sys_rest_message>`;
            xmlStr += addXmlRecord('sys_rest_message', msgSysId, config.name, msgXml);

            // 3. sys_rest_message_header records
            for (let key in config.headers) {
                const headerSysId = this.generateSysId();
                let headerXml = `  <sys_rest_message_header action="INSERT_OR_UPDATE">\n`;
                headerXml += `    <rest_message>${msgSysId}</rest_message>\n`;
                headerXml += `    <name>${this.escapeXml(key)}</name>\n`;
                headerXml += `    <value>${this.escapeXml(config.headers[key])}</value>\n`;
                headerXml += `    <sys_id>${headerSysId}</sys_id>\n`;
                headerXml += `  </sys_rest_message_header>`;
                xmlStr += addXmlRecord('sys_rest_message_header', headerSysId, `${config.name} - ${key}`, headerXml);
            }

            // 4. sys_rest_message_fn records (methods)
            config.methods.forEach(m => {
                const fnSysId = this.generateSysId();
                let fnXml = `  <sys_rest_message_fn action="INSERT_OR_UPDATE">\n`;
                fnXml += `    <rest_message>${msgSysId}</rest_message>\n`;
                fnXml += `    <name>${this.escapeXml(m.name)}</name>\n`;
                fnXml += `    <function_name>${this.escapeXml(m.name)}</function_name>\n`;
                fnXml += `    <http_method>${this.escapeXml(m.verb)}</http_method>\n`;
                fnXml += `    <rest_endpoint>${this.escapeXml(m.suffix ? config.endpoint + m.suffix : config.endpoint)}</rest_endpoint>\n`;
                if (m.body) {
                    fnXml += `    <content>${this.escapeXml(m.body)}</content>\n`;
                }
                fnXml += `    <sys_id>${fnSysId}</sys_id>\n`;
                fnXml += `  </sys_rest_message_fn>`;
                xmlStr += addXmlRecord('sys_rest_message_fn', fnSysId, `${config.name} - ${m.name}`, fnXml);
            });

            xmlStr += `</unload>`;

            // Trigger XML download file
            const blob = new Blob([xmlStr], { type: "text/xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${config.name.replace(/[^a-zA-Z0-9]/g, "_")}_UpdateSet.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            statusDiv.style.color = 'green';
            statusDiv.textContent = "XML Update Set package created and downloaded successfully!";
        },

        syncMethodsToTester: function () {
            const config = this.getCreatorConfig();
            const select = document.getElementById('intTestSelectMethod');
            if (!select) return;
            select.innerHTML = '<option value="">-- Choose a Method --</option>';
            config.methods.forEach((m, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = `${m.verb} - ${m.name} (${m.suffix || '/'})`;
                select.appendChild(opt);
            });
        },

        renderTestParameters: function () {
            const select = document.getElementById('intTestSelectMethod');
            const container = document.getElementById('intTestParamsContainer');
            const grid = document.getElementById('intTestParamsGrid');
            if (!select || !container || !grid) return;

            const methodIdx = select.value;
            if (methodIdx === "") {
                container.style.display = 'none';
                container.classList.add('hidden');
                return;
            }

            const config = this.getCreatorConfig();
            const method = config.methods[methodIdx];
            
            // Gather placeholders like ${variable}
            const pathVars = (method.suffix.match(/\${[^}]+}/g) || []).map(v => v.slice(2, -1));
            const bodyVars = (method.body.match(/\${[^}]+}/g) || []).map(v => v.slice(2, -1));
            const allVars = Array.from(new Set([...pathVars, ...bodyVars]));

            if (allVars.length === 0) {
                container.style.display = 'none';
                container.classList.add('hidden');
                return;
            }

            container.style.display = 'block';
            container.classList.remove('hidden');
            grid.innerHTML = '';

            allVars.forEach(v => {
                const label = document.createElement('label');
                label.style.fontSize = '11px';
                label.style.fontWeight = 'bold';
                label.textContent = v;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control int-test-param-input';
                input.dataset.paramName = v;
                input.placeholder = `Value for ${v}`;
                
                const wrap = document.createElement('div');
                wrap.appendChild(label);
                wrap.appendChild(input);
                grid.appendChild(wrap);
            });
        },

        runTest: async function () {
            const select = document.getElementById('intTestSelectMethod');
            const execMode = document.getElementById('intTestExecMode').value;
            const resBox = document.getElementById('intTestResultsBox');
            const bodyOut = document.getElementById('intTestBodyOutput');
            const headOut = document.getElementById('intTestHeadersOutput');
            const snippetOut = document.getElementById('intTestSnippetOutput');
            const badge = document.getElementById('intTestStatusBadge');

            if (!select || select.value === "") return alert("Please select a method to test.");

            const config = this.getCreatorConfig();
            const method = config.methods[select.value];
            
            // Substitute parameters
            let fullSuffix = method.suffix;
            let fullBody = method.body;

            document.querySelectorAll('.int-test-param-input').forEach(input => {
                const param = input.dataset.paramName;
                const val = input.value.trim();
                fullSuffix = fullSuffix.replaceAll(`\${${param}}`, val);
                fullBody = fullBody.replaceAll(`\${${param}}`, val);
            });

            const targetUrl = config.endpoint + fullSuffix;

            resBox.style.display = 'flex';
            resBox.classList.remove('hidden');
            badge.className = 'badge';
            badge.style.backgroundColor = '#38bdf8';
            badge.textContent = "WAITING";
            bodyOut.textContent = "Sending request...";
            headOut.textContent = "";
            snippetOut.textContent = "";

            // Populate code snippet inside the tab right away
            this.updateJsSnippet(config.name, method.name, targetUrl, method.verb, config.headers, fullBody);

            if (execMode === 'local') {
                // Client-side local browser request
                try {
                    const fetchConfig = {
                        method: method.verb,
                        headers: config.headers
                    };
                    if (method.verb !== 'GET' && method.verb !== 'HEAD' && fullBody) {
                        fetchConfig.body = fullBody;
                    }
                    
                    const tStart = performance.now();
                    const response = await fetch(targetUrl, fetchConfig);
                    const tEnd = performance.now();
                    const elapsed = Math.round(tEnd - tStart);

                    const text = await response.text();
                    let formattedBody = text;
                    try {
                        formattedBody = JSON.stringify(JSON.parse(text), null, 2);
                    } catch (e) {}

                    bodyOut.textContent = formattedBody;
                    badge.textContent = `${response.status} ${response.statusText} (${elapsed}ms)`;
                    badge.style.backgroundColor = response.ok ? '#4ade80' : '#f87171';

                    let headersStr = '';
                    response.headers.forEach((v, k) => {
                        headersStr += `${k}: ${v}\n`;
                    });
                    headOut.textContent = headersStr || "No headers returned.";
                } catch (err) {
                    bodyOut.textContent = `[CONNECTION ERROR] Request failed: ${err.message}\n\nNote: If this is a cross-origin call, it might have been blocked by CORS policy. Try using 'ServiceNow Proxy (Server)' execution mode to route through the connected ServiceNow instance instead.`;
                    badge.textContent = "FAILED";
                    badge.style.backgroundColor = '#f87171';
                }
            } else {
                // Server-side ServiceNow Proxy request via bridge
                if (!window.activeInstanceData) {
                    bodyOut.textContent = "Error: Please initialize Bridge connection first.";
                    badge.textContent = "BRIDGE ERROR";
                    badge.style.backgroundColor = '#f87171';
                    return;
                }

                // Compile Proxy script execution
                const testScript = `(function() {
    try {
        var r = new sn_ws.RESTMessageV2();
        r.setEndpoint('${targetUrl}');
        r.setHttpMethod('${method.verb}');
        
        var headers = ${JSON.stringify(config.headers)};
        for (var key in headers) {
            r.setRequestHeader(key, headers[key]);
        }

        if ('${method.verb}' !== 'GET' && '${method.verb}' !== 'HEAD' && \`${fullBody.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`) {
            r.setRequestBody(\`${fullBody.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
        }

        // Basic credentials injection
        if (${config.auth === 'basic'}) {
            r.setBasicAuth('${config.user}', '${config.pass}');
        }

        var tStart = new Date().getTime();
        var response = r.execute();
        var tEnd = new Date().getTime();
        
        var responseBody = response.getBody();
        var httpStatus = response.getStatusCode();
        
        gs.print('>>>STATUS_CODE:::' + httpStatus);
        gs.print('>>>ELAPSED_TIME:::' + (tEnd - tStart) + 'ms');
        gs.print('>>>RESPONSE_BODY:::\\n' + responseBody);
        
        var headersMap = response.getHeaders();
        var headersStr = '';
        for (var hKey in headersMap) {
            headersStr += hKey + ': ' + headersMap[hKey] + '\\n';
        }
        gs.print('>>>RESPONSE_HEADERS:::\\n' + headersStr);
        gs.print('>>>TEST_SUCCESS<<<');
    } catch(e) {
        gs.print('[ERROR] REST Execution Failed: ' + e.message);
        gs.print('>>>TEST_ERROR<<<');
    }
})();`;

                try {
                    const responseText = await window.SNOW_API.executeBackgroundScript(testScript);
                    if (responseText.includes(">>>TEST_SUCCESS<<<")) {
                        const getMarker = (marker, text) => {
                            const idx = text.indexOf(marker);
                            if (idx === -1) return '';
                            const nextMarkerIdx = text.indexOf('*** Script:', idx + marker.length);
                            const endIdx = nextMarkerIdx !== -1 ? nextMarkerIdx : text.indexOf('>>>TEST_SUCCESS<<<');
                            return text.substring(idx + marker.length, endIdx).trim();
                        };

                        const status = getMarker('>>>STATUS_CODE:::', responseText);
                        const elapsed = getMarker('>>>ELAPSED_TIME:::', responseText);
                        const body = getMarker('>>>RESPONSE_BODY:::', responseText);
                        const headers = getMarker('>>>RESPONSE_HEADERS:::', responseText);

                        let formattedBody = body;
                        try {
                            formattedBody = JSON.stringify(JSON.parse(body), null, 2);
                        } catch (e) {}

                        bodyOut.textContent = formattedBody;
                        headOut.textContent = headers || "No headers returned.";
                        badge.textContent = `Status: ${status} (${elapsed})`;
                        badge.style.backgroundColor = (status.startsWith('2')) ? '#4ade80' : '#f87171';
                    } else {
                        const errorIdx = responseText.indexOf('[ERROR]');
                        const errorMsg = errorIdx !== -1 ? responseText.substring(errorIdx).split('\n')[0] : "Check system logs.";
                        bodyOut.textContent = `REST Call Failed inside ServiceNow:\n${errorMsg}\n\nFull Server Output:\n${responseText}`;
                        badge.textContent = "SERVER FAIL";
                        badge.style.backgroundColor = '#f87171';
                    }
                } catch (err) {
                    bodyOut.textContent = `Failed to connect/execute: ${err.message}`;
                    badge.textContent = "BRIDGE ERROR";
                    badge.style.backgroundColor = '#f87171';
                }
            }
        },

        updateJsSnippet: function (msgName, methodName, targetUrl, verb, headers, body) {
            const snippetOut = document.getElementById('intTestSnippetOutput');
            if (!snippetOut) return;

            let headerAdds = '';
            for (let key in headers) {
                headerAdds += `    r.setRequestHeader('${key}', '${headers[key]}');\n`;
            }

            let bodyAdd = '';
            if (verb !== 'GET' && verb !== 'HEAD' && body) {
                bodyAdd = `    r.setRequestBody(\`${body.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);\n`;
            }

            snippetOut.textContent = `try {
    // 1. Initialize REST message function
    var r = new sn_ws.RESTMessageV2('${msgName || 'REST_MESSAGE_NAME'}', '${methodName || 'GET_METHOD_NAME'}');
    
    // (Optional override endpoint)
    // r.setEndpoint('${targetUrl}');
    
${headerAdds}${bodyAdd}
    // 2. Execute call
    var response = r.execute();
    var responseBody = response.getBody();
    var httpStatus = response.getStatusCode();
    
    if (httpStatus == 200) {
        gs.info("REST call successful! Response:\\n" + responseBody);
    } else {
        gs.error("REST call failed with status: " + httpStatus);
    }
} catch(ex) {
    var message = ex.message;
    gs.error("REST script error: " + message);
}`;
        }
    };
})();
