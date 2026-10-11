/** Capture status, not the outer Orders status, determines payment outcome. */
export function captureFromOrder(order: any) {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return capture && typeof capture.id === 'string' && typeof capture.status === 'string' ? capture : null;
}
export function captureFailure(issue: string | undefined, httpStatus: number) {
  if (issue === 'PAYER_ACTION_REQUIRED') return { status: 'created', code: 'payer_action_required', message: 'Complete the additional approval requested by PayPal before submitting payment.' };
  if (issue === 'ORDER_NOT_APPROVED') return { status: 'created', code: 'order_not_approved', message: 'Approve this payment before submitting it.' };
  if (['INSTRUMENT_DECLINED', 'TRANSACTION_REFUSED', 'PAYER_CANNOT_PAY', 'CARD_EXPIRED', 'REDIRECT_PAYER_FOR_ALTERNATE_FUNDING'].includes(issue ?? '')) {
    return { status: 'declined', code: 'payment_declined', message: 'The payment provider declined this payment. Choose another payment method.' };
  }
  if (httpStatus >= 500 || httpStatus === 429) return { status: 'pending', code: 'capture_unverified', message: 'Payment verification is pending. Check its status before paying again.' };
  return { status: 'failed', code: 'payment_failed', message: 'Payment could not be completed. Please try again or contact support with your payment reference.' };
}
