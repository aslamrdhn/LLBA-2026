export function calculateSubtotal(
  items: { price: number; quantity: number }[],
): number {
  return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
}

export function calculateDiscount(
  subtotal: number,
  discountPercent: number,
): number {
  return Math.round((subtotal * discountPercent) / 100);
}

export function calculateTax(
  subtotal: number,
  discount: number,
  taxPercent: number,
): number {
  return Math.round(((subtotal - discount) * taxPercent) / 100);
}

export function calculateTotal(
  subtotal: number,
  discount: number,
  tax: number,
): number {
  return subtotal - discount + tax;
}
