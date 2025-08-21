import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <details style={{ marginTop: '1rem', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
              Error Details
            </summary>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.9rem'
            }}>
              {this.state.error?.message || 'Unknown error'}
              {this.state.error?.stack && '\n\n' + this.state.error.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}