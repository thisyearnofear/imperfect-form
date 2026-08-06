import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultFallback;
      return <Fallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultFallback({ resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="studio-error-boundary" role="alert">
      <div className="studio-error-boundary__mark" aria-hidden="true">
        !
      </div>
      <p className="studio-error-boundary__eyebrow">The bay paused</p>
      <p className="studio-error-boundary__message">
        Something interrupted this moment. Your session has not been lost.
      </p>
      <button onClick={resetError} className="studio-error-boundary__action">
        Try again
      </button>
    </div>
  );
}

export default ErrorBoundary;
