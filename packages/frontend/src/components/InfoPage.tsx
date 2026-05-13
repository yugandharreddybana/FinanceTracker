import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Shield, FileText, Lock, Sparkles } from 'lucide-react';

type InfoPageVariant = 'privacy' | 'terms' | 'security' | 'contact';

interface InfoPageProps {
  variant: InfoPageVariant;
}

const PAGE_CONTENT: Record<InfoPageVariant, {
  eyebrow: string;
  title: string;
  intro: string;
  icon: typeof Shield;
  sections: Array<{ heading: string; body: string }>;
}> = {
  privacy: {
    eyebrow: 'Privacy',
    title: 'How your financial data is handled',
    intro: 'Finance Tracker stores account data only to deliver budgeting, forecasting, audit logging, and AI-assisted insights for your signed-in workspace.',
    icon: Lock,
    sections: [
      {
        heading: 'Data we process',
        body: 'We process profile details, account balances, transactions, budgets, savings goals, and related metadata required to operate the application.',
      },
      {
        heading: 'Why we process it',
        body: 'Your data powers dashboards, planning tools, notifications, and authenticated account recovery. It is not collected for unrelated advertising workflows.',
      },
      {
        heading: 'How long it lasts',
        body: 'Authenticated browser sessions last up to 24 hours unless you sign out earlier. Application data remains available until removed by you or your deployment owner.',
      },
    ],
  },
  terms: {
    eyebrow: 'Terms',
    title: 'Using the application responsibly',
    intro: 'By creating an account, you agree to use the application for lawful financial tracking and not attempt to abuse, scrape, or interfere with the service.',
    icon: FileText,
    sections: [
      {
        heading: 'Account responsibility',
        body: 'You are responsible for protecting your credentials, reviewing imported data, and keeping profile details accurate.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not attempt unauthorized access, automated abuse, or use the product to store malicious content or violate applicable law.',
      },
      {
        heading: 'Service changes',
        body: 'Features may evolve over time. Continued use means you accept reasonable updates that improve stability, security, and compliance.',
      },
    ],
  },
  security: {
    eyebrow: 'Security',
    title: 'Security practices for this deployment',
    intro: 'Finance Tracker uses authenticated API access, server-managed sessions, request throttling on sensitive auth routes, and audit logging for privileged actions.',
    icon: Shield,
    sections: [
      {
        heading: 'Session security',
        body: 'Sessions are managed with secure server-issued cookies and protected routes revalidate access on application load.',
      },
      {
        heading: 'Operational safeguards',
        body: 'Sensitive auth flows are rate limited, password reset tokens are time bound, and verification tokens are single-use where supported by the deployment.',
      },
      {
        heading: 'Your part',
        body: 'Use a strong unique password, sign out on shared devices, and contact your deployment owner immediately if you suspect unauthorized access.',
      },
    ],
  },
  contact: {
    eyebrow: 'Contact',
    title: 'How to get help',
    intro: 'This project may be self-hosted or deployed by a private team, so support ownership depends on the environment you were given access to.',
    icon: Mail,
    sections: [
      {
        heading: 'Account access issues',
        body: 'Use the password recovery flow on the sign-in page first. If access still fails, contact the team or administrator who provisioned your account.',
      },
      {
        heading: 'Bug reports',
        body: 'Share the affected page, the action you took, and any visible error text or screenshots with your deployment owner so they can reproduce the issue quickly.',
      },
      {
        heading: 'Security concerns',
        body: 'Report suspected security issues privately to your deployment owner or internal engineering contact instead of posting sensitive details publicly.',
      },
    ],
  },
};

export const InfoPage: React.FC<InfoPageProps> = ({ variant }) => {
  const page = PAGE_CONTENT[variant];
  const Icon = page.icon;

  return (
    <div data-testid={`page-info-${variant}`} className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to home</span>
        </Link>

        <div className="glass-dark rounded-3xl overflow-hidden border border-white/10">
          <div className="border-b border-white/5 bg-white/[0.02] px-8 py-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-accent">
              <Sparkles className="h-3 w-3" />
              <span>{page.eyebrow}</span>
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <h1 className="font-display text-4xl font-bold tracking-tighter md:text-5xl">{page.title}</h1>
                <p className="mt-4 text-base font-medium leading-relaxed text-white/50">{page.intro}</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Icon className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="space-y-6 px-8 py-8">
            {page.sections.map((section) => (
              <section key={section.heading} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold tracking-tight">{section.heading}</h2>
                <p className="mt-3 text-sm font-medium leading-7 text-white/55">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};