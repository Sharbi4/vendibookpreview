/** Silent placeholder matching the Pay Later line and PayPal's button stack. */
const PaymentFormSkeleton = () => (
  <div className="paypal-form-skeleton" aria-busy="true" role="status">
    <span className="sr-only">Loading secure payment options</span>
    <div className="paypal-form-skeleton-message" aria-hidden="true" />
    <div className="paypal-form-skeleton-buttons" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="paypal-form-skeleton-button" />
      ))}
    </div>
  </div>
);

export default PaymentFormSkeleton;
