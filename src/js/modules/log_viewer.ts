import { SNOW_API } from '../api';
import { SNOW_Bridge } from '../bridge';

export const RealTimeLogViewer = {
        logStreamInterval: null as any,
        seenLogIds: new Set(),
        isStreaming: false,
        lastLogTime: '',

        init: function () {
            const btnStreamLogs = document.getElementById('btnStreamLogs');
            const btnClearLogs = document.getElementById('btnClearLogs');

            if (!btnStreamLogs) return;

            btnStreamLogs.addEventListener('click', () => this.toggleStream());

            if (btnClearLogs) {
                btnClearLogs.addEventListener('click', () => {
                    const logTerminal = document.getElementById('logTerminal');
                    if (logTerminal) {
                        logTerminal.innerHTML = '';
                        this.appendLog('', '', 'Terminal cleared.', '', true);
                    }
                });
            }
        },

        appendLog: function (level, source, message, time, isSystem = false) {
            const logTerminal = document.getElementById('logTerminal');
            if (!logTerminal) return;

            const div = document.createElement('div');
            div.className = isSystem ? 'log-entry log-system' : 'log-entry';
            
            if (isSystem) {
                div.textContent = `[System] ${message}`;
            } else {
                let levelClass = 'log-level-info';
                let levelText = 'INFO';
                if (level === '0' || level === 'error') { levelClass = 'log-level-error'; levelText = 'ERROR'; }
                if (level === '1' || level === 'warning') { levelClass = 'log-level-warning'; levelText = 'WARN'; }

                const metaSpan = document.createElement('span');
                metaSpan.className = 'log-meta';
                metaSpan.textContent = `${time} | Source: ${source}`;
                div.appendChild(metaSpan);

                div.appendChild(document.createTextNode(' '));

                const levelSpan = document.createElement('span');
                levelSpan.className = levelClass;
                levelSpan.textContent = `[${levelText}]`;
                div.appendChild(levelSpan);

                div.appendChild(document.createTextNode(` ${message}`));
            }

            logTerminal.appendChild(div);
            logTerminal.scrollTop = logTerminal.scrollHeight;
        },

        pollLogs: async function () {
            if (!this.isStreaming) return;

            const logFilterInput = document.getElementById('logFilterInput') as HTMLInputElement | null;
            try {
                const query = this.lastLogTime ? `sys_created_on>=${this.lastLogTime}` : 'sys_created_on>=javascript:gs.beginningOfToday()';
                const limit = this.lastLogTime ? 100 : 500;

                const logs = await SNOW_API.fetchLogs(query, limit);
                const filterText = logFilterInput ? logFilterInput.value.trim().toLowerCase() : '';
                
                const newLogs = logs.reverse().filter(log => {
                    if (this.seenLogIds.has(log.sys_id)) return false;
                    
                    if (filterText) {
                        const matchSource = (log.source || '').toLowerCase().includes(filterText);
                        const matchMsg = (log.message || '').toLowerCase().includes(filterText);
                        if (!matchSource && !matchMsg) return false;
                    }
                    
                    return true;
                });

                newLogs.forEach(log => {
                    this.seenLogIds.add(log.sys_id);
                    this.appendLog(log.level, log.source, log.message, log.sys_created_on);
                    
                    if (!this.lastLogTime || log.sys_created_on > this.lastLogTime) {
                        this.lastLogTime = log.sys_created_on;
                    }
                });

            } catch (error) {
                this.appendLog('0', 'Extension API', `Failed to fetch logs: ${error.message}`, '', false);
                this.pause();
            }
        },

        pause: function () {
            if (!this.isStreaming) return;
            const btnStreamLogs = document.getElementById('btnStreamLogs');
            
            clearInterval(this.logStreamInterval);
            this.isStreaming = false;
            if (btnStreamLogs) {
                btnStreamLogs.textContent = "Start Stream";
                btnStreamLogs.className = "primary-btn";
                btnStreamLogs.removeAttribute('style');
            }
            this.appendLog('', '', 'Stream paused.', '', true);
        },

        toggleStream: function () {
            const btnStreamLogs = document.getElementById('btnStreamLogs');
            if (this.isStreaming) {
                this.pause();
            } else {
                if (!window.activeInstanceData) return alert("Not connected to instance.");
                this.isStreaming = true;
                if (btnStreamLogs) {
                    btnStreamLogs.textContent = "Stop Stream";
                    btnStreamLogs.className = "secondary-btn";
                    btnStreamLogs.style.borderColor = "#cb1214";
                    btnStreamLogs.style.color = "#cb1214";
                }
                
                this.appendLog('', '', 'Initiating stream connection...', '', true);
                
                this.seenLogIds.clear();
                this.lastLogTime = '';
                
                this.pollLogs();
                this.logStreamInterval = setInterval(() => this.pollLogs(), 3000);
            }
        }
    };
