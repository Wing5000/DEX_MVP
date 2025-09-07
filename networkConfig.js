const RPC_URL = (typeof process !== 'undefined' && process.env && process.env.VITE_SEPOLIA_RPC_URL) || '';

if (!RPC_URL) {
  const msg = 'RPC_URL is not set. Initialization halted.';
  if (typeof console !== 'undefined') console.error(msg);
  if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
  throw new Error(msg);
}

window.networkConfig = {
  11155111: {
    chainIdHex: '0xaa36a7',
    chainName: 'Sepolia',
    rpcUrl: RPC_URL,
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
};
