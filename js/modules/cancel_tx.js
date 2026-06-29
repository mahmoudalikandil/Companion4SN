(function () {
    window.TransactionManager = {
        init: function () {
            const btnRefreshTx = document.getElementById('btnRefreshTx');
            const btnQuickCancelTx = document.getElementById('btnQuickCancelTx');

            if (btnRefreshTx) {
                btnRefreshTx.addEventListener('click', () => this.loadActiveTransactions());
            }
            if (btnQuickCancelTx) {
                btnQuickCancelTx.addEventListener('click', () => this.quickCancelCurrentTransaction());
            }
        },

        loadActiveTransactions: async function () {
            if (!window.activeInstanceData) return;

            const txTableBody = document.getElementById('txTableBody');
            const btnRefreshTx = document.getElementById('btnRefreshTx');
            const txStatus = document.getElementById('txStatus');

            if (!txTableBody) return;

            txTableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--p4m-text-muted); padding: 20px;">
                        Fetching active sessions...
                    </td>
                </tr>
            `;
            if (btnRefreshTx) btnRefreshTx.textContent = "Refreshing...";
            if (txStatus) txStatus.textContent = "";

            try {
                const txs = await window.SNOW_API.getActiveTransactions();
                txTableBody.innerHTML = "";

                if (!txs || txs.length === 0) {
                    txTableBody.innerHTML = `
                        <tr>
                            <td colspan="4" style="text-align: center; color: var(--p4m-text-muted); padding: 20px;">
                                No active transactions found on this node.
                            </td>
                        </tr>
                    `;
                    return;
                }

                txs.forEach(tx => {
                    const tr = document.createElement('tr');
                    
                    const tdThread = document.createElement('td');
                    tdThread.textContent = tx.thread_name || 'unknown';
                    tr.appendChild(tdThread);

                    const tdAge = document.createElement('td');
                    const ageSec = parseFloat(tx.age) || 0;
                    const ageSpan = document.createElement('span');
                    ageSpan.className = `tx-badge ${ageSec > 10 ? 'slow' : 'active'}`;
                    ageSpan.textContent = `${ageSec}s`;
                    tdAge.appendChild(ageSpan);
                    tr.appendChild(tdAge);

                    const tdUrl = document.createElement('td');
                    tdUrl.textContent = tx.url || '--';
                    tr.appendChild(tdUrl);

                    const tdAction = document.createElement('td');
                    tdAction.style.textAlign = "center";
                    const btnCancel = document.createElement('button');
                    btnCancel.className = "cancel-thread-btn";
                    btnCancel.textContent = "Cancel";
                    btnCancel.addEventListener('click', () => this.killTransactionThread(tx.sys_id, tx.thread_name));
                    tdAction.appendChild(btnCancel);
                    tr.appendChild(tdAction);

                    txTableBody.appendChild(tr);
                });
            } catch (err) {
                txTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #dc3545; padding: 20px;">
                            Failed to fetch transactions: ${err.message}
                        </td>
                    </tr>
                `;
            } finally {
                if (btnRefreshTx) btnRefreshTx.textContent = "Refresh Transactions";
            }
        },

        killTransactionThread: async function (sysId, name) {
            if (!confirm(`Are you sure you want to terminate thread: "${name}"?`)) return;

            const txStatus = document.getElementById('txStatus');
            if (txStatus) {
                txStatus.style.color = "var(--p4m-text-muted)";
                txStatus.textContent = "Sending termination signal...";
            }

            try {
                const output = await window.SNOW_API.cancelTransactionThread(sysId);
                if (output.includes("[SUCCESS]")) {
                    if (txStatus) {
                        txStatus.style.color = "#28a745";
                        txStatus.textContent = "Thread terminated successfully.";
                    }
                    setTimeout(() => this.loadActiveTransactions(), 1000);
                } else {
                    if (txStatus) {
                        txStatus.style.color = "#dc3545";
                        txStatus.textContent = `Cancel result: ${output.trim()}`;
                    }
                }
            } catch (err) {
                if (txStatus) {
                    txStatus.style.color = "#dc3545";
                    txStatus.textContent = `Termination failed: ${err.message}`;
                }
            }
        },

        quickCancelCurrentTransaction: async function () {
            const txStatus = document.getElementById('txStatus');
            if (txStatus) {
                txStatus.style.color = "var(--p4m-text-muted)";
                txStatus.textContent = "Canceling active browser session thread...";
            }

            try {
                const success = await window.SNOW_API.cancelCurrentTransaction();
                if (success) {
                    if (txStatus) {
                        txStatus.style.color = "#28a745";
                        txStatus.textContent = "Signal sent to /cancel_my_transaction.do.";
                    }
                    setTimeout(() => this.loadActiveTransactions(), 1500);
                } else {
                    if (txStatus) {
                        txStatus.style.color = "#dc3545";
                        txStatus.textContent = "Server responded with error.";
                    }
                }
            } catch (err) {
                if (txStatus) {
                    txStatus.style.color = "#dc3545";
                    txStatus.textContent = `Failed: ${err.message}`;
                }
            }
        }
    };
})();
