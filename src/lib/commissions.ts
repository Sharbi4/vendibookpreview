// Platform commission rates
export const RENTAL_HOST_FEE_PERCENT = 12.9; // 12.9% from host
export const RENTAL_RENTER_FEE_PERCENT = 12.9; // 12.9% platform fee from renter
export const SALE_SELLER_FEE_PERCENT = 15; // 15% from seller on sales

/**
 * Calculate rental fees (dual-sided commission)
 * Host pays 12.9%, Renter pays 12.9% platform fee
 */
export function calculateRentalFees(basePrice: number, deliveryFee: number = 0) {
  const subtotal = basePrice + deliveryFee;
  
  // Renter platform fee (added to their total)
  const renterFee = subtotal * (RENTAL_RENTER_FEE_PERCENT / 100);
  
  // Host fee (deducted from their payout)
  const hostFee = subtotal * (RENTAL_HOST_FEE_PERCENT / 100);
  
  // What the renter pays
  const customerTotal = subtotal + renterFee;
  
  // What the host receives
  const hostReceives = subtotal - hostFee;
  
  // Total platform revenue
  const platformFee = renterFee + hostFee;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    renterFee: Math.round(renterFee * 100) / 100,
    hostFee: Math.round(hostFee * 100) / 100,
    customerTotal: Math.round(customerTotal * 100) / 100,
    hostReceives: Math.round(hostReceives * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
  };
}

/**
 * Calculate sale fees (seller-side only)
 * Seller pays 15%, Buyer pays nothing extra
 * Optional freight cost for seller-paid shipping
 */
export function calculateSaleFees(salePrice: number, freightCost: number = 0, isSellerPaidFreight: boolean = false) {
  // Seller fee (deducted from their payout) - on sale price only, not freight
  const sellerFee = salePrice * (SALE_SELLER_FEE_PERCENT / 100);
  
  // What the buyer pays - if buyer pays freight, add it; if seller pays, no freight in total
  const customerTotal = isSellerPaidFreight ? salePrice : salePrice + freightCost;
  
  // Freight deduction for seller-paid shipping
  const freightDeduction = isSellerPaidFreight ? freightCost : 0;
  
  // What the seller receives
  const sellerReceives = salePrice - sellerFee - freightDeduction;
  
  return {
    salePrice: Math.round(salePrice * 100) / 100,
    sellerFee: Math.round(sellerFee * 100) / 100,
    freightDeduction: Math.round(freightDeduction * 100) / 100,
    customerTotal: Math.round(customerTotal * 100) / 100,
    sellerReceives: Math.round(sellerReceives * 100) / 100,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
