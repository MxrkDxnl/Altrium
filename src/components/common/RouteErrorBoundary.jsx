import React from 'react';
import { Link } from 'react-router-dom';

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RouteErrorBoundary caught an error in child component:', error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps) {
    // If the route or key changes, reset the error boundary
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto my-8 p-6 bg-white border border-red-200 rounded-xl shadow-xs">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                Something went wrong loading this section
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                An unexpected error occurred while rendering this page. Your session is active and navigation remains functional.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Try Again
                </button>
                <Link
                  to="/"
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                  className="text-xs text-gray-500 hover:text-gray-700 underline ml-auto"
                >
                  {this.state.showDetails ? 'Hide technical details' : 'Show technical details'}
                </button>
              </div>

              {this.state.showDetails && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-red-800 overflow-x-auto">
                  <p className="font-bold">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 whitespace-pre-wrap text-gray-600">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
