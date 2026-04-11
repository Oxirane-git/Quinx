import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import Scraper from './pages/Scraper';
import Writer from './pages/Writer';
import Sender from './pages/Sender';
import Logs from './pages/Logs';

function App() {
 const token = localStorage.getItem('token');
 
 if (!token) {
  return <Auth />;
 }

 return (
  <Router>
   <div className="flex h-screen overflow-hidden bg-background text-textMain ">
    <Sidebar />
    <main className="flex-1 overflow-y-auto p-8 relative">
     <Routes>
      <Route path="/" element={<Navigate to="/scraper" />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/scraper" element={<Scraper />} />
      <Route path="/writer" element={<Writer />} />
      <Route path="/sender" element={<Sender />} />
      <Route path="/logs" element={<Logs />} />
     </Routes>
    </main>
   </div>
  </Router>
 );
}

export default App;
