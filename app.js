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

        const GAS_MULTIPLIER = parseFloat(localStorage.getItem('gasMultiplier') || '1.15');

        const dexAdapter = require('./src/adapters/dexAdapter');
        const liquidity = require('./src/liquidity');
        const pools = require('./src/pools');
        const addresses = require('./contractMap.json');
        const erc20Abi = [
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)',
            'function balanceOf(address owner) view returns (uint256)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)'
        ];
        const wethAbi = [
            ...erc20Abi,
            'function deposit() payable',
            'function withdraw(uint256)'
        ];

        const tokenCache = JSON.parse(localStorage.getItem('tokenCache') || '{}');
        let tokens = [];

        async function getTokenMetadata(address) {
            const addr = ethers.utils.getAddress(address);
            if (tokenCache[addr]) return tokenCache[addr];
            const contract = new ethers.Contract(addr, erc20Abi, provider);
            const [symbol, decimals] = await Promise.all([
                contract.symbol(),
                contract.decimals()
            ]);
            tokenCache[addr] = { symbol, decimals };
            localStorage.setItem('tokenCache', JSON.stringify(tokenCache));
            return tokenCache[addr];
        }

        function addTokenToUI(token) {
            const listEl = document.getElementById('tokenList');
            const item = document.createElement('div');
            item.className = 'token-item';
            item.dataset.address = token.address;
            item.innerHTML = `<div class="flex items-center justify-between token-row">
                                <div class="flex items-center gap-2">
                                    <div class="token-icon" style="background-image: url(${token.icon}); background-size: cover;"></div>
                                    <div>
                                        <div>${token.symbol}</div>
                                        <div class="text-xs text-muted">${token.name || ''}</div>
                                    </div>
                                </div>
                              </div>`;
            item.addEventListener('click', () => selectToken(token.address));
            listEl.appendChild(item);
        }

        async function loadTokens() {
            const res = await fetch('./tokens.json');
            tokens = await res.json();
            const popularEl = document.getElementById('popularTokens');
            tokens.forEach(t => {
                addTokenToUI(t);
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary btn-sm';
                btn.textContent = t.symbol;
                btn.addEventListener('click', () => selectToken(t.address));
                popularEl.appendChild(btn);
            });
        }
        loadTokens();

        document.getElementById('tokenSearch').addEventListener('change', async (e) => {
            const val = e.target.value.trim();
            if (ethers.utils.isAddress(val) && !tokens.find(t => t.address.toLowerCase() === val.toLowerCase())) {
                try {
                    const meta = await getTokenMetadata(val);
                    const newToken = {
                        address: ethers.utils.getAddress(val),
                        symbol: meta.symbol,
                        decimals: meta.decimals,
                        name: meta.symbol,
                        icon: `https://via.placeholder.com/32/aaa/ffffff?text=${meta.symbol[0] || '?'}`
                    };
                    tokens.push(newToken);
                    addTokenToUI(newToken);
                    e.target.value = '';
                    showToast(`Imported ${meta.symbol}`, 'success');
                } catch (err) {
                    showToast('Could not fetch token metadata', 'error');
                }
            }
        });

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
        async function selectToken(address) {
            const meta = await getTokenMetadata(address);
            const tokenInfo = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
            if (tokenInfo && ((tokenInfo.symbol && tokenInfo.symbol !== meta.symbol) || (tokenInfo.decimals != null && tokenInfo.decimals !== meta.decimals))) {
                showToast('Token metadata mismatch', 'warning');
            }
            const target = document.getElementById(window.tokenSide === 'from' ? 'tokenIn' : 'tokenOut');
            target.dataset.address = address;
            const iconEl = target.querySelector('.token-icon');
            if (iconEl) {
                iconEl.style.backgroundImage = `url(${tokenInfo?.icon || 'https://via.placeholder.com/32/ccc/ffffff'})`;
                iconEl.style.backgroundSize = 'cover';
            }
            const span = target.querySelector('span');
            if (span) span.textContent = meta.symbol;
            closeModal('tokenModal');
            showToast(`Selected ${meta.symbol}`, 'success');
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

                const poolState = await dexAdapter.getPoolState(tokenIn, tokenOut, provider);
                if (poolState && poolState.reserves) {
                    const reserveInKey = tokenIn.toLowerCase();
                    const reserveOutKey = tokenOut.toLowerCase() === 'eth' ? addresses.weth.toLowerCase() : tokenOut.toLowerCase();
                    const reserveInF = parseFloat(ethers.utils.formatUnits(poolState.reserves[reserveInKey] || '0', decIn));
                    const reserveOutF = parseFloat(ethers.utils.formatUnits(poolState.reserves[reserveOutKey] || '0', decOut));
                    const amountInF = parseFloat(ethers.utils.formatUnits(amountIn, decIn));
                    const quoteOutF = parseFloat(ethers.utils.formatUnits(quoteOut, decOut));
                    const impact = liquidity.calculatePriceImpact(amountInF, reserveInF, reserveOutF, quoteOutF);
                    const impactEl = document.getElementById('priceImpact');
                    if (impactEl) {
                        impactEl.textContent = impact.toFixed(2) + '%';
                    }
                }

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

                const gasEstimate = await signer.estimateGas(txRequest);
                txRequest.gasLimit = gasEstimate.mul(Math.floor(GAS_MULTIPLIER * 100)).div(100);

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

        // Pool data loading
        async function loadPools() {
            const tbody = document.getElementById('poolsTableBody');
            if (!tbody) return;
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">Loading pools...</td></tr>`;
            try {
                const data = await pools.getPools(provider, pools.defaultPriceOracle);
                tbody.innerHTML = '';
                data.forEach(pool => {
                    if (pool.error) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td colspan="6" class="text-center text-error">${pool.name || 'Unknown'}: ${pool.error}</td>`;
                        tbody.appendChild(tr);
                        return;
                    }
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                            <td>${pool.name}</td>
                            <td class="text-mono">$${pool.tvl.toFixed(2)}</td>
                            <td class="text-mono">-</td>
                            <td class="text-mono">-</td>
                            <td>-</td>
                            <td><button class="btn btn-sm btn-primary">Add</button></td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">${err.message}</td></tr>`;
            }
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
            if (screenName === 'pools') {
                loadPools();
            }
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
            let amountA, amountB;
            if (changed === 'A') {
                amountA = parseFloat(tokenAInput.value) || 0;
                amountB = liquidity.calculateCounterpart(amountA, reserveA, reserveB);
                tokenBInput.value = amountB ? amountB.toFixed(6) : '';
            } else {
                amountB = parseFloat(tokenBInput.value) || 0;
                amountA = liquidity.calculateCounterpart(amountB, reserveB, reserveA);
                tokenAInput.value = amountA ? amountA.toFixed(6) : '';
            }
            const share = liquidity.calculatePoolShare(amountA, reserveA);
            document.getElementById('poolShare').textContent = share.toFixed(2) + '%';
            const impact = liquidity.calculatePriceImpact(amountA, reserveA, reserveB, amountB);
            if (console && !isNaN(impact)) console.log('Add liquidity price impact', impact);
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
                const to = await signer.getAddress();

                const tokenAContract = new ethers.Contract(tokenA, erc20Abi, signer);
                const tokenBContract = new ethers.Contract(tokenB, erc20Abi, signer);
                const [balA, balB] = await Promise.all([
                    tokenAContract.balanceOf(to),
                    tokenBContract.balanceOf(to)
                ]);
                if (balA.lt(amountA) || balB.lt(amountB)) {
                    showToast('Insufficient balance', 'error');
                    return;
                }

                await ensureApproval(tokenA, amountA, signer, addresses.router);
                await ensureApproval(tokenB, amountB, signer, addresses.router);

                const slippageText = document.getElementById('slippage')?.textContent || '0.5%';
                const slippageBps = Math.floor(parseFloat(slippageText) * 100);
                const amountAMin = amountA.mul(10000 - slippageBps).div(10000);
                const amountBMin = amountB.mul(10000 - slippageBps).div(10000);

                const deadlineMin = parseInt(document.getElementById('txDeadline').value) || 30;
                const deadline = Math.floor(Date.now() / 1000) + deadlineMin * 60;
                const tx = await liquidity.buildAddLiquidityTx({ tokenA, tokenB, amountA, amountB, amountAMin, amountBMin, to, deadline }, signer);
                const gasEstimate = await signer.estimateGas(tx);
                tx.gasLimit = gasEstimate.mul(Math.floor(GAS_MULTIPLIER * 100)).div(100);
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
                if (balance.lt(liquidityPortion)) {
                    showToast('Insufficient balance', 'error');
                    return;
                }
                await ensureApproval(pool.pairAddress, liquidityPortion, signer, addresses.router);

                const totalSupply = ethers.BigNumber.from(pool.totalSupply || '0');
                const amountAExp = ethers.BigNumber.from(pool.reserves[tokenA.toLowerCase()] || '0').mul(liquidityPortion).div(totalSupply);
                const amountBExp = ethers.BigNumber.from(pool.reserves[tokenB.toLowerCase()] || '0').mul(liquidityPortion).div(totalSupply);
                const slippageText = document.getElementById('slippage')?.textContent || '0.5%';
                const slippageBps = Math.floor(parseFloat(slippageText) * 100);
                const amountAMin = amountAExp.mul(10000 - slippageBps).div(10000);
                const amountBMin = amountBExp.mul(10000 - slippageBps).div(10000);

                const deadlineMin = parseInt(document.getElementById('txDeadline').value) || 30;
                const deadline = Math.floor(Date.now() / 1000) + deadlineMin * 60;
                const tx = await liquidity.buildRemoveLiquidityTx({ tokenA, tokenB, liquidity: liquidityPortion, amountAMin, amountBMin, to: user, deadline }, signer);
                const gasEstimate = await signer.estimateGas(tx);
                tx.gasLimit = gasEstimate.mul(Math.floor(GAS_MULTIPLIER * 100)).div(100);
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
    