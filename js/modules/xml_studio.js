(function () {
    window.XmlStudio = {
        init: function () {
            const xmlEditorArea = document.getElementById('xmlEditorArea');
            const btnFormatXML = document.getElementById('btnFormatXML');
            const btnStripSysMeta = document.getElementById('btnStripSysMeta');
            const btnCopyXML = document.getElementById('btnCopyXML');
            const btnDownloadXML = document.getElementById('btnDownloadXML');

            if (!xmlEditorArea) return;

            if (btnFormatXML) {
                btnFormatXML.addEventListener('click', () => {
                    let rawXml = xmlEditorArea.value.trim();
                    if (!rawXml) return this.showXmlStatus("Editor is empty.", true);
                    try {
                        xmlEditorArea.value = this.formatXMLText(rawXml);
                        this.showXmlStatus("XML Formatted beautifully.");
                    } catch (e) {
                        this.showXmlStatus("Failed to format XML.", true);
                    }
                });
            }

            if (btnStripSysMeta) {
                btnStripSysMeta.addEventListener('click', () => {
                    let xml = xmlEditorArea.value;
                    if (!xml) return this.showXmlStatus("Editor is empty.", true);
                    
                    const tagsToStrip = ['sys_id', 'sys_created_by', 'sys_created_on', 'sys_updated_by', 'sys_updated_on', 'sys_mod_count', 'sys_tags'];
                    
                    let originalLength = xml.length;
                    tagsToStrip.forEach(tag => {
                        const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>\\n?`, 'g');
                        xml = xml.replace(regex, '');
                    });

                    if (xml.length === originalLength) {
                        this.showXmlStatus("No system metadata found to strip.");
                    } else {
                        xmlEditorArea.value = xml;
                        this.showXmlStatus("System metadata stripped successfully!");
                    }
                });
            }

            if (btnCopyXML) {
                btnCopyXML.addEventListener('click', () => {
                    if (!xmlEditorArea.value.trim()) return this.showXmlStatus("Nothing to copy.", true);
                    navigator.clipboard.writeText(xmlEditorArea.value).then(() => {
                        this.showXmlStatus("Copied to clipboard!");
                    }).catch(err => {
                        this.showXmlStatus("Clipboard copy failed.", true);
                    });
                });
            }

            if (btnDownloadXML) {
                btnDownloadXML.addEventListener('click', () => {
                    const xml = xmlEditorArea.value.trim();
                    if (!xml) return this.showXmlStatus("Cannot download empty file.", true);
                    this.triggerFileDownload(xml, `snow_payload_${Date.now()}.xml`, "application/xml");
                    this.showXmlStatus("File downloaded.");
                });
            }
        },

        showXmlStatus: function (message, isError = false) {
            const xmlStatus = document.getElementById('xmlStatus');
            if (!xmlStatus) return;
            xmlStatus.style.color = isError ? "#c62828" : "#2e7d32";
            xmlStatus.textContent = message;
            setTimeout(() => xmlStatus.textContent = "", 3000);
        },

        formatXMLText: function (xml) {
            let formatted = '';
            let pad = 0;
            xml = xml.replace(/(>)\s*(<)/g, "$1\n$2");
            
            xml.split('\n').forEach(function(node) {
                let indent = 0;
                if (node.match(/.+<\/\w[^>]*>$/)) {
                    indent = 0;
                } else if (node.match(/^<\/\w/)) {
                    if (pad !== 0) pad -= 1;
                } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                    indent = 1;
                }
                formatted += '    '.repeat(pad) + node + '\n';
                pad += indent;
            });
            return formatted.trim();
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
        }
    };
})();
