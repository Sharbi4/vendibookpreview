import { expect, it } from 'vitest';
import { notificationMessage } from './notificationCopy';
it('hides replay metadata while preserving the customer message and reference', () => {
  for (const key of ['paid:order-id:seller-status', 'authorized:order-id', 'release-reminder-order-date']) {
    expect(notificationMessage(`Payment received for VB-123.\u200b${key}`)).toBe('Payment received for VB-123.');
  }
  expect(notificationMessage('You paid: $25. Reference VB-123.')).toBe('You paid: $25. Reference VB-123.');
});
it('labels required document types for people', () => {
  expect(notificationMessage('Upload business_license.')).toBe('Upload Business License.');
});
