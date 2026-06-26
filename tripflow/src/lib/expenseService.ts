// src/lib/expenseService.ts
// All Supabase CRUD for the expenses table.

import { supabase } from './supabase';
import type { Expense, ExpenseCategory, ExpenseFormData } from '../types/expenses';

// ── helpers ────────────────────────────────────────────────────────────────────

function rowToExpense(row: Record<string, unknown>): Expense {
  return {
    id:          String(row.id ?? ''),
    tripId:      String(row.trip_id ?? ''),
    amount:      Number(row.amount ?? 0),
    category:    String(row.category ?? 'misc') as ExpenseCategory,
    description: String(row.description ?? ''),
    notes:       row.notes ? String(row.notes) : undefined,
    expenseDate: String(row.expense_date ?? ''),
    createdAt:   String(row.created_at ?? new Date().toISOString()),
  };
}

// ── public API ─────────────────────────────────────────────────────────────────

export async function fetchExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[expenseService] fetchExpenses', error);
    return [];
  }
  return (data ?? []).map(rowToExpense);
}

export async function addExpense(
  tripId: string,
  form: ExpenseFormData,
): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      trip_id:      tripId,
      amount:       Number(form.amount),
      category:     form.category,
      description:  form.description,
      notes:        form.notes || null,
      expense_date: form.expenseDate,
    })
    .select()
    .single();

  if (error) {
    console.error('[expenseService] addExpense', error);
    return null;
  }
  return rowToExpense(data as Record<string, unknown>);
}

export async function updateExpense(
  id: string,
  form: ExpenseFormData,
): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      amount:       Number(form.amount),
      category:     form.category,
      description:  form.description,
      notes:        form.notes || null,
      expense_date: form.expenseDate,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[expenseService] updateExpense', error);
    return null;
  }
  return rowToExpense(data as Record<string, unknown>);
}

export async function deleteExpense(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[expenseService] deleteExpense', error);
    return false;
  }
  return true;
}