import { Loader2 } from 'lucide-react';

const PaymentFormSkeleton = () => (
  <div className="flex min-h-24 w-full items-center justify-center py-6" aria-busy="true" role="status">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
    <span className="sr-only">Loading secure payment options</span>
  </div>
);

export default PaymentFormSkeleton;
