/**
 * Format integer cents as a USD string.
 * @param {number} cents
 * @returns {string}
 */
export function formatMoney(cents) {
  if (!Number.isFinite(cents)) {
    throw new TypeError("cents must be a finite number");
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",  
  }).format(cents / 100);
}
