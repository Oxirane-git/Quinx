import { Link, useLocation } from 'react-router-dom';
import { Target, Pencil, Send, Database, Settings, LogOut, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { api } from '../lib/api';

export default function Sidebar() {
 const location = useLocation();
 const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Operator');
 const [balance, setBalance] = useState<string | null>(null);
 const [apiLimit, setApiLimit] = useState<string | null>(null);

 useEffect(() => {
  api.get('/api/users/me')
   .then(data => {
    setBalance(Number(data.balance).toFixed(2));
    setApiLimit(Number(data.api_limit).toFixed(2));
    setUserName(data.name || data.email);
    localStorage.setItem('userName', data.name || data.email);
   })
   .catch(() => {/* token invalid — api.ts handles 401 reload */});
 }, []);

 const nav = [
  { name: '1. Campaign', path: '/campaign', icon: Zap },
  { name: '2. Scrape', path: '/scraper', icon: Target },
  { name: '3. Write', path: '/writer', icon: Pencil },
  { name: '4. Send', path: '/sender', icon: Send },
  { name: '5. Logs', path: '/logs', icon: Database },
 ];

 const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.reload();
 };

 return (
  <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between shadow-sm">
   <div>
    <div className="p-6 border-b border-border">
     <h1 className="text-xl font-bold text-textMain tracking-tight flex items-center gap-2">
      <div className="w-4 h-4 bg-primary rounded-sm"></div>
      QUINX
     </h1>
    </div>

    <nav className="p-4 space-y-2">
     {nav.map((item) => (
      <Link
       key={item.name}
       to={item.path}
       className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded text-sm transition-all border border-transparent font-medium",
        location.pathname === item.path
         ? "bg-primary/5 text-primary"
         : "text-textMuted hover:text-textMain hover:bg-slate-50"
       )}
      >
       <item.icon size={18} />
       {item.name.replace(/^[0-9]\.\s/, '')}
      </Link>
     ))}
    </nav>
   </div>

   <div className="p-4 border-t border-border bg-surface/20">
    <div className="flex gap-2 items-center text-xs mb-4">
     <div className="flex flex-col flex-1">
      <span className="text-textMuted">[{userName}]</span>
      {balance !== null && apiLimit !== null ? (
       <span className="text-primary font-bold">${balance} / ${apiLimit} Limit</span>
      ) : (
       <span className="text-textMuted">Loading...</span>
      )}
     </div>
     <Link to="/settings" className="p-2 text-textMain text-sm hover:text-primary border border-transparent hover:border-border hover:bg-surface transition-colors rounded">
      <Settings size={16} />
     </Link>
     <button onClick={handleLogout} className="p-2 text-textMain text-sm hover:text-red-400 border border-transparent hover:border-border hover:bg-surface transition-colors rounded">
      <LogOut size={16} />
     </button>
    </div>
   </div>
  </aside>
 );
}
