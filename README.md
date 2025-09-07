# DEX MVP

## Environment Variables

Create a `.env` file based on `.env.example` to configure RPC and contract addresses.

```
cp .env.example .env
# edit .env with your values
```

### Required
- `VITE_SEPOLIA_RPC_URL` – JSON‑RPC URL for Sepolia.
- `VITE_V2_FACTORY` – address of the V2 factory contract.
- `VITE_V2_ROUTER` – address of the V2 router contract.
- `VITE_WETH` – address of the wrapped native token.

### Optional
- `VITE_V3_FACTORY` – address of the V3 factory contract.
- `VITE_V3_QUOTER_V2` – address of the V3 quoterV2 contract.
- `VITE_V3_SWAP_ROUTER` – address of the V3 swap router.

The build system (e.g. Vite or a plain JS bundler) replaces these variables during build time.
`networkConfig.js` uses `VITE_SEPOLIA_RPC_URL` for RPC connections, and `contractMap.js` merges the other variables into `contractMap.json` so the application uses the provided addresses at runtime.

## Global Settings

A `settings.js` script exposes runtime feature flags on `window.DEX_SETTINGS` for troubleshooting:

```js
window.DEX_SETTINGS = {
  LOG_ABI: false, // enable ABI call logging in development
  USE_V2: true,   // use the v2 adapter (default)
  USE_V3: false   // opt into the v3 adapter
};
```

These values can be toggled from the browser console to switch adapters or enable logging without rebuilding.
