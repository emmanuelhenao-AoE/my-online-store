const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate checkout form fields.
 * Returns an object of field -> error message. Empty object means valid.
 * @param {{ name?: string, email?: string, address?: string, zip?: string }} input
 * @returns {Record<string, string>}
 */
export function validateCheckout(input) {
  const errors = {};
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  const address = (input.address ?? "").trim();
  const zip = (input.zip ?? "").trim();

  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (address.length < 5) {
    errors.address = "Address must be at least 5 characters";
  }

  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    errors.zip = "ZIP must be 12345 or 12345-6789";
  }

  return errors;
}

/**
 * @param {{ name?: string, email?: string, address?: string, zip?: string }} input
 */
export function isCheckoutValid(input) {
  return Object.keys(validateCheckout(input)).length === 0;
}
