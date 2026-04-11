import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface EmailAccount { id: number; provider: string; credentials_json: string; }
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

 const accountLabel = (acc: EmailAccount) => {
  try {
   const creds = JSON.parse(acc.credentials_json);
   return `${creds.email || '—'} via ${acc.provider}`;
  } catch { return acc.provider; }
 };

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
   setSaveMsg('Connection saved.');
   setHost(''); setPort('465'); setEmail(''); setAppPassword('');
   loadData();
  } catch (err: unknown) {
   setSaveMsg(err instanceof Error ? err.message : 'Failed to save.');
  } finally {
   setSaving(false);
  }
 };

 return (
  <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
   <header className="border-b border-border pb-4">
    <h1 className="text-2xl font-bold text-primary">SETTINGS_MODULE</h1>
    <p className="text-textMuted">Configure core infrastructure integrations and operational parameters.</p>
   </header>

   <div className="space-y-6">
    {/* Email Accounts */}
    <section className="bg-surface shadow-sm border border-border p-6 rounded relative overflow-hidden">
     <div className="absolute top-0 left-0 w-1 h-full bg-primary/20"></div>
     <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
      <span className="w-2 h-2 bg-primary inline-block rounded-full"></span>
      EMAIL ACCOUNTS
     </h2>

     {/* Connected accounts list */}
     {accounts.length > 0 && (
      <div className="mb-4 space-y-2">
       {accounts.map(acc => (
        <div key={acc.id} className="flex items-center gap-3 text-xs bg-surface border border-border px-3 py-2">
         <span className="w-2 h-2 rounded-full bg-primary"></span>
         <span className="text-textMain">{accountLabel(acc)}</span>
        </div>
       ))}
      </div>
     )}

     <div className="flex gap-4 mb-4">
      <button
       onClick={() => setProvider('smtp')}
       className={`px-4 py-2 text-sm border ${provider === 'smtp' ? 'border-primary text-primary bg-primary/5 text-primary bg-primary/5' : 'border-border text-textMuted hover:text-textMain'}`}
      >
       HOSTINGER / IMAP
      </button>
      <button
       onClick={() => setProvider('gmail')}
       className={`px-4 py-2 text-sm border ${provider === 'gmail' ? 'border-primary text-primary bg-primary/5 text-primary bg-primary/5' : 'border-border text-textMuted hover:text-textMain'}`}
      >
       GOOGLE OAUTH
      </button>
     </div>

     {provider === 'smtp' ? (
      <form onSubmit={handleSmtpSave} className="space-y-4 max-w-sm">
       <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="Server Host (e.g. smtp.hostinger.com)" required className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
       <input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="Port (e.g. 465)" required className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
       <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
       <input type="password" value={appPassword} onChange={e => setAppPassword(e.target.value)} placeholder="App Password" required className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
       {saveMsg && <p className={`text-xs px-3 py-2 border ${saveMsg.includes('saved') ? 'text-primary border-primary text-primary bg-primary/5/30 bg-primary/5' : 'text-red-400 border-red-900/50 bg-red-900/10'}`}>{saveMsg}</p>}
       <button type="submit" disabled={saving} className="bg-slate-100 hover:bg-primary/20 hover:text-primary border border-border hover:border-primary p-2 w-full text-sm font-bold transition-colors disabled:opacity-50">
        {saving ? 'SAVING...' : 'ADD SMTP CONNECTION'}
       </button>
      </form>
     ) : (
      <div className="py-4">
       <div className="text-xs text-textMuted border border-border bg-surface px-4 py-3 max-w-sm">
        Google OAuth flow not yet configured on the server. Add your Google OAuth credentials to the backend to enable this.
       </div>
      </div>
     )}
    </section>

    {/* API Spend */}
    <section className="bg-surface shadow-sm border border-border p-6 rounded relative overflow-hidden">
     <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/20"></div>
     <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
      <span className="w-2 h-2 bg-yellow-500 inline-block rounded-full"></span>
      ANTHROPIC API SATELLITE
     </h2>
     <div className="flex justify-between items-center text-sm bg-surface p-4 border border-border ">
      <div>
       <span className="text-textMuted">Current Expenditure:</span>
       <div className="text-xl font-bold mt-1 text-textMain">
        {userMe ? (
         <>$<span className="text-yellow-500">{Number(userMe.balance).toFixed(2)}</span> / ${Number(userMe.api_limit).toFixed(2)}</>
        ) : (
         <span className="text-textMuted text-sm">Loading...</span>
        )}
       </div>
      </div>
      <div className="text-right">
       <span className="text-textMuted block mb-1">Global Set Limit</span>
       <button disabled className="text-xs border text-red-500 border-red-900 bg-red-900/20 px-3 py-1 cursor-not-allowed">ADMIN_LOCK</button>
      </div>
     </div>
    </section>
   </div>
  </div>
 );
}
