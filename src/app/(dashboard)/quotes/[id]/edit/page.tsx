'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box, Alert } from '@mui/material';
import { QuoteService } from '@/lib/services/quote-service';
import { QuoteWithDetails } from '@/types';
import QuoteForm from '@/components/quotes/QuoteForm';

interface EditQuotePageProps {
  params: {
    id: string;
  };
}

export default function EditQuotePage({ params }: EditQuotePageProps) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        setLoading(true);
        const quoteData = await QuoteService.getQuoteWithDetails(params.id);
        setQuote(quoteData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '견적서를 불러올 수 없습니다.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadQuote();
    }
  }, [params.id]);

  const handleSave = (id: string) => {
    router.push(`/quotes/${id}`);
  };

  const handleCancel = () => {
    router.push(`/quotes/${params.id}`);
  };

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='400px'
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!quote) {
    return (
      <Alert severity='warning' sx={{ mt: 2 }}>
        견적서를 찾을 수 없습니다.
      </Alert>
    );
  }

  // 견적서 데이터를 폼 데이터로 변환
  const initialFormData = {
    quote_number: quote.quote_number,
    project_title: quote.project_title,
    customer_id: quote.customer_id || '',
    customer_name_snapshot: quote.customer_name_snapshot,
    issue_date: quote.issue_date,
    status: quote.status,
    vat_type: quote.vat_type,
    discount_amount: quote.discount_amount,
    agency_fee_rate: quote.agency_fee_rate,
    notes: quote.notes || '',
    groups: quote.groups.map((group) => ({
      id: group.id,
      name: group.name,
      sort_order: group.sort_order,
      include_in_fee: group.include_in_fee,
      items: group.items.map((item) => ({
        id: item.id,
        name: item.name,
        sort_order: item.sort_order,
        include_in_fee: item.include_in_fee,
        details: item.details.map((detail) => ({
          id: detail.id,
          name: detail.name,
          description: detail.description || '',
          quantity: detail.quantity,
          days: detail.days,
          unit: detail.unit,
          unit_price: detail.unit_price,
          is_service: detail.is_service,
          cost_price: detail.cost_price,
          supplier_id: detail.supplier_id || '',
          supplier_name_snapshot: detail.supplier_name_snapshot || '',
        })),
      })),
    })),
  };

  return (
    <QuoteForm
      initialData={{ ...initialFormData, id: quote.id }}
      isEdit={true}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
