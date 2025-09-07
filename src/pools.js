const { ethers } = require('ethers');
const dexAdapter = require('./adapters/dexAdapter');
const addresses = require('../contractMap.json');
const { fromBaseUnits } = require('./utils');

async function defaultPriceOracle() {
  // Placeholder price oracle - returns 1 USD for any token
  return 1;
}

async function getPools(provider, priceOracle = defaultPriceOracle) {
  const pairs = addresses.pairs || [];
  const results = [];
  for (const pair of pairs) {
    try {
      const state = await dexAdapter.getPoolState(pair.tokenA, pair.tokenB, provider);
      if (!state || !state.pairAddress) {
        results.push({ ...pair, error: 'Pool not found' });
        continue;
      }
      const reserveA = BigInt(state.reserves[pair.tokenA.toLowerCase()] || '0');
      const reserveB = BigInt(state.reserves[pair.tokenB.toLowerCase()] || '0');
      const priceA = await priceOracle(pair.tokenA);
      const priceB = await priceOracle(pair.tokenB);
      const tvl =
        parseFloat(fromBaseUnits(reserveA, 18)) * priceA +
        parseFloat(fromBaseUnits(reserveB, 18)) * priceB;
      results.push({
        ...pair,
        pairAddress: state.pairAddress,
        reserves: state.reserves,
        tvl
      });
    } catch (err) {
      results.push({ ...pair, error: err.message });
    }
  }
  return results;
}

module.exports = {
  getPools,
  defaultPriceOracle
};
