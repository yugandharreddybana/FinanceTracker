import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen bg-dark flex items-center justify-center flex-col gap-4 p-8">
        <div className="text-6xl">💥</div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="text-white/50 text-center max-w-md">{this.state.error?.message}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-accent rounded-2xl text-white font-bold">Reload App</button>
      </div>
    );
    return this.props.children;
  }
}
