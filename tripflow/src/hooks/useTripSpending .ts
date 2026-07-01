import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ExpenseRow {
  amount: number | string | null;
}

export function useTripSpending(tripId: string | undefined) {
  const [spent, setSpent] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    supabase
      .from('expenses')
      .select('amount')
      .eq('trip_id', tripId)
      .then(({ data, error }: { data: ExpenseRow[] | null; error: unknown }) => {
        if (error) console.error('Expenses fetch error:', error);
        const rows = data ?? [];
        setSpent(rows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
        setLoading(false);
      });
  }, [tripId]);

  return { spent, loading };
}