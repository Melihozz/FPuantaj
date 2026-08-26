import { Component, ErrorInfo, ReactNode } from 'react';
import { IconAlertTriangle, IconRefresh } from './Icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[420px] items-center justify-center p-6 animate-fade-up">
          <div className="card w-full max-w-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400" />
            <div className="px-7 py-8 text-center">
              <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <IconAlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">
                Bir hata oluştu
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
                Beklenmeyen bir hata meydana geldi. Lütfen sayfayı yenileyin veya tekrar deneyin.
              </p>
              {this.state.error && (
                <p className="mt-5 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 font-mono text-xs text-ink-600 break-words">
                  {this.state.error.message}
                </p>
              )}
              <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
                <button onClick={this.handleRetry} className="btn btn-primary">
                  <IconRefresh className="h-[18px] w-[18px]" />
                  Tekrar Dene
                </button>
                <button onClick={() => window.location.reload()} className="btn btn-secondary">
                  Sayfayı Yenile
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
