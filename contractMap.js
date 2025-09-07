const config = require('./contractMap.json');
const env = (typeof process !== 'undefined' && process.env) ? process.env : {};

config.factory = env.VITE_V2_FACTORY || config.factory;
config.router = env.VITE_V2_ROUTER || config.router;
config.weth = env.VITE_WETH || config.weth;

if (config.v3) {
  config.v3.factory = env.VITE_V3_FACTORY || config.v3.factory;
  config.v3.quoterV2 = env.VITE_V3_QUOTER_V2 || config.v3.quoterV2;
  config.v3.swapRouter = env.VITE_V3_SWAP_ROUTER || config.v3.swapRouter;
}

module.exports = config;
