"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep the UI responsive while allowing the console to capture the full error.
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="glass-panel page-header mx-auto max-w-2xl p-5 sm:p-6">
        <div className="glass-card rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.16),rgba(0,38,255,0.16))]">
            <AlertTriangle className="h-6 w-6 text-red-100" />
          </div>
          <h2 className="heading-font mt-4 text-3xl font-normal uppercase tracking-[0.04em] text-white">
            {this.props.fallbackTitle ?? "Something broke"}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-300">
            {this.props.fallbackMessage ?? "This view hit an unexpected error. Retry to reload the section."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }
}
