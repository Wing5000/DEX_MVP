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

        const dexAdapter = require('./src/adapters/dexAdapter');
        const liquidity = require('./src/liquidity');
        const addresses = require('./contractMap.json');
        const erc20Abi = [
            'function decimals() view returns (uint8)',
            'function balanceOf(address owner) view returns (uint256)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)'
        ];
        const wethAbi = [
            ...erc20Abi,
            'function deposit() payable',
            'function withdraw(uint256)'
        ];

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
        async function executeSwap() {
            try {
                const signer = provider.getSigner();
                const user = await signer.getAddress();

                const tokenInSel = document.getElementById('tokenIn');
                const tokenOutSel = document.getElementById('tokenOut');
                const amountInInput = document.getElementById('tokenInAmount');

                let tokenIn = tokenInSel?.dataset.address || 'eth';
                let tokenOut = tokenOutSel?.dataset.address || 'eth';
                const amountInRaw = amountInInput?.value || '0';

                const slippageText = document.getElementById('slippage')?.textContent || '0.5%';
                const deadlineText = document.getElementById('deadline')?.textContent || '20m';
                const slippagePct = parseFloat(slippageText);
                const deadlineMinutes = parseInt(deadlineText) || 20;

                let tokenInContract = tokenIn.toLowerCase() === 'eth'
                    ? new ethers.Contract(addresses.weth, wethAbi, signer)
                    : new ethers.Contract(tokenIn, erc20Abi, signer);
                let tokenOutContract = tokenOut.toLowerCase() === 'eth'
                    ? new ethers.Contract(addresses.weth, wethAbi, signer)
                    : new ethers.Contract(tokenOut, erc20Abi, signer);

                if (tokenIn.toLowerCase() === 'eth') {
                    const wrapTx = await tokenInContract.deposit({ value: ethers.utils.parseEther(amountInRaw) });
                    await wrapTx.wait();
                    tokenIn = addresses.weth;
                }

                const [decIn, decOut, balIn, balOut] = await Promise.all([
                    tokenInContract.decimals(),
                    tokenOutContract.decimals(),
                    tokenInContract.balanceOf(user),
                    tokenOutContract.balanceOf(user)
                ]);

                const amountIn = ethers.utils.parseUnits(amountInRaw, decIn);
                if (balIn.lt(amountIn)) {
                    showToast('Insufficient balance', 'error');
                    return;
                }

                const quoteOut = await dexAdapter.quote(tokenIn, tokenOut, amountIn, provider);
                const slippageBps = Math.floor(slippagePct * 100);
                const minOut = quoteOut.mul(10000 - slippageBps).div(10000);

                const minEl = document.getElementById('minReceived');
                if (minEl) {
                    minEl.textContent = ethers.utils.formatUnits(minOut, decOut);
                }

                const allowance = await tokenInContract.allowance(user, addresses.router);
                if (allowance.lt(amountIn)) {
                    const approveTx = await tokenInContract.approve(addresses.router, amountIn);
                    await approveTx.wait();
                }

                const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;

                const txRequest = await dexAdapter.buildSwapTx({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    amountOutMin: minOut,
                    to: user,
                    deadline
                }, signer);

                const txResponse = await signer.sendTransaction(txRequest);
                showToast('Transaction submitted', 'info');
                await txResponse.wait();

                if (tokenOut.toLowerCase() === 'eth') {
                    const unwrapTx = await tokenOutContract.withdraw(minOut);
                    await unwrapTx.wait();
                }

                showToast('Swap successful!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Swap failed', 'error');
            }
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

        // Ensure token approvals
        async function ensureApproval(token, amount, signer, spender) {
            const contract = new ethers.Contract(token, erc20Abi, signer);
            const owner = await signer.getAddress();
            const allowance = await contract.allowance(owner, spender);
            if (allowance.lt(amount)) {
                const tx = await contract.approve(spender, amount);
                await tx.wait();
            }
        }

        const tokenAInput = document.getElementById('tokenAAmount');
        const tokenBInput = document.getElementById('tokenBAmount');

        async function refreshAddLiquidity(changed) {
            const tokenA = document.getElementById('tokenASelect').dataset.address;
            const tokenB = document.getElementById('tokenBSelect').dataset.address;
            if (!tokenA || !tokenB) return;
            const pool = await liquidity.getPoolInfo(tokenA, tokenB, provider);
            if (!pool || !pool.reserves) return;
            const reserveA = parseFloat(ethers.utils.formatUnits(pool.reserves[tokenA.toLowerCase()] || '0', 18));
            const reserveB = parseFloat(ethers.utils.formatUnits(pool.reserves[tokenB.toLowerCase()] || '0', 18));
            if (changed === 'A') {
                const amountA = parseFloat(tokenAInput.value) || 0;
                const amountB = liquidity.calculateCounterpart(amountA, reserveA, reserveB);
                tokenBInput.value = amountB ? amountB.toFixed(6) : '';
                const share = liquidity.calculatePoolShare(amountA, reserveA);
                document.getElementById('poolShare').textContent = share.toFixed(2) + '%';
            } else {
                const amountB = parseFloat(tokenBInput.value) || 0;
                const amountA = liquidity.calculateCounterpart(amountB, reserveB, reserveA);
                tokenAInput.value = amountA ? amountA.toFixed(6) : '';
                const share = liquidity.calculatePoolShare(amountA, reserveA);
                document.getElementById('poolShare').textContent = share.toFixed(2) + '%';
            }
            if (reserveA && reserveB) {
                document.getElementById('priceAB').textContent = (reserveA / reserveB).toFixed(4);
                document.getElementById('priceBA').textContent = (reserveB / reserveA).toFixed(4);
            }
        }

        if (tokenAInput && tokenBInput) {
            tokenAInput.addEventListener('input', () => refreshAddLiquidity('A'));
            tokenBInput.addEventListener('input', () => refreshAddLiquidity('B'));
        }

        const addBtn = document.getElementById('addLiquidityBtn');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                const signer = provider.getSigner();
                const tokenA = document.getElementById('tokenASelect').dataset.address;
                const tokenB = document.getElementById('tokenBSelect').dataset.address;
                const amountA = ethers.utils.parseUnits(tokenAInput.value || '0', 18);
                const amountB = ethers.utils.parseUnits(tokenBInput.value || '0', 18);
                await ensureApproval(tokenA, amountA, signer, addresses.router);
                await ensureApproval(tokenB, amountB, signer, addresses.router);
                const to = await signer.getAddress();
                const deadlineMin = parseInt(document.getElementById('txDeadline').value) || 30;
                const deadline = Math.floor(Date.now() / 1000) + deadlineMin * 60;
                const tx = await liquidity.buildAddLiquidityTx({ tokenA, tokenB, amountA, amountB, to, deadline }, signer);
                await signer.sendTransaction(tx);
                showToast('Add liquidity transaction sent', 'success');
            });
        }

        async function updateRemoveInfo(pct) {
            const tokenA = document.getElementById('tokenASelect').dataset.address;
            const tokenB = document.getElementById('tokenBSelect').dataset.address;
            if (!tokenA || !tokenB) return;
            const pool = await liquidity.getPoolInfo(tokenA, tokenB, provider);
            if (!pool || !pool.pairAddress) return;
            const signer = provider.getSigner();
            const user = await signer.getAddress();
            const lp = new ethers.Contract(pool.pairAddress, erc20Abi, provider);
            const [balance, totalSupply] = await Promise.all([
                lp.balanceOf(user),
                lp.totalSupply()
            ]);
            const portion = balance.mul(Math.floor(pct * 100)).div(100);
            const amountA = ethers.BigNumber.from(pool.reserves[tokenA.toLowerCase()] || '0').mul(portion).div(totalSupply);
            const amountB = ethers.BigNumber.from(pool.reserves[tokenB.toLowerCase()] || '0').mul(portion).div(totalSupply);
            document.getElementById('pooledTokenA').textContent = `${ethers.utils.formatUnits(amountA, 18)} AAA`;
            document.getElementById('pooledTokenB').textContent = `${ethers.utils.formatUnits(amountB, 18)} BBB`;
            const share = portion.mul(10000).div(totalSupply).toNumber() / 100;
            document.getElementById('userPoolShare').textContent = share.toFixed(2) + '%';
        }

        const removePct = document.getElementById('removePercentOptions');
        if (removePct) {
            removePct.addEventListener('click', (e) => {
                const btn = e.target.closest('.slippage-btn');
                if (!btn) return;
                const pct = parseInt(btn.textContent) / 100;
                updateRemoveInfo(pct);
            });
        }

        const removeBtn = document.getElementById('removeLiquidityBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                const signer = provider.getSigner();
                const tokenA = document.getElementById('tokenASelect').dataset.address;
                const tokenB = document.getElementById('tokenBSelect').dataset.address;
                const pool = await liquidity.getPoolInfo(tokenA, tokenB, provider);
                if (!pool || !pool.pairAddress) return;
                const user = await signer.getAddress();
                const lp = new ethers.Contract(pool.pairAddress, erc20Abi, signer);
                const balance = await lp.balanceOf(user);
                const pct = parseInt(document.querySelector('#removePercentOptions .slippage-btn.active').textContent) / 100;
                const liquidityPortion = balance.mul(Math.floor(pct * 100)).div(100);
                await ensureApproval(pool.pairAddress, liquidityPortion, signer, addresses.router);
                const deadlineMin = parseInt(document.getElementById('txDeadline').value) || 30;
                const deadline = Math.floor(Date.now() / 1000) + deadlineMin * 60;
                const tx = await liquidity.buildRemoveLiquidityTx({ tokenA, tokenB, liquidity: liquidityPortion, to: user, deadline }, signer);
                await signer.sendTransaction(tx);
                showToast('Remove liquidity transaction sent', 'success');
            });
        }

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
    