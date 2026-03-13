import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Scraper from './pages/Scraper';
import Writer from './pages/Writer';
import Sender from './pages/Sender';
import Logs from './pages/Logs';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full bg-quinx-bg text-quinx-text font-mono overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-quinx-bg p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/scraper" replace />} />
            <Route path="/scraper" element={<Scraper />} />
            <Route path="/writer" element={<Writer />} />
            <Route path="/sender" element={<Sender />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
