import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence against a blank page.
 *
 * A render-time exception in any route previously unmounted the whole tree and
 * left an empty document. This boundary keeps the shell visible and shows a
 * recoverable message instead. Presentation only — no calculation logic.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[ui] Unhandled render error:', error.message);
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6" role="alert">
          <h1 className="text-lg font-semibold text-rose-300">Something went wrong on this page</h1>
          <p className="mt-2 text-sm text-rose-200/90">{error.message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
            >
              Reload
            </button>
            <a
              href="/calculators"
              className="rounded-xl border border-rose-500/40 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
            >
              Open calculators
            </a>
          </div>
        </div>
      </main>
    );
  }
}
