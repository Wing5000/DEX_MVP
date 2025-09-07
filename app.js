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
        function connectWallet(provider) {
            closeModal('walletModal');
            document.getElementById('connectBtn').innerHTML = '0x1234...5678';
            document.getElementById('connectBtn').classList.remove('btn-primary');
            document.getElementById('connectBtn').classList.add('btn-secondary');
            showToast(`Connected with ${provider}`, 'success');
            
            // Switch to swap screen after connecting
            switchScreen('swap');
        }
        
        // Select Network
        function selectNetwork(network) {
            closeModal('networkModal');
            document.querySelector('.network-badge span:nth-child(2)').textContent = network;
            showToast(`Switched to ${network}`, 'success');
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
            
            toast.innerHTML = `
                <span style="font-size: 1.25rem">${icon}</span>
                <span>${message}</span>
            `;
            
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
        
        // Slippage button handlers
        document.querySelectorAll('.slippage-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.parentElement.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
        // Add smooth hover effects to token items
        document.querySelectorAll('.token-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.querySelector('div').style.background = 'var(--bg-elev)';
            });
            item.addEventListener('mouseleave', function() {
                this.querySelector('div').style.background = 'transparent';
            });
        });

        // Token selection via event delegation
        document.querySelectorAll('.token-list').forEach(list => {
            list.addEventListener('click', (event) => {
                const tokenItem = event.target.closest('.token-item');
                if (tokenItem) {
                    const token = tokenItem.dataset.token;
                    selectToken(token);
                }
            });
        });

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
    