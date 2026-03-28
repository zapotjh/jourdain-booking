import { Suspense } from 'react';
import { CheckoutClient } from './ui';

export default function BookingCheckoutPage() {
  // Next.js build requires Suspense around useSearchParams() consumers.
  return (
    <Suspense fallback={null}>
      <CheckoutClient />
    </Suspense>
  );
}
