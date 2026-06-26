// src/components/expenses/ExpenseModal.tsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Check } from 'lucide-react';
import CategoryChip from './CategoryChip';
import {
  CATEGORY_META,
  type Expense,
  type ExpenseCategory,
  type ExpenseFormData,
} from '../../types/expenses';

const CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

const schema = z.object({
  amount:      z.string().min(1, 'Required').refine(v => Number(v) > 0, 'Must be > 0'),
  category:    z.enum(CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  description: z.string().min(1, 'Required').max(80),
  notes:       z.string().max(200).optional(),
  expenseDate: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  editing?: Expense | null;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
}

export default function ExpenseModal({ open, editing, onClose, onSubmit }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:      '',
      category:    'food',
      description: '',
      notes:       '',
      expenseDate: today,
    },
  });

  // sync form when editing changes
  useEffect(() => {
    if (editing) {
      reset({
        amount:      String(editing.amount),
        category:    editing.category,
        description: editing.description,
        notes:       editing.notes ?? '',
        expenseDate: editing.expenseDate,
      });
    } else {
      reset({
        amount:      '',
        category:    'food',
        description: '',
        notes:       '',
        expenseDate: today,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  const submit = async (values: FormValues) => {
    await onSubmit(values as ExpenseFormData);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl"
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-2">
              <h2 className="text-base font-bold text-slate-800">
                {editing ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(submit)}
              className="max-h-[80vh] overflow-y-auto px-5 pb-8 no-scrollbar"
            >
              {/* amount */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Amount
                </label>
                <input
                  {...register('amount')}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-bold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300"
                />
                {errors.amount && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.amount.message}</p>
                )}
              </div>

              {/* category chips */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Category
                </label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <CategoryChip
                          key={cat}
                          category={cat}
                          selected={field.value === cat}
                          onClick={() => field.onChange(cat)}
                        />
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* description */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Description
                </label>
                <input
                  {...register('description')}
                  placeholder="e.g. Lunch at Tim Ho Wan"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300"
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.description.message}</p>
                )}
              </div>

              {/* date */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Date
                </label>
                <input
                  {...register('expenseDate')}
                  type="date"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              {/* notes */}
              <div className="mb-6">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Any extra details…"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300"
                />
              </div>

              {/* submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Check size={16} />
                {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Expense'}
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}