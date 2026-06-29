(function () {
    window.Impersonator = {
        init: function () {
            const searchInput = document.getElementById('impersonateSearch');
            const btnSearch = document.getElementById('btnSearchUser');
            const searchResults = document.getElementById('userSearchResults');

            if (!btnSearch || !searchInput || !searchResults) return;

            btnSearch.addEventListener('click', async () => {
                const query = searchInput.value.trim();
                if (!query) return;

                btnSearch.textContent = "...";
                searchResults.innerHTML = '';
                searchResults.classList.remove('hidden');

                try {
                    const users = await window.SNOW_API.searchUsers(query);
                    if (users.length === 0) {
                        searchResults.innerHTML = '<li class="empty-state">No users found.</li>';
                    } else {
                        users.forEach(user => {
                            const li = document.createElement('li');
                            
                            const strong = document.createElement('strong');
                            strong.textContent = user.name;
                            li.appendChild(strong);
                            
                            const textNode = document.createTextNode(` (${user.user_name})`);
                            li.appendChild(textNode);
                            
                            li.addEventListener('click', () => this.triggerImpersonation(user.sys_id, user.name));
                            searchResults.appendChild(li);
                        });
                    }
                } catch (error) {
                    searchResults.innerHTML = `<li class="empty-state" style="color:red;">Error: ${error.message}</li>`;
                }
                btnSearch.textContent = "Search";
            });

            searchInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') btnSearch.click(); 
            });
        },

        triggerImpersonation: async function (sysId, name) {
            try {
                await window.SNOW_API.impersonateUser(sysId);
                alert(`Success! Impersonating ${name}. Refreshing page...`);
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0]) chrome.tabs.reload(tabs[0].id);
                });
                setTimeout(() => window.close(), 1000);
            } catch (error) {
                alert(`Failed to impersonate: ${error.message}`);
            }
        }
    };
})();
