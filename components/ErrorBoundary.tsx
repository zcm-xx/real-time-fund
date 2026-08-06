import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[基金助手]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 bg-gray-50 p-6 text-center">
          <p className="text-sm font-medium text-red-600">页面加载出错</p>
          <p className="max-w-xs text-xs text-gray-500">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
