/** Reject malformed or reversed URL dates before quoting or formatting a rental. */
export function isValidRentalDateRange(start?: Date, end?: Date): boolean {
  return !!start && !!end && Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) && end.getTime() >= start.getTime();
}

/** Calendar dates only: reject rollover dates and untrusted URL timestamps. */
export function parseRentalDate(value: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export function rentalIsInstant(listingInstant: boolean, verifiedHost: boolean, flow: string | null) {
  return listingInstant && verifiedHost && flow !== 'request';
}

export function parseRentalSlot(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const slot = Number(value);
  return Number.isSafeInteger(slot) && slot > 0 ? slot : null;
}

export function validRentalContact(info: {
  firstName: string; lastName: string; phoneNumber: string; address1: string;
  city: string; state: string; zipCode: string; agreedToTerms: boolean;
} | null): boolean {
  if (!info) return false;
  const phone = info.phoneNumber.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return !!(info.firstName.trim() && info.lastName.trim() && /^[2-9]\d{2}[2-9]\d{6}$/.test(phone) &&
    info.address1.trim() && info.city.trim() && /^[A-Za-z]{2}$/.test(info.state.trim()) &&
    /^\d{5}(-\d{4})?$/.test(info.zipCode.trim()) && info.agreedToTerms);
}

export function rentalSubmitAllowed(requirements: {
  contact: boolean; business: boolean; documents: boolean; disclosure: boolean;
  fulfillment: string; deliveryAddress: string; slotRequired: boolean;
  slot: number | null; legal: boolean; dates: boolean; selfBooking: boolean;
}) {
  const r = requirements;
  return r.contact && r.business && r.documents && r.disclosure && r.legal && r.dates && !r.selfBooking &&
    ['pickup', 'delivery', 'on_site'].includes(r.fulfillment) &&
    (r.fulfillment !== 'delivery' || !!r.deliveryAddress.trim()) && (!r.slotRequired || !!r.slot);
}

/** Approval and payment are independent; unpaid requests are not failed payments. */
export function rentalBookingView(booking: { status: string | null; payment_status: string | null; is_instant_book: boolean | null }) {
  if (booking.status === 'declined' || booking.status === 'cancelled') return 'declined';
  if (booking.payment_status === 'paid') return booking.status === 'approved' ? 'confirmed' : 'awaiting_host';
  if (booking.payment_status === 'pending') return 'processing';
  return booking.status === 'approved' || booking.is_instant_book ? 'ready_to_pay' : 'awaiting_host';
}
