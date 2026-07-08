/** Catalog of demo products for the storefront. */
export const PRODUCTS = [
  {
    id: "mug-01",
    name: "Trail Mug",
    priceCents: 1800,
    stock: 12,
    description: "Double-wall stainless mug for hot coffee on cold mornings.",
  },
  {
    id: "pack-01",
    name: "Day Pack 20L",
    priceCents: 6900,
    stock: 5,
    description: "Lightweight pack with a laptop sleeve and bottle pocket.",
  },
  {
    id: "lamp-01",
    name: "Camp Lantern",
    priceCents: 3200,
    stock: 8,
    description: "USB-rechargeable lantern with three brightness levels.",
  },
  {
    id: "sock-01",
    name: "Merino Trail Socks",
    priceCents: 1600,
    stock: 20,
    description: "Cushioned hiking socks that dry fast and fight odor.",
  },
];

/**
 * Find a product by id.
 * @param {string} id
 * @returns {typeof PRODUCTS[number] | undefined}
 */
export function getProductById(id) {
  return PRODUCTS.find((product) => product.id === id);
}

/**
 * Check whether the catalog can fulfill a quantity for a product.
 * @param {string} productId
 * @param {number} quantity
 */
export function isInStock(productId, quantity) {
  const product = getProductById(productId);
  if (!product) return false;
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  return quantity <= product.stock;
}
