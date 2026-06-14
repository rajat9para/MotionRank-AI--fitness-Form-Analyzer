import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.log('[v0] Landing crashed:', error?.message, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: '#fff', background: '#900', padding: 20, whiteSpace: 'pre-wrap', fontSize: 13 }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}
