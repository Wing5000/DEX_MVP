const { Contract } = require('ethers');
const dexAdapter = require('./adapters/dexAdapter');
const addresses = require('../contractMap');

async function getPoolInfo(tokenA, tokenB, provider) {
  const state = await dexAdapter.getPoolState(tokenA, tokenB, provider);
  if (!state || !state.pairAddress) {
    return state;
  }
  const pair = new Contract(state.pairAddress, ['function totalSupply() view returns (uint256)'], provider);
  const totalSupply = await pair.totalSupply();
  return { ...state, totalSupply: totalSupply.toString() };
}

function calculateCounterpart(amountIn, reserveIn, reserveOut) {
  if (!reserveIn || !reserveOut || reserveIn === 0) return 0;
  return amountIn * (reserveOut / reserveIn);
}

function calculatePoolShare(amountIn, reserveIn) {
  if (!reserveIn || reserveIn === 0) return 0;
  return (amountIn / (reserveIn + amountIn)) * 100;
}

function calculatePriceImpact(amountIn, reserveIn, reserveOut, amountOut) {
  if (!reserveIn || !reserveOut || reserveIn === 0) return 0;
  const spotOut = amountIn * (reserveOut / reserveIn);
  if (!spotOut) return 0;
  return ((spotOut - amountOut) / spotOut) * 100;
}

async function buildAddLiquidityTx({ tokenA, tokenB, amountA, amountB, amountAMin, amountBMin, to, deadline }, signer) {
  const routerAbi = ['function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)'];
  const router = new Contract(addresses.router, routerAbi, signer);
  return router.populateTransaction.addLiquidity(tokenA, tokenB, amountA, amountB, amountAMin, amountBMin, to, deadline);
}

async function buildRemoveLiquidityTx({ tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline }, signer) {
  const routerAbi = ['function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)'];
  const router = new Contract(addresses.router, routerAbi, signer);
  return router.populateTransaction.removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);
}

module.exports = {
  getPoolInfo,
  calculateCounterpart,
  calculatePoolShare,
  calculatePriceImpact,
  buildAddLiquidityTx,
  buildRemoveLiquidityTx
};
