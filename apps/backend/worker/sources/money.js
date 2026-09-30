/**
 * Robust currency and money amount parser.
 *
 * Handles both European/South American conventions ("6.000,00") and US conventions ("4,190.00").
 * Dynamically resolves decimal vs thousands separators based on input pattern.
 *
 * Returns 0 on invalid or non-numeric input (never NaN).
 */
function parseMoney(raw) {
  if (raw === null || raw === undefined) return 0;

  let text = String(raw);

  // 1. Strip currency prefixes, NBSP, thin spaces, and regular whitespace
  text = text.replace(/[^0-9.,\-\s\u00A0\u202F]/g, '').replace(/[\s\u00A0\u202F]/g, '');
  if (text === '' || text === '-' || text === '.') return 0;

  const lastDot = text.lastIndexOf('.');
  const lastComma = text.lastIndexOf(',');
  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;

  if (hasDot && hasComma) {
    // 2. Both present: the trailing separator is the decimal point
    if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
  } else if (hasComma || hasDot) {
    const sep = hasComma ? ',' : '.';
    const decimals = text.length - 1 - text.lastIndexOf(sep);
    // 3. Exactly 2 trailing digits => decimal separator; 3 => thousands separator
    if (decimals !== 2) text = text.split(sep).join('');
  }

  const value = parseFloat(text);
  return Number.isFinite(value) ? value : 0;
}

module.exports = { parseMoney };
