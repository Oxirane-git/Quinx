import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Settings as SettingsIcon, Mail, Cpu, Lock, CloudRain } from 'lucide-react';

interface EmailAccount { id: number; provider: string; email: string; host: string; port: string; }
interface UserMe { balance: number; api_limit: number; }

export default function Settings() {
 const [provider, setProvider] = useState('smtp');
 const [host, setHost] = useState('');
 const [port, setPort] = useState('465');
 const [email, setEmail] = useState('');
 const [appPassword, setAppPassword] = useState('');
 const [accounts, setAccounts] = useState<EmailAccount[]>([]);
 const [userMe, setUserMe] = useState<UserMe | null>(null);
 const [saving, setSaving] = useState(false);
 const [saveMsg, setSaveMsg] = useState('');

 const loadData = () => {
  api.get('/api/users/me').then(setUserMe).catch(() => {});
  api.get('/api/users/settings/email-accounts').then(setAccounts).catch(() => {});
 };

 useEffect(() => { loadData(); }, []);

 const accountLabel = (acc: EmailAccount) => `${acc.email || '—'} via ${acc.provider}`;

 const handleSmtpSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
  setSaving(true);
  setSaveMsg('');
  try {
   await api.post('/api/users/settings/email-accounts', {
    provider: 'smtp',
    host,
    port: Number(port),
    email,
    app_password: appPassword,
   });
   setSaveMsg('Connection initialized successfully.');
   setHost(''); setPort('465'); setEmail(''); setAppPassword('');
   loadData();
  } catch (err: unknown) {
   setSaveMsg(err instanceof Error ? err.message : 'Connection failed.');
  } finally {
   setSaving(false);
  }
 };

 return (
  <div className="max-w-3xl space-y-8 animate-in fade-in duration-500 font-sans text-white pb-12">
   <header className="border-b border-divider pb-4">
    <div className="flex items-center space-x-3 mb-2">
     <SettingsIcon className="w-6 h-6 text-matrix" />
     <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">Settings</h1>
    </div>
    <p className="text-gray-400 text-sm pl-9">Connect your email account and manage your API usage.</p>
   </header>

   <div className="space-y-8 font-mono">
    {/* Email Accounts */}
    <section className="bg-gunmetal shadow-2xl border border-divider p-8 rounded-none relative overflow-hidden bento-hover">
     <div className="absolute top-0 right-0 w-32 h-32 bg-matrix/5 rounded-bl-[100px] pointer-events-none"></div>
     <h2 className="text-lg font-bold mb-6 flex items-center gap-3 tracking-wider uppercase">
      <Mail className="w-5 h-5 text-matrix" />
      Email Accounts
     </h2>

     {/* Connected accounts list */}
     {accounts.length > 0 && (
      <div className="mb-8 space-y-3">
       {accounts.map(acc => (
        <div key={acc.id} className="flex items-center gap-4 text-xs bg-black border border-zinc-800 px-4 py-3 shadow-inner">
         <span className="w-2 h-2 rounded-full bg-matrix animate-pulse shadow-[0_0_8px_rgba(0,255,65,0.8)]"></span>
         <span className="text-white font-bold tracking-wider">{accountLabel(acc)}</span>
         <span className="ml-auto text-gray-500">PORT: {acc.port || 'TCP'}</span>
        </div>
       ))}
      </div>
     )}

     <div className="flex gap-4 mb-6">
      <button
       onClick={() => setProvider('smtp')}
       className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-colors ${provider === 'smtp' ? 'border-matrix text-obsidian bg-matrix shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]' : 'border-divider text-gray-400 bg-obsidian hover:text-white hover:border-gray-500'}`}
      >
       SMTP
      </button>
      <button
       onClick={() => setProvider('gmail')}
       className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-colors ${provider === 'gmail' ? 'border-matrix text-obsidian bg-matrix shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]' : 'border-divider text-gray-400 bg-obsidian hover:text-white hover:border-gray-500'}`}
      >
       Gmail / OAuth
      </button>
     </div>

     {provider === 'smtp' ? (
      <form onSubmit={handleSmtpSave} className="space-y-4 max-w-md bg-black border border-zinc-800 p-6">
       <div>
        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-widest">Hostname</label>
        <div className="relative">
         <CloudRain className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
         <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.hostinger.com" required className="w-full bg-black border border-zinc-800 p-2.5 pl-10 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white placeholder-gray-600" />
        </div>
       </div>
       <div>
        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-widest">Port</label>
        <input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="465" required className="w-full bg-black border border-zinc-800 p-2.5 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white placeholder-gray-600" />
       </div>
       <div>
        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-widest">Email Address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@company.com" required className="w-full bg-black border border-zinc-800 p-2.5 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white placeholder-gray-600" />
       </div>
       <div>
        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-widest">App Password</label>
        <div className="relative">
         <Lock className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
         <input type="password" value={appPassword} onChange={e => setAppPassword(e.target.value)} placeholder="••••••••••••" required className="w-full bg-black border border-zinc-800 p-2.5 pl-10 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white placeholder-gray-600" />
        </div>
       </div>
       {saveMsg && <p className={`text-[11px] px-4 py-2 border uppercase tracking-wider ${saveMsg.includes('success') ? 'text-matrix border-matrix/30 bg-matrix/5' : 'text-red-500 border-red-500/30 bg-red-900/10'}`}>{saveMsg}</p>}
       <button type="submit" disabled={saving} className="bg-matrix hover:bg-matrix-hover text-obsidian w-full py-3 text-sm font-bold transition-all disabled:opacity-50 tracking-wider shadow-[0_0_10px_rgba(0,255,65,0.15)] mt-4">
        {saving ? 'Saving...' : 'Save Account'}
       </button>
      </form>
     ) : (
      <div className="py-4">
       <div className="text-xs text-gray-500 border border-divider bg-obsidian px-5 py-4 max-w-sm tracking-wide leading-relaxed">
        <span className="text-yellow-500 font-bold block mb-2 uppercase">WARNING: Not Configured</span>
        Google OAuth is not set up yet. Add your Google OAuth credentials to the backend <span className="text-white font-mono">.env</span> file to enable this.
       </div>
      </div>
     )}
    </section>

    {/* API Spend */}
    <section className="bg-gunmetal shadow-2xl border border-divider p-8 rounded-none relative overflow-hidden bento-hover">
     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] pointer-events-none"></div>
     <h2 className="text-lg font-bold mb-6 flex items-center gap-3 tracking-wider uppercase">
      <Cpu className="w-5 h-5 text-blue-400" />
      AI Usage (OpenRouter)
     </h2>
     <div className="flex justify-between items-center text-sm bg-obsidian p-6 border border-divider shadow-inner max-w-2xl">
      <div>
       <span className="text-gray-500 uppercase tracking-widest text-[10px] block mb-2">Amount Spent</span>
       <div className="text-3xl font-bold mt-1 text-white flex items-baseline gap-2">
        {userMe ? (
         <>
          <span className="text-blue-400 tracking-tighter">${Number(userMe.balance).toFixed(2)}</span> 
          <span className="text-sm text-gray-500">/ ${Number(userMe.api_limit).toFixed(2)}</span>
         </>
        ) : (
         <span className="text-gray-500 text-sm italic">Querying billing...</span>
        )}
       </div>
      </div>
      <div className="text-right border-l border-divider pl-6">
       <span className="text-gray-500 uppercase tracking-widest text-[10px] block mb-3">Monthly Limit</span>
       <button disabled className="text-xs border text-red-500 border-red-500/30 bg-red-900/10 px-4 py-2 cursor-not-allowed font-bold tracking-wider">
        Admin Only
       </button>
      </div>
     </div>
    </section>
   </div>
  </div>
 );
}
