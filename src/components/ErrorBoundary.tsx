import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI exception captured by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch {}
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
          <div className="max-w-lg w-full bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-600/20 text-[#FF6000] border border-orange-500/30 flex items-center justify-center mx-auto shadow-md">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {this.props.fallbackTitle || 'Admin Dashboard Recovery'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                A non-fatal interface event occurred. Your database records, customer orders, and settings remain safe and synchronized.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#FF6000] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recover Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/';
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Storefront Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
