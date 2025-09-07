        // Theme Toggle
        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        }
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const DEFAULT_CHAIN_ID = 11155111;
        const sepoliaConfig = window.networkConfig[DEFAULT_CHAIN_ID];
        let provider;

        if (window.ethereum) {
            provider = new ethers.providers.Web3Provider(window.ethereum);
        } else {
            provider = new ethers.providers.JsonRpcProvider(sepoliaConfig.rpcUrl);
        }

        document.getElementById('networkName').textContent = sepoliaConfig.chainName;

        const networkListEl = document.getElementById('networkList');
        Object.keys(window.networkConfig).forEach(id => {
            const cfg = window.networkConfig[id];
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-full justify-between';
            btn.innerHTML = `<span>${cfg.chainName}</span>`;
            btn.addEventListener('click', () => selectNetwork(parseInt(id)));
            if (parseInt(id) === DEFAULT_CHAIN_ID) {
                const indicator = document.createElement('span');
                indicator.className = 'network-indicator';
                btn.appendChild(indicator);
            }
            networkListEl.appendChild(btn);
        });

        // Modal Functions
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }
        
        function openTokenModal(side) {
            window.tokenSide = side;
            openModal('tokenModal');
        }
        
        function openWalletModal() {
            openModal('walletModal');
        }
        
        function openSettings() {
            openModal('settingsModal');
        }
        
        function openNetworkModal() {
            openModal('networkModal');
        }
        
        // Select Token
        function selectToken(token) {
            closeModal('tokenModal');
            showToast(`Selected ${token}`, 'success');
        }
        
        // Connect Wallet
        async function connectWallet(providerName) {
            closeModal('walletModal');
            const cfg = window.networkConfig[DEFAULT_CHAIN_ID];

            if (window.ethereum) {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
                    if (currentChain !== cfg.chainIdHex) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: cfg.chainIdHex,
                                chainName: cfg.chainName,
                                rpcUrls: [cfg.rpcUrl],
                                blockExplorerUrls: [cfg.explorerUrl],
                                nativeCurrency: cfg.nativeCurrency
                            }]
                        });
                    }
                    provider = new ethers.providers.Web3Provider(window.ethereum);
                } catch (err) {
                    showToast('Wallet connection failed', 'error');
                    return;
                }
            } else {
                provider = new ethers.providers.JsonRpcProvider(cfg.rpcUrl);
            }

            document.getElementById('connectBtn').innerHTML = '0x1234...5678';
            document.getElementById('connectBtn').classList.remove('btn-primary');
            document.getElementById('connectBtn').classList.add('btn-secondary');
            showToast(`Connected with ${providerName}`, 'success');

            switchScreen('swap');
        }

        // Select Network
        async function selectNetwork(chainId) {
            closeModal('networkModal');
            const cfg = window.networkConfig[chainId];
            document.getElementById('networkName').textContent = cfg.chainName;

            if (window.ethereum) {
                const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
                if (currentChain !== cfg.chainIdHex) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: cfg.chainIdHex,
                            chainName: cfg.chainName,
                            rpcUrls: [cfg.rpcUrl],
                            blockExplorerUrls: [cfg.explorerUrl],
                            nativeCurrency: cfg.nativeCurrency
                        }]
                    });
                }
                provider = new ethers.providers.Web3Provider(window.ethereum);
                showToast(`Switched to ${cfg.chainName}`, 'success');
            } else {
                provider = new ethers.providers.JsonRpcProvider(cfg.rpcUrl);
                showToast(`No wallet found. Using ${cfg.chainName} RPC`, 'info');
            }
        }
        
        // Execute Swap
        function executeSwap() {
            showToast('Transaction submitted', 'info');
            setTimeout(() => {
                showToast('Swap successful! 100 AAA → 2,847.32 BBB', 'success');
            }, 2000);
        }
        
        // Switch Pool Tab
        function switchPoolTab(tab, type) {
            document.querySelectorAll('.pool-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (type === 'add') {
                document.getElementById('add-liquidity').classList.remove('hidden');
                document.getElementById('remove-liquidity').classList.add('hidden');
            } else {
                document.getElementById('add-liquidity').classList.add('hidden');
                document.getElementById('remove-liquidity').classList.remove('hidden');
            }
        }
        
        // Toast Notification
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = 'toast';

            const icon = {
                success: '✓',
                error: '✕',
                warning: '⚠️',
                info: 'ℹ️'
            }[type];

            const iconEl = document.createElement('span');
            iconEl.style.fontSize = '1.25rem';
            iconEl.textContent = icon;

            const messageEl = document.createElement('span');
            messageEl.textContent = message;

            toast.appendChild(iconEl);
            toast.appendChild(messageEl);

            document.getElementById('toastContainer').appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
        
        // Screen Navigation
        function switchScreen(screenName) {
            // Hide all screens
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            
            // Show selected screen
            document.getElementById(`${screenName}-screen`).classList.add('active');
            
            // Update nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-screen') === screenName) {
                    link.classList.add('active');
                }
            });
        }
        
        // Nav link click handlers
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = link.getAttribute('data-screen');
                switchScreen(screen);
            });
        });
        
        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
        
        // Slippage button handlers via event delegation
        document.querySelectorAll('.slippage-options').forEach(container => {
            container.addEventListener('click', (event) => {
                const btn = event.target.closest('.slippage-btn');
                if (!btn) return;
                container.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Token list hover and selection using event delegation
        const tokenList = document.querySelector('.token-list');
        if (tokenList) {
            tokenList.addEventListener('mouseenter', (event) => {
                const item = event.target.closest('.token-item');
                if (item && tokenList.contains(item)) {
                    item.classList.add('hover');
                }
            }, true);

            tokenList.addEventListener('mouseleave', (event) => {
                const item = event.target.closest('.token-item');
                if (item && tokenList.contains(item)) {
                    item.classList.remove('hover');
                }
            }, true);

            tokenList.addEventListener('click', (event) => {
                const tokenItem = event.target.closest('.token-item');
                if (tokenItem) {
                    const token = tokenItem.dataset.token;
                    selectToken(token);
                }
            });
        }

        // Simulate loading states
        function showLoadingState() {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton';
            skeleton.style.height = '60px';
            skeleton.style.marginBottom = 'var(--s2)';
            return skeleton;
        }
        
        // Price refresh animation
        setInterval(() => {
            const priceElements = document.querySelectorAll('.price-info-value .text-mono');
            priceElements.forEach(el => {
                el.style.opacity = '0.5';
                setTimeout(() => {
                    el.style.opacity = '1';
                }, 100);
            });
        }, 10000);
        
        // Initialize
        console.log('SwiftDEX V1 initialized');
    