'use client';

import { useRouter } from 'next/navigation';
import QuoteForm from '@/components/quotes/QuoteForm';

export default function NewQuotePage() {
  const router = useRouter();

  const handleSave = (id: string) => {
    router.push(`/quotes/${id}`);
  };

  const handleCancel = () => {
    router.push('/quotes');
  };

  return <QuoteForm onSave={handleSave} onCancel={handleCancel} />;
}
