export const WORLD_CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

export const getCurrencySymbol = (code: string): string => {
  const found = WORLD_CURRENCIES.find(c => c.code === code);
  return found ? found.symbol : '₹';
};

export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const locale = currency === 'INR' ? 'en-IN' : (currency === 'EUR' ? 'de-DE' : undefined);
  return amount.toLocaleString(locale, { style: 'currency', currency });
};
