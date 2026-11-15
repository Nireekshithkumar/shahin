import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ScholarSetu ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F4F6] text-[#000000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#E7E7E7] border border-[#D2D2D4] rounded-xl p-8 text-center shadow-none">
            <div className="w-14 h-14 rounded-xl bg-[#F4F4F6] border border-[#D2D2D4] flex items-center justify-center mx-auto mb-4 text-[#FF634A]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <span className="px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#000000] text-[#FFFFFF]">
              System Notice
            </span>

            <h1 className="text-xl font-bold text-[#000000] mt-4 mb-2 tracking-tight">
              An unexpected display issue occurred
            </h1>

            <p className="text-xs text-[#000000]/70 max-w-md mx-auto mb-6 leading-relaxed">
              ScholarSetu AI encountered a momentary interface error. Your profile data and saved applications remain completely safe.
            </p>

            {this.state.error && (
              <div className="bg-[#F4F4F6] border border-[#D2D2D4] rounded-lg p-3 text-left mb-6 overflow-x-auto text-[11px] text-[#000000]/80 font-mono">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-lg bg-[#F4F4F6] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000] text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <Home className="w-4 h-4" /> Go to Home
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Reload Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

