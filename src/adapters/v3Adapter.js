const { Contract } = require('ethers');
const addresses = require('../../contractMap.json');

const quoterAbi = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

const routerAbi = [
  'function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

const factoryAbi = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)'
];

const poolAbi = [
  'function slot0() external view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)',
  'function liquidity() external view returns (uint128)'
];

function toAddress(token) {
  if (!token) return token;
  if (token.toLowerCase() === 'eth') return addresses.weth;
  return token;
}

async function quote(tokenIn, tokenOut, amountIn, provider, fee = 3000) {
  const quoter = new Contract(addresses.v3.quoterV2, quoterAbi, provider);
  return quoter.quoteExactInputSingle(
    toAddress(tokenIn),
    toAddress(tokenOut),
    fee,
    amountIn,
    0
  );
}

async function buildSwapTx(params, signer) {
  const { tokenIn, tokenOut, amountIn, amountOutMin, to, deadline, fee = 3000 } = params;
  const router = new Contract(addresses.v3.swapRouter, routerAbi, signer);
  return router.populateTransaction.exactInputSingle({
    tokenIn: toAddress(tokenIn),
    tokenOut: toAddress(tokenOut),
    fee,
    recipient: to,
    deadline,
    amountIn,
    amountOutMinimum: amountOutMin,
    sqrtPriceLimitX96: 0
  });
}

async function getPoolState(tokenA, tokenB, provider, fee = 3000) {
  const factory = new Contract(addresses.v3.factory, factoryAbi, provider);
  const poolAddress = await factory.getPool(toAddress(tokenA), toAddress(tokenB), fee);
  if (poolAddress === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  const pool = new Contract(poolAddress, poolAbi, provider);
  const [slot0, liquidity] = await Promise.all([
    pool.slot0(),
    pool.liquidity()
  ]);
  return {
    poolAddress,
    sqrtPriceX96: slot0[0].toString(),
    tick: slot0[1],
    liquidity: liquidity.toString()
  };
}

module.exports = { quote, buildSwapTx, getPoolState };
