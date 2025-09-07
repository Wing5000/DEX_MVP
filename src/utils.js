function toBaseUnits(amount, decimals) {
  const [whole = '0', fraction = ''] = String(amount).split('.');
  const frac = fraction.padEnd(decimals, '0').slice(0, decimals);
  const wholeBig = BigInt(whole);
  const fracBig = BigInt(frac || '0');
  return wholeBig * 10n ** BigInt(decimals) + fracBig;
}

function fromBaseUnits(amount, decimals) {
  const base = 10n ** BigInt(decimals);
  const value = BigInt(amount);
  const whole = value / base;
  const fraction = value % base;
  const fracStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
}

module.exports = { toBaseUnits, fromBaseUnits };
