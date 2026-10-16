import { loadPaymentsStatus } from '@micro/payments/client';
import type { PaymentsStatus } from '@micro/payments/settings';
import { useEffect, useState } from 'react';

/** Whether checkout is open, from GET api/payments. Null until it answers or when it cannot be reached. */
export function usePaymentsStatus(): PaymentsStatus | null {
  const [status, setStatus] = useState<PaymentsStatus | null>(null);
  useEffect(() => {
    let current = true;
    void loadPaymentsStatus(import.meta.env.BASE_URL).then((value) => {
      if (current) setStatus(value);
    });
    return () => {
      current = false;
    };
  }, []);
  return status;
}
