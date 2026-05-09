export const WORLD_CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

export const getCurrencySymbol = (code: string): string => {
  const found = WORLD_CURRENCIES.find(c => c.code === code);
  return found ? found.symbol : '₹';
};

export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return amount.toLocaleString(undefined, { style: 'currency', currency });
};
