const env = (typeof process !== 'undefined' && process.env) || {};
const defaults = {
  LOG_ABI: false,
  USE_V2: true,
  USE_V3: false,
};
const settings = Object.assign({}, defaults, {
  LOG_ABI: env.LOG_ABI === 'true' ? true : env.LOG_ABI === 'false' ? false : undefined,
  USE_V2: env.USE_V2 === 'true' ? true : env.USE_V2 === 'false' ? false : undefined,
  USE_V3: env.USE_V3 === 'true' ? true : env.USE_V3 === 'false' ? false : undefined,
});
// Remove undefined to preserve defaults
Object.keys(settings).forEach(k => settings[k] === undefined && delete settings[k]);
window.DEX_SETTINGS = Object.assign({}, defaults, settings, window.DEX_SETTINGS || {});
