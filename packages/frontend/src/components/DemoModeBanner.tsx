import { Info } from 'lucide-react';
import { isDemoAccount } from '../lib/demoAccounts';

interface Props {
  email: string;
}

export function DemoModeBanner({ email }: Props) {
  if (!isDemoAccount(email)) return null;

  return (
    <div
      data-testid="demo-mode-banner"
      className="border-b border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-4 py-2.5 lg:px-6"
      role="status"
    >
      <div className="mx-auto flex max-w-[1600px] items-start gap-2.5 text-sm text-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-slate-900">Shared demo workspace</p>
          <p className="text-xs leading-relaxed text-slate-600">
            Changes save to the database for the next visitor.{' '}
            <span className="font-medium text-emerald-800">Sample</span> = pre-loaded tour data.{' '}
            <span className="font-medium text-teal-800">Visitor-added</span> = created by previous demo users.
          </p>
        </div>
      </div>
    </div>
  );
}
