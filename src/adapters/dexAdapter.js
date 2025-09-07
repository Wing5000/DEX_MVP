// Selects a DEX adapter implementation based on environment flags
// Exports a common interface: quote, buildSwapTx, getPoolState

let adapter;

if (process.env.USE_V3) {
  // Prefer V3 if explicitly enabled
  adapter = require('./v3Adapter');
} else if (process.env.USE_V2) {
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
