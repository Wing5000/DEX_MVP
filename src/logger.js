const isDev = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');

function logAbi(method, args, result) {
  const settings = (typeof globalThis !== 'undefined' && globalThis.DEX_SETTINGS) || {};
  if (!isDev || !settings.LOG_ABI) return;
  try {
    console.debug(`[ABI] ${method}`, { args, result });
  } catch (err) {
    console.debug(`[ABI] ${method}`, args, result);
  }
}

module.exports = { logAbi };
