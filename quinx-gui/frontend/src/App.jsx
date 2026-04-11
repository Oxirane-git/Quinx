import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Scraper from './pages/Scraper';
import Writer from './pages/Writer';
import Sender from './pages/Sender';
import Logs from './pages/Logs';
import Campaign from './pages/Campaign';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
          <p className="text-red-400 font-bold text-sm">RENDER ERROR</p>
          <pre className="text-red-300 text-xs bg-black/60 border border-red-500/30 rounded-md p-4 max-w-2xl w-full overflow-auto whitespace-pre-wrap">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-quinx-green text-black text-xs font-bold rounded-md hover:bg-[#00e67a]"
          >
            DISMISS
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Navigate to="/scraper" replace />} />
        <Route path="/scraper" element={<Scraper />} />
        <Route path="/writer" element={<Writer />} />
        <Route path="/sender" element={<Sender />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/campaign" element={<Campaign />} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full bg-quinx-bg text-quinx-text font-mono overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-quinx-bg p-6">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
