// Selects a DEX adapter implementation based on feature flags
// Exports a common interface: quote, buildSwapTx, getPoolState

const settings = (typeof globalThis !== 'undefined' && globalThis.DEX_SETTINGS) || {};
const env = (typeof process !== 'undefined' && process.env) || {};

// Environment variables are strings, so normalize to booleans
const envUseV3 = env.USE_V3 === 'true';
// Default to V2 unless explicitly disabled
const envUseV2 = env.USE_V2 === 'false' ? false : true;

const useV3 = settings.USE_V3 || envUseV3;
const useV2 = settings.USE_V2 !== undefined ? settings.USE_V2 : envUseV2;

let adapter;

if (useV3) {
  // Prefer V3 if explicitly enabled
  adapter = require('./v3Adapter');
} else if (useV2) {
  // Default adapter
  adapter = require('./v2Adapter');
} else {
  // Fallback stub that throws to make missing configuration explicit
  adapter = {
    async quote() {
      throw new Error('No DEX adapter enabled');
    },
    async buildSwapTx() {
      throw new Error('No DEX adapter enabled');
    },
    async getPoolState() {
      throw new Error('No DEX adapter enabled');
    }
  };
}

module.exports = adapter;
