import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { PricingCards } from './PricingCards';
import { useSubscription } from '../context/SubscriptionContext';
import { startCheckout, type BillingCurrency } from '../services/billingService';
import { useToast } from './Toast';

export function UpgradeModal() {
  const { showUpgrade, closeUpgrade, tier, subscription } = useSubscription();
  const [currency, setCurrency] = useState<BillingCurrency>(
    (subscription?.billingCurrency as BillingCurrency) || 'EUR'
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async (selected: 'PRO' | 'ENTERPRISE') => {
    setLoading(true);
    try {
      const url = await startCheckout(selected, currency);
      window.location.href = url;
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {showUpgrade && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeUpgrade}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-50 dark:bg-slate-950 p-6 md:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="upgrade-modal"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={closeUpgrade}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                Upgrade your plan
              </h2>
              <p className="mt-2 text-slate-500">Unlock more accounts, analytics, and AI helps</p>
              <div className="mt-4 inline-flex rounded-full border border-slate-200 dark:border-slate-700 p-1">
                {(['EUR', 'INR'] as BillingCurrency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                      currency === c
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <PricingCards currency={currency} currentTier={tier} onSelect={handleUpgrade} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
