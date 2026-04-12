import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Settings from './pages/Settings';
import Scraper from './pages/Scraper';
import Writer from './pages/Writer';
import Sender from './pages/Sender';
import Logs from './pages/Logs';
import Campaign from './pages/Campaign';
import LandingPage from './pages/LandingPage';
import { ScraperProvider } from './lib/scraperStore';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-obsidian text-pure-white font-sans selection:bg-matrix selection:text-obsidian relative">
      <div className="absolute inset-0 bg-noise pointer-events-none z-0"></div>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 relative z-10">
        {children}
      </main>
    </div>
  );
}

function App() {
 return (
  <ScraperProvider>
  <Router>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
      <Route path="/campaign" element={<DashboardLayout><Campaign /></DashboardLayout>} />
      <Route path="/scraper" element={<DashboardLayout><Scraper /></DashboardLayout>} />
      <Route path="/writer" element={<DashboardLayout><Writer /></DashboardLayout>} />
      <Route path="/sender" element={<DashboardLayout><Sender /></DashboardLayout>} />
      <Route path="/logs" element={<DashboardLayout><Logs /></DashboardLayout>} />
    </Routes>
  </Router>
  </ScraperProvider>
 );
}

export default App;
