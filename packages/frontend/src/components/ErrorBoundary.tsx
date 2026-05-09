import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-background text-white flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md mx-auto p-8">
            <div className="w-20 h-20 rounded-3xl bg-negative/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-negative" />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">Something went wrong</h1>
            <p className="text-white/40 text-sm leading-relaxed">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/80 transition-all mx-auto"
            >
              <RefreshCw className="w-4 h-4" /><span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
