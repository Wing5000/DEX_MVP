const { Contract, constants } = require('ethers');
const { logAbi } = require('../logger');
const addresses = require('../../contractMap');

const routerAbi = [
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)'
];

const factoryAbi = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

const pairAbi = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

function toAddress(token) {
  if (!token) return token;
  if (token.toLowerCase() === 'eth') return addresses.weth;
  return token;
}

async function quote(tokenIn, tokenOut, amountIn, provider) {
  const router = new Contract(addresses.router, routerAbi, provider);
  const path = [toAddress(tokenIn), toAddress(tokenOut)];
  const amounts = await router.getAmountsOut(amountIn, path);
  logAbi('router.getAmountsOut', [amountIn, path], amounts);
  return amounts[1];
}

async function buildSwapTx(params, signer) {
  const { tokenIn, tokenOut, amountIn, amountOutMin, to, deadline } = params;
  const router = new Contract(addresses.router, routerAbi, signer);
  const path = [toAddress(tokenIn), toAddress(tokenOut)];
  const tx = await router.populateTransaction.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    path,
    to,
    deadline
  );
  logAbi('router.swapExactTokensForTokens', [amountIn, amountOutMin, path, to, deadline], tx);
  return tx;
}

async function getPoolState(tokenA, tokenB, provider) {
  const factory = new Contract(addresses.factory, factoryAbi, provider);
  const tokenAAddr = toAddress(tokenA);
  const tokenBAddr = toAddress(tokenB);
  const pairAddress = await factory.getPair(tokenAAddr, tokenBAddr);
  logAbi('factory.getPair', [tokenAAddr, tokenBAddr], pairAddress);
  if (pairAddress === constants.AddressZero) {
    return null;
  }
  const pair = new Contract(pairAddress, pairAbi, provider);
  const [reserve0, reserve1] = await pair.getReserves();
  logAbi('pair.getReserves', [], { reserve0, reserve1 });
  const token0 = await pair.token0();
  logAbi('pair.token0', [], token0);
  const token1 = await pair.token1();
  logAbi('pair.token1', [], token1);
  return {
    pairAddress,
    reserves: {
      [token0]: reserve0.toString(),
      [token1]: reserve1.toString()
    }
  };
}

module.exports = { quote, buildSwapTx, getPoolState };
