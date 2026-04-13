import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Target, Pencil, Send, Database, Settings, LogOut, Zap } from 'lucide-react';
import logo from '../assets/logo/q__2_-removebg-preview.png';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { api } from '../lib/api';

export default function Sidebar() {
 const location = useLocation();
 const navigate = useNavigate();
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
  navigate('/');
 };

 return (
  <aside className="w-64 border-r border-divider bg-obsidian/90 backdrop-blur-md flex flex-col justify-between relative z-20">
   <div>
    <div className="p-6 border-b border-divider bg-gunmetal">
     <div className="flex items-center gap-3">
      <img src={logo} alt="Q" className="h-10 w-10 object-contain opacity-90" />
      <span className="font-mono font-bold text-lg text-white tracking-tight">Quinx</span>
     </div>
    </div>

    <nav className="p-4 space-y-1">
     {nav.map((item) => (
      <Link
       key={item.name}
       to={item.path}
       className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all font-mono font-bold tracking-tight rounded-lg",
        location.pathname === item.path
         ? "bg-matrix/5 text-matrix border-l-2 border-matrix"
         : "text-gray-500 hover:text-pure-white hover:bg-gunmetal border-l-2 border-transparent"
       )}
      >
       <item.icon size={16} />
       {item.name.replace(/^[0-9]\.\s/, '')}
      </Link>
     ))}
    </nav>
   </div>

   <div className="p-4 border-t border-divider bg-gunmetal">
    <div className="mb-3 pb-3 border-b border-divider">
     <img src={logo} alt="Quinx" className="h-6 object-contain opacity-70" />
    </div>
    <div className="flex gap-2 items-center text-xs mb-2 font-mono">
     <div className="flex flex-col flex-1">
      <span className="text-gray-500">[{userName}]</span>
      {balance !== null && apiLimit !== null ? (
       <span className="text-matrix shadow-sm tracking-tight">${balance} / ${apiLimit} Limit</span>
      ) : (
       <span className="text-gray-500">Loading_Limits...</span>
      )}
     </div>
     <Link to="/settings" className="p-2 text-gray-400 text-sm hover:text-matrix border border-transparent hover:border-divider hover:bg-obsidian transition-colors rounded-lg">
      <Settings size={16} />
     </Link>
     <button onClick={handleLogout} className="p-2 text-gray-400 text-sm hover:text-red-500 border border-transparent hover:border-divider hover:bg-obsidian transition-colors rounded-lg">
      <LogOut size={16} />
     </button>
    </div>
   </div>
  </aside>
 );
}
