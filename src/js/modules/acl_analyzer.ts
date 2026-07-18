import { SNOW_API } from '../api';

export const AclAnalyzer = {
        aclTablesList: ['incident', 'change_request', 'problem', 'sys_user', 'sys_properties', 'task'],

        init: function () {
            const aclUserSearch = (document.getElementById('aclUserSearch') as HTMLInputElement);
            const btnAclSearchUser = (document.getElementById('btnAclSearchUser') as HTMLButtonElement);
            const aclUserSearchResults = document.getElementById('aclUserSearchResults');
            const btnAclCheckCustomTable = (document.getElementById('btnAclCheckCustomTable') as HTMLButtonElement);
            const aclCustomTableInput = (document.getElementById('aclCustomTableInput') as HTMLInputElement);
            const aclTargetUserSysId = document.getElementById('aclTargetUserSysId');
            const aclTargetUserName = document.getElementById('aclTargetUserName');

            if (!aclUserSearch || !btnAclSearchUser) return;

            btnAclSearchUser.addEventListener('click', async () => {
                const query = aclUserSearch.value.trim();
                if (!query) return;

                btnAclSearchUser.textContent = "...";
                aclUserSearchResults.innerHTML = '';
                aclUserSearchResults.classList.remove('hidden');

                try {
                    const users = await SNOW_API.searchUsers(query);
                    if (users.length === 0) {
                        aclUserSearchResults.innerHTML = '<li class="empty-state">No users found.</li>';
                    } else {
                        users.forEach((user: any) => {
                            const li = document.createElement('li');
                            
                            const strong = document.createElement('strong');
                            strong.textContent = user.name;
                            li.appendChild(strong);
                            
                            const textNode = document.createTextNode(` (${user.user_name})`);
                            li.appendChild(textNode);
                            
                            li.addEventListener('click', () => this.selectAclUser(user.sys_id, user.name));
                            aclUserSearchResults.appendChild(li);
                        });
                    }
                } catch (error: any) {
                    aclUserSearchResults.innerHTML = `<li class="empty-state" style="color:red;">Error: ${error.message}</li>`;
                }
                btnAclSearchUser.textContent = "Search";
            });

            aclUserSearch.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') btnAclSearchUser.click(); 
            });

            if (btnAclCheckCustomTable) {
                btnAclCheckCustomTable.addEventListener('click', async () => {
                    const customTbl = aclCustomTableInput.value.trim().toLowerCase();
                    if (!customTbl) return alert("Please enter a table name.");
                    
                    if (this.aclTablesList.includes(customTbl)) {
                        return alert("Table is already in the list.");
                    }

                    const activeUserSysId = aclTargetUserSysId.textContent.replace('sys_id: ', '').trim();
                    if (!activeUserSysId || activeUserSysId === 'None Selected') {
                        return alert("Please select a target user first.");
                    }

                    btnAclCheckCustomTable.disabled = true;
                    btnAclCheckCustomTable.textContent = "...";

                    try {
                        this.aclTablesList.push(customTbl);
                        await this.selectAclUser(activeUserSysId, aclTargetUserName.textContent);
                        aclCustomTableInput.value = '';
                    } catch(e) {
                        alert("Failed to analyze custom table: " + e.message);
                        this.aclTablesList = this.aclTablesList.filter(t => t !== customTbl);
                    }
                    btnAclCheckCustomTable.disabled = false;
                    btnAclCheckCustomTable.textContent = "Add Table";
                });
            }
        },

        selectAclUser: async function (sysId, name) {
            const aclUserSearchResults = document.getElementById('aclUserSearchResults');
            const aclUserCard = document.getElementById('aclUserCard');
            const aclTargetUserName = document.getElementById('aclTargetUserName');
            const aclTargetUserSysId = document.getElementById('aclTargetUserSysId');
            const aclDiagnosticsArea = document.getElementById('aclDiagnosticsArea');
            const aclResultsBox = document.getElementById('aclResultsBox');
            const aclOutput = document.getElementById('aclOutput');

            if (aclUserSearchResults) aclUserSearchResults.classList.add('hidden');
            if (aclUserCard) aclUserCard.classList.remove('hidden');
            if (aclTargetUserName) aclTargetUserName.textContent = name;
            if (aclTargetUserSysId) aclTargetUserSysId.textContent = `sys_id: ${sysId}`;
            
            if (aclDiagnosticsArea) aclDiagnosticsArea.classList.add('hidden');
            if (aclResultsBox) aclResultsBox.classList.remove('hidden');
            if (aclOutput) aclOutput.textContent = `Running security diagnostics context for ${name}...\n`;

            try {
                const responseText = await SNOW_API.analyzeUserAcls(sysId, this.aclTablesList);
                if (aclOutput) aclOutput.textContent = responseText;

                if (responseText.includes(">>>ACL_SUCCESS<<<")) {
                    if (aclResultsBox) aclResultsBox.classList.add('hidden');
                    if (aclDiagnosticsArea) aclDiagnosticsArea.classList.remove('hidden');
                    
                    const jsonStart = responseText.indexOf('{"roles_hierarchy"');
                    const jsonEnd = responseText.lastIndexOf('}') + 1;
                    
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        const jsonStr = responseText.substring(jsonStart, jsonEnd);
                        const data = JSON.parse(jsonStr);
                        
                        this.renderRoleTree(data.roles_hierarchy);
                        this.renderTableGrid(data.permissions);
                    } else {
                        if (aclResultsBox) {
                            aclResultsBox.classList.remove('hidden');
                            aclOutput.textContent += "\n[ERROR] Failed to parse analysis JSON payload.";
                        }
                    }
                } else {
                    if (aclResultsBox) {
                        aclResultsBox.classList.remove('hidden');
                        aclOutput.textContent += "\n[ERROR] Diagnostic run encountered server-side errors.";
                    }
                }
            } catch (error: any) {
                if (aclResultsBox) {
                    aclResultsBox.classList.remove('hidden');
                    aclOutput.textContent += `\n[CRITICAL ERROR] Failed to run diagnostics: ${error.message}`;
                }
            }
        },

        renderRoleTree: function (hierarchy) {
            const aclRoleTree = document.getElementById('aclRoleTree');
            if (!aclRoleTree) return;
            aclRoleTree.innerHTML = '';
            
            const directRoot = this.createTreeNode('Direct Roles', 'tree-role', '🔑', hierarchy.direct_roles.length > 0);
            if (hierarchy.direct_roles.length > 0) {
                hierarchy.direct_roles.forEach(role => {
                    const roleNode = this.createTreeNode(`${role.name}`, 'tree-role', '🛡️', role.contains.length > 0);
                    if (role.contains.length > 0) {
                        role.contains.forEach(child => {
                            const childNode = this.createTreeNode(child, 'tree-contained', '◽', false);
                            roleNode.childrenEl.appendChild(childNode.element);
                        });
                    }
                    directRoot.childrenEl.appendChild(roleNode.element);
                });
            } else {
                const emptyLi = document.createElement('div');
                emptyLi.className = 'empty-state';
                emptyLi.textContent = 'No direct roles assigned.';
                directRoot.childrenEl.appendChild(emptyLi);
            }
            aclRoleTree.appendChild(directRoot.element);

            const groupsRoot = this.createTreeNode('Groups & Group Roles', 'tree-group', '👥', hierarchy.groups.length > 0);
            if (hierarchy.groups.length > 0) {
                hierarchy.groups.forEach(group => {
                    const groupNode = this.createTreeNode(`${group.name}`, 'tree-group', '📁', group.roles.length > 0);
                    if (group.roles.length > 0) {
                        group.roles.forEach(role => {
                            const roleNode = this.createTreeNode(`${role.name}`, 'tree-role', '🛡️', role.contains.length > 0);
                            if (role.contains.length > 0) {
                                role.contains.forEach(child => {
                                    const childNode = this.createTreeNode(child, 'tree-contained', '◽', false);
                                    roleNode.childrenEl.appendChild(childNode.element);
                                });
                            }
                            groupNode.childrenEl.appendChild(roleNode.element);
                        });
                    } else {
                        const emptyLi = document.createElement('div');
                        emptyLi.className = 'empty-state';
                        emptyLi.textContent = 'No roles assigned to this group.';
                        groupNode.childrenEl.appendChild(emptyLi);
                    }
                    groupsRoot.childrenEl.appendChild(groupNode.element);
                });
            } else {
                const emptyLi = document.createElement('div');
                emptyLi.className = 'empty-state';
                emptyLi.textContent = 'No group memberships found.';
                groupsRoot.childrenEl.appendChild(emptyLi);
            }
            aclRoleTree.appendChild(groupsRoot.element);
        },

        createTreeNode: function (label, labelClass, iconSymbol, hasChildren = false) {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'tree-node';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'tree-node-header';

            const caretSpan = document.createElement('span');
            caretSpan.className = 'tree-caret';
            caretSpan.textContent = hasChildren ? '▶' : ' ';
            headerDiv.appendChild(caretSpan);

            const iconSpan = document.createElement('span');
            iconSpan.className = 'tree-icon';
            iconSpan.textContent = iconSymbol;
            headerDiv.appendChild(iconSpan);

            const textSpan = document.createElement('span');
            textSpan.className = labelClass;
            textSpan.textContent = label;
            headerDiv.appendChild(textSpan);

            nodeDiv.appendChild(headerDiv);

            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-children';
            nodeDiv.appendChild(childrenDiv);

            if (hasChildren) {
                headerDiv.addEventListener('click', () => {
                    const isExpanded = caretSpan.classList.toggle('expanded');
                    caretSpan.textContent = isExpanded ? '▼' : '▶';
                    childrenDiv.classList.toggle('active');
                });
            }

            return {
                element: nodeDiv,
                headerEl: headerDiv,
                childrenEl: childrenDiv
            };
        },

        renderTableGrid: function (permissions) {
            const aclTableGrid = document.getElementById('aclTableGrid');
            if (!aclTableGrid) return;
            aclTableGrid.innerHTML = '';
            
            for (let tbl in permissions) {
                const p = permissions[tbl];
                
                const row = document.createElement('div');
                row.className = 'table-access-row';

                const header = document.createElement('div');
                header.className = 'table-access-header';

                const nameLabel = document.createElement('span');
                nameLabel.className = 'table-name-label';
                nameLabel.textContent = tbl;
                header.appendChild(nameLabel);

                const indicators = document.createElement('div');
                indicators.className = 'crud-indicators';

                const ops = ['read', 'write', 'create', 'delete'];
                const labels = ['R', 'W', 'C', 'D'];
                
                ops.forEach((op, index) => {
                    const badge = document.createElement('span');
                    badge.className = p[op] ? 'crud-badge allow' : 'crud-badge deny';
                    badge.textContent = labels[index];
                    
                    if (!p[op]) {
                        badge.title = 'Click to show missing roles';
                        badge.addEventListener('click', () => this.showAclWarning(row, tbl, op, p.missing_roles[op]));
                    }
                    
                    indicators.appendChild(badge);
                });

                header.appendChild(indicators);
                row.appendChild(header);
                
                const warningContainer = document.createElement('div');
                warningContainer.className = 'warning-container';
                row.appendChild(warningContainer);

                aclTableGrid.appendChild(row);
            }
        },

        showAclWarning: function (rowEl, tbl, op, missingAcls) {
            const container = rowEl.querySelector('.warning-container');
            const existing = container.querySelector('.acl-warning-box');
            if (existing) {
                existing.remove();
                return;
            }

            const warningBox = document.createElement('div');
            warningBox.className = 'acl-warning-box';

            if (!missingAcls || missingAcls.length === 0) {
                warningBox.textContent = `Access denied by ACL condition, script, or system restriction on table "${tbl}" (operation: ${op}).`;
            } else {
                const header = document.createElement('strong');
                header.textContent = `Missing Role(s) for ${op.toUpperCase()}:`;
                warningBox.appendChild(header);

                const list = document.createElement('ul');
                list.style.margin = '4px 0 0 10px';
                list.style.padding = '0';
                list.style.fontSize = '10px';

                missingAcls.forEach(acl => {
                    const li = document.createElement('li');
                    li.style.listStyleType = 'disc';
                    li.textContent = `Rule "${acl.acl_name}" requires: ${acl.required_roles.join(' OR ')}`;
                    list.appendChild(li);
                });
                warningBox.appendChild(list);
            }

            container.appendChild(warningBox);
        }
    };
