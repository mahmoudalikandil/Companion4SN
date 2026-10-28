import { SNOW_API } from '../api';
import { SNOW_Bridge } from '../bridge';

export const StatsManager = {
    init: function () {
        const btnReloadStats = (document.getElementById('btnReloadStats') as HTMLButtonElement);
        if (btnReloadStats) {
            btnReloadStats.addEventListener('click', () => this.loadInstanceStats());
        }
    },

    async loadInstanceStats() {
        if (!window.activeInstanceData) return;

        const btnReloadStats = (document.getElementById('btnReloadStats') as HTMLButtonElement);
        const statVersion = document.getElementById('statVersion');
        const statBuildTag = document.getElementById('statBuildTag');
        const statMemoryRatio = document.getElementById('statMemoryRatio');
        const statMemoryPct = document.getElementById('statMemoryPct');
        const statMemoryBar = document.getElementById('statMemoryBar');
        const statSessions = document.getElementById('statSessions');
        const statTime = document.getElementById('statTime');
        const statDbPool = document.getElementById('statDbPool');
        const rawStatsOutput = document.getElementById('rawStatsOutput');

        if (statVersion) statVersion.textContent = "Loading stats...";
        if (statBuildTag) statBuildTag.textContent = "Fetching details...";
        if (rawStatsOutput) rawStatsOutput.textContent = "Connecting to stats.do...";
        if (btnReloadStats) btnReloadStats.textContent = "Reloading...";

        try {
            const stats = await SNOW_API.fetchStatsDo();

            if (statVersion) statVersion.textContent = stats.version;
            if (statBuildTag) statBuildTag.textContent = stats.buildTag || "No build tag available";

            if (stats.maxMemory && stats.freeMemory) {
                const usedMB = Math.round(stats.usedMemory / (1024 * 1024));
                const maxMB = Math.round(stats.maxMemory / (1024 * 1024));
                const pct = Math.round((stats.usedMemory / stats.maxMemory) * 100);

                if (statMemoryRatio) statMemoryRatio.textContent = `${usedMB} MB / ${maxMB} MB`;
                if (statMemoryPct) statMemoryPct.textContent = `${pct}% Used`;
                if (statMemoryBar) statMemoryBar.style.width = `${pct}%`;
            } else {
                if (statMemoryRatio) statMemoryRatio.textContent = "N/A";
                if (statMemoryPct) statMemoryPct.textContent = "Memory statistics unavailable";
                if (statMemoryBar) statMemoryBar.style.width = "0%";
            }

            if (statSessions) statSessions.textContent = `Sessions: ${stats.sessions}`;

            if (statTime) {
                if (stats.processorTime && stats.processorTime.toString().includes("total")) {
                    statTime.textContent = `Processor: ${stats.processorTime}`;
                } else {
                    statTime.textContent = `Processor Time: ${stats.processorTime || '--'} ms`;
                }
            }

            if (statDbPool) {
                if (stats.dbLatency) {
                    statDbPool.textContent = `Active Connections: ${stats.dbActive} / Capacity: ${stats.dbTotal} (Latency: ${stats.dbLatency}ms)`;
                } else {
                    statDbPool.textContent = `Active Connections: ${stats.dbActive} / Capacity: ${stats.dbTotal}`;
                }
            }

            if (rawStatsOutput) {
                if (stats.rawHeader) {
                    const lines = stats.rawHeader.split('\n');
                    let tableHtml = '<table class="beautified-stats-table">';
                    lines.forEach(line => {
                        const trimmed = line.trim();
                        if (!trimmed) return;

                        const colonIndex = trimmed.indexOf(':');
                        if (colonIndex > 0) {
                            const key = trimmed.substring(0, colonIndex).trim();
                            const val = trimmed.substring(colonIndex + 1).trim();
                            tableHtml += `<tr><td class="stat-key">${this.escapeHtml(key)}</td><td class="stat-val">${this.escapeHtml(val)}</td></tr>`;
                        } else {
                            tableHtml += `<tr class="stat-section-row"><td colspan="2">${this.escapeHtml(trimmed)}</td></tr>`;
                        }
                    });
                    tableHtml += '</table>';
                    rawStatsOutput.innerHTML = tableHtml;
                } else {
                    rawStatsOutput.innerHTML = '<div style="color: var(--p4m-text-muted); padding: 10px;">No headers extracted.</div>';
                }
            }
        } catch (err) {
            if (statVersion) statVersion.textContent = "Error Loading Stats";
            if (statBuildTag) statBuildTag.textContent = err.message;
            if (rawStatsOutput) rawStatsOutput.innerHTML = `<div style="color: #4b5563; padding: 10px;">Failure: ${this.escapeHtml(err.stack || err.message)}</div>`;
        } finally {
            if (btnReloadStats) btnReloadStats.textContent = "Reload Stats";
        }
    },

    escapeHtml: function (str) {
        if (!str) return '';
        return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
};
