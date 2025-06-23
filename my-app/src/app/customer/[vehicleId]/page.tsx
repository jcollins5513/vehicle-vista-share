'use client';

import CustomerView from '@/components/CustomerView';
import { useParams } from 'next/navigation';

export default function CustomerPage() {
  const params = useParams();
  const vehicleId = Array.isArray(params?.vehicleId) ? params.vehicleId[0] : (params?.vehicleId as string) || '1';

  return <CustomerView vehicleId={vehicleId} />;
}
