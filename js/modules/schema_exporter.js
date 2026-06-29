(function () {
    window.SchemaExporter = {
        init: function () {
            const schemaTableInput = document.getElementById('schemaTableInput');
            const btnDetectTable = document.getElementById('btnDetectTable');
            const btnExportCSV = document.getElementById('btnExportCSV');
            const btnExportJSON = document.getElementById('btnExportJSON');
            const schemaStatus = document.getElementById('schemaStatus');

            if (!schemaTableInput || !btnExportCSV || !btnExportJSON) return;

            if (btnDetectTable) {
                btnDetectTable.addEventListener('click', async () => {
                    try {
                        btnDetectTable.textContent = "...";
                        const activeData = await window.SNOW_Bridge.connectToInstance();
                        window.activeInstanceData = activeData;

                        if (activeData && activeData.table) {
                            schemaTableInput.value = activeData.table;
                            schemaStatus.style.color = "#2e7d32";
                            schemaStatus.textContent = "Table detected automatically.";
                        } else {
                            schemaStatus.style.color = "#c62828";
                            schemaStatus.textContent = "Could not detect table on active tab.";
                        }
                    } catch (err) {
                        schemaStatus.style.color = "#c62828";
                        schemaStatus.textContent = "Auto-detect failed: " + err.message;
                    } finally {
                        btnDetectTable.textContent = "Auto-Detect";
                    }
                });
            }

            btnExportCSV.addEventListener('click', () => this.handleExport('csv'));
            btnExportJSON.addEventListener('click', () => this.handleExport('json'));
        },

        triggerFileDownload: function (content, filename, type) {
            const blob = new Blob([content], { type: type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        handleExport: async function (format) {
            const schemaTableInput = document.getElementById('schemaTableInput');
            const schemaStatus = document.getElementById('schemaStatus');
            const btnExportCSV = document.getElementById('btnExportCSV');
            const btnExportJSON = document.getElementById('btnExportJSON');

            const table = schemaTableInput.value.trim().toLowerCase();
            if (!table) return alert('Please enter or detect a table name first.');

            schemaStatus.style.color = "#181a1f";
            schemaStatus.textContent = "Fetching schema from server...";
            btnExportCSV.disabled = true;
            btnExportJSON.disabled = true;

            try {
                const records = await window.SNOW_API.exportDictionary(table);
                
                if (!records || records.length === 0) {
                    schemaStatus.style.color = "#c62828";
                    schemaStatus.textContent = `No dictionary records found for table: ${table}`;
                } else {
                    if (format === 'json') {
                        this.triggerFileDownload(JSON.stringify(records, null, 2), `${table}_schema.json`, "application/json");
                    } else if (format === 'csv') {
                        let csv = "Column Label,Backend Name (element),Type,Reference Table,Max Length\n";
                        records.forEach(r => {
                            const label = r.column_label ? `"${r.column_label.replace(/"/g, '""')}"` : '""';
                            const ref = r.reference ? r.reference.value : '';
                            csv += `${label},${r.element},${r.internal_type},${ref},${r.max_length}\n`;
                        });
                        this.triggerFileDownload(csv, `${table}_schema.csv`, "text/csv");
                    }
                    schemaStatus.style.color = "#2e7d32";
                    schemaStatus.textContent = `Success! Exported ${records.length} fields.`;
                }
            } catch (error) {
                schemaStatus.style.color = "#c62828";
                schemaStatus.textContent = "Error: " + error.message;
            }

            btnExportCSV.disabled = false;
            btnExportJSON.disabled = false;
        }
    };
})();
