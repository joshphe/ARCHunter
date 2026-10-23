export function walletMoney(value: number | null, signed = false): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  const prefix = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  if (magnitude > 0 && magnitude < 0.000001) return prefix + '< $0.000001';
  return prefix + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: magnitude < 1 && magnitude > 0 ? 8 : 2 }).format(magnitude);
}
export function walletQuantity(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.000001) return '< 0.000001';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: value > 0 && value < 1 ? 8 : 4 }).format(value);
}
export const walletShortAddress = (address: string) => address.slice(0, 6) + '…' + address.slice(-4);
export const walletDate = (date: string, language: 'en' | 'zh') => new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false,
}).format(new Date(date));
