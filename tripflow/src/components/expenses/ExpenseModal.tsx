// src/components/expenses/ExpenseModal.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X, Check, ChevronDown, ArrowRight, RefreshCw,
  Camera, ImagePlus, Trash2,
} from 'lucide-react';
import CategoryChip from './CategoryChip';
import {
  CATEGORY_META,
  type Expense,
  type ExpenseCategory,
  type ExpenseFormData,
} from '../../types/expenses';
import type { Currency } from '../../types';
import {
  getRatesPerUSD,
  convert,
  fmtCurrency,
  CURRENCY_INFO,
} from '../../lib/exchangeRates';

const CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];
const ALL_CURRENCIES = Object.keys(CURRENCY_INFO) as Currency[];

const schema = z.object({
  amount:      z.string().min(1, 'Required').refine(v => Number(v.replace(/,/g, '')) > 0, 'Must be > 0'),
  category:    z.enum(CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  description: z.string().min(1, 'Required').max(80),
  notes:       z.string().max(200).optional(),
  expenseDate: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  editing?: Expense | null;
  tripCurrency: Currency;
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
}

export default function ExpenseModal({
  open, editing, tripCurrency, defaultDate, onClose, onSubmit,
}: Props) {
  const today           = new Date().toISOString().slice(0, 10);
  const resolvedDefault = defaultDate ?? today;

  const [inputCurrency, setInputCurrency]     = useState<Currency>(tripCurrency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [rates, setRates]                     = useState<Record<Currency, number> | null>(null);
  const [loadingRates, setLoadingRates]       = useState(false);
  const [rawAmount, setRawAmount]             = useState('');

  // ── Photo state ────────────────────────────────────────────────────────────
  const [photoFile, setPhotoFile]     = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const {
    handleSubmit, control, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '', category: 'food', description: '', notes: '',
      expenseDate: resolvedDefault,
    },
  });

  const loadRates = useCallback(async () => {
    setLoadingRates(true);
    const r = await getRatesPerUSD();
    setRates(r);
    setLoadingRates(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadRates();
      setInputCurrency(tripCurrency);
      setShowCurrencyPicker(false);
    }
  }, [open, tripCurrency, loadRates]);

  useEffect(() => {
    if (editing) {
      const v = String(editing.amount);
      setRawAmount(v);
      setValue('amount', v, { shouldValidate: false });
      reset({
        amount: v, category: editing.category,
        description: editing.description, notes: editing.notes ?? '',
        expenseDate: editing.expenseDate,
      });
      setInputCurrency(tripCurrency);
      // Load existing photo preview
      if (editing.photoUrl) {
        setPhotoPreview(editing.photoUrl);
        setPhotoFile(null);
      } else {
        setPhotoPreview(null);
        setPhotoFile(null);
      }
    } else {
      setRawAmount('');
      reset({
        amount: '', category: 'food', description: '', notes: '',
        expenseDate: resolvedDefault,
      });
      setInputCurrency(tripCurrency);
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open, resolvedDefault]);

  // ── Photo handlers ─────────────────────────────────────────────────────────
  const handlePhotoFile = (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = e => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // ── Amount helpers ─────────────────────────────────────────────────────────
  const formatWithCommas = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const [int, dec] = clean.split('.');
    const intFormatted = (int || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${intFormatted}.${dec}` : intFormatted;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    setRawAmount(raw);
    setValue('amount', raw, { shouldValidate: true });
  };

  const isConverting  = inputCurrency !== tripCurrency;
  const numAmount     = parseFloat(rawAmount) || 0;
  const convertedAmount = isConverting && rates && numAmount > 0
    ? convert(numAmount, inputCurrency, tripCurrency, rates)
    : null;
  const rateInfo = isConverting && rates
    ? `1 ${inputCurrency} = ${fmtCurrency(convert(1, inputCurrency, tripCurrency, rates), tripCurrency)}`
    : null;

  const info     = CURRENCY_INFO[inputCurrency];
  const tripInfo = CURRENCY_INFO[tripCurrency];

  const submit = async (values: FormValues) => {
    const num = parseFloat(values.amount.replace(/,/g, ''));
    const finalAmount = isConverting && rates
      ? convert(num, inputCurrency, tripCurrency, rates)
      : num;

    const formData: ExpenseFormData = {
      ...values,
      amount: String(Math.round(finalAmount)),
      // Pass the file if a new one was chosen, otherwise pass the existing URL
      photoFile: photoFile ?? undefined,
      photoUrl:  !photoFile ? (photoPreview ?? undefined) : undefined,
    };

    await onSubmit(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2 pt-2">
              <h2 className="text-base font-bold text-slate-800">
                {editing ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[84vh] overflow-y-auto px-5 pb-10 no-scrollbar">

              {/* ── AMOUNT ───────────────────────────────────────────── */}
              <div className="mb-5">
                <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Amount
                </label>

                <div className={`flex items-center gap-0 overflow-hidden rounded-2xl border-2 transition-colors ${
                  isConverting ? 'border-pink-300 bg-pink-50/30' : 'border-violet-300 bg-violet-50/30'
                }`}>
                  <button
                    type="button"
                    onClick={() => setShowCurrencyPicker(v => !v)}
                    className={`flex shrink-0 items-center gap-1.5 border-r px-3 py-4 transition-colors ${
                      isConverting
                        ? 'border-pink-200 bg-pink-100/60 text-pink-700'
                        : 'border-violet-200 bg-violet-100/60 text-violet-700'
                    }`}
                  >
                    <span className="text-xl leading-none">{info.flag}</span>
                    <span className="text-sm font-bold">{inputCurrency}</span>
                    <ChevronDown size={13} className={`transition-transform ${showCurrencyPicker ? 'rotate-180' : ''}`} />
                  </button>

                  <Controller
                    control={control}
                    name="amount"
                    render={() => (
                      <input
                        value={formatWithCommas(rawAmount)}
                        onChange={handleAmountChange}
                        inputMode="decimal"
                        placeholder="0"
                        className="min-w-0 flex-1 bg-transparent px-4 py-4 text-3xl font-bold text-slate-800 outline-none placeholder:text-slate-300"
                      />
                    )}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.amount.message}</p>
                )}

                {/* Currency picker */}
                <AnimatePresence>
                  {showCurrencyPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Select payment currency
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {ALL_CURRENCIES.map(cur => {
                            const ci = CURRENCY_INFO[cur];
                            const isHome = cur === tripCurrency;
                            const isSelected = cur === inputCurrency;
                            return (
                              <button
                                key={cur}
                                type="button"
                                onClick={() => { setInputCurrency(cur); setShowCurrencyPicker(false); }}
                                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition-all ${
                                  isSelected
                                    ? isHome
                                      ? 'bg-violet-500 text-white shadow-sm'
                                      : 'bg-pink-500 text-white shadow-sm'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-lg">{ci.flag}</span>
                                <span className="text-[11px] font-bold">{cur}</span>
                                {isHome && (
                                  <span className={`text-[8px] font-medium ${isSelected ? 'text-white/70' : 'text-violet-500'}`}>
                                    home
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Conversion preview */}
                <AnimatePresence>
                  {isConverting && numAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 p-[1.5px]"
                    >
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400">You pay</p>
                          <p className="text-base font-bold text-pink-600">
                            {info.flag} {formatWithCommas(rawAmount)} {inputCurrency}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <ArrowRight size={16} className="text-violet-400" />
                          {loadingRates ? (
                            <RefreshCw size={9} className="animate-spin text-slate-400" />
                          ) : (
                            <p className="text-[9px] text-slate-400">{rateInfo}</p>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400">Budget deducted</p>
                          <p className="text-base font-bold text-violet-700">
                            {tripInfo.flag} {convertedAmount !== null ? fmtCurrency(convertedAmount, tripCurrency) : '…'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isConverting && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Paying in a different currency?{' '}
                    <button type="button" onClick={() => setShowCurrencyPicker(true)}
                      className="font-semibold text-violet-500 underline underline-offset-2">
                      Tap {tripInfo.flag} {tripCurrency} to switch
                    </button>
                  </p>
                )}
              </div>

              {/* ── CATEGORY ─────────────────────────────────────────── */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Category
                </label>
                <Controller control={control} name="category"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <CategoryChip key={cat} category={cat}
                          selected={field.value === cat}
                          onClick={() => field.onChange(cat)} />
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* ── DESCRIPTION ──────────────────────────────────────── */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Description
                </label>
                <Controller control={control} name="description"
                  render={({ field }) => (
                    <input {...field}
                      placeholder="e.g. Dim sum at Tim Ho Wan"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300"
                    />
                  )}
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.description.message}</p>
                )}
              </div>

              {/* ── DATE ─────────────────────────────────────────────── */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Date
                </label>
                <Controller control={control} name="expenseDate"
                  render={({ field }) => (
                    <input {...field} type="date"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  )}
                />
              </div>

              {/* ── NOTES ────────────────────────────────────────────── */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Notes <span className="font-normal normal-case text-slate-400">(optional)</span>
                </label>
                <Controller control={control} name="notes"
                  render={({ field }) => (
                    <textarea {...field} rows={2} placeholder="Any extra details…"
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300"
                    />
                  )}
                />
              </div>

              {/* ── PHOTO (optional) ─────────────────────────────────── */}
              <div className="mb-6">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Receipt photo <span className="font-normal normal-case text-slate-400">(optional)</span>
                </label>

                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {photoPreview ? (
                  /* Preview with remove button */
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200">
                    <img
                      src={photoPreview}
                      alt="Receipt preview"
                      className="h-44 w-full object-cover"
                    />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-3">
                      <span className="text-[11px] font-medium text-white/80">
                        {photoFile ? photoFile.name : 'Current photo'}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-7 items-center gap-1 rounded-xl bg-white/20 px-2.5 text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                        >
                          <ImagePlus size={11} />
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={clearPhoto}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/80 text-white backdrop-blur-sm hover:bg-rose-500 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty state — pick or shoot */
                  <div className="flex gap-2.5">
                    {/* Upload from gallery */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-5 transition-colors hover:border-violet-300 hover:bg-violet-50/40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-500">
                        <ImagePlus size={18} />
                      </div>
                      <div className="text-center">
                        <p className="text-[12px] font-semibold text-slate-600">Upload photo</p>
                        <p className="text-[10px] text-slate-400">From gallery</p>
                      </div>
                    </button>

                    {/* Take photo */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-5 transition-colors hover:border-violet-300 hover:bg-violet-50/40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-500">
                        <Camera size={18} />
                      </div>
                      <div className="text-center">
                        <p className="text-[12px] font-semibold text-slate-600">Take photo</p>
                        <p className="text-[10px] text-slate-400">Use camera</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* ── SUBMIT ───────────────────────────────────────────── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleSubmit(submit)}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Check size={16} />
                {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Expense'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}