export const daysUntil = (dateStr: string): number => {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil(diff / 86400000));
};

export const tripDays = (start: string, end: string): number =>
  Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000));

export const fmtDate = (d: string): string =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const fmtShort = (d: string): string =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const fmtCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
