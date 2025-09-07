const RPC_URL = (typeof process !== 'undefined' && process.env && process.env.VITE_SEPOLIA_RPC_URL) || '';

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
