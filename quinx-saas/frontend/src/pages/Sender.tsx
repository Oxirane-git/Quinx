import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface Campaign { id: number; name: string; niche: string; }
interface EmailAccount { id: number; provider: string; credentials_json: string; }

export default function Sender() {
 const [campaigns, setCampaigns] = useState<Campaign[]>([]);
 const [accounts, setAccounts] = useState<EmailAccount[]>([]);
 const [campaignId, setCampaignId] = useState<number | ''>('');
 const [accountId, setAccountId] = useState<number | ''>('');
 const [minDelay, setMinDelay] = useState(15);
 const [maxDelay, setMaxDelay] = useState(45);
 const [fromLead, setFromLead] = useState(0);
 const [toLead, setToLead] = useState(100);
 const [running, setRunning] = useState(false);
 const [logs, setLogs] = useState<string[]>([]);
 const [error, setError] = useState('');
 const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const logEndRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  api.get('/api/campaigns').then(setCampaigns).catch(() => {});
  api.get('/api/users/settings/email-accounts').then(setAccounts).catch(() => {});
  return () => { if (pollRef.current) clearInterval(pollRef.current); };
 }, []);

 useEffect(() => {
  logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [logs]);

 const appendLog = (line: string) => setLogs(prev => [...prev, line]);

 const accountLabel = (acc: EmailAccount) => {
  try {
   const creds = JSON.parse(acc.credentials_json);
   return `${creds.email || acc.provider} (${acc.provider})`;
  } catch { return acc.provider; }
 };

 const handleDispatch = async () => {
  if (!campaignId || !accountId) { setError('Select a campaign and email account.'); return; }
  setError('');
  setRunning(true);
  setLogs(['[SYSTEM] Initiating dispatch sequence...']);
  try {
   const { job_id } = await api.post('/api/sender/start-task', {
    campaign_id: campaignId,
    from_lead: fromLead,
    to_lead: toLead,
    account_id: accountId,
    min_delay: minDelay,
    max_delay: maxDelay,
   });
   appendLog(`[INFO] Task queued — Job ID: ${job_id}`);

   pollRef.current = setInterval(async () => {
    try {
     const status = await api.get(`/api/campaigns/task/${job_id}/status`);
     appendLog(`[RELAY] Status: ${status.status}`);
     if (status.status === 'SUCCESS') {
      appendLog(`[SYSTEM] Dispatch complete. ${JSON.stringify(status.result)}`);
      clearInterval(pollRef.current!);
      setRunning(false);
     } else if (status.status === 'FAILURE') {
      appendLog('[ERROR] Dispatch task failed.');
      clearInterval(pollRef.current!);
      setRunning(false);
     }
    } catch {
     appendLog('[ERROR] Lost contact with relay.');
     clearInterval(pollRef.current!);
     setRunning(false);
    }
   }, 2000);
  } catch (err: unknown) {
   appendLog(`[ERROR] ${err instanceof Error ? err.message : 'Failed to start dispatch'}`);
   setRunning(false);
  }
 };

 const handleAbort = () => {
  if (pollRef.current) clearInterval(pollRef.current);
  appendLog('[SYSTEM] Transmission aborted by operator.');
  setRunning(false);
 };

 return (
  <div className="flex gap-6 h-full animate-in fade-in duration-500">
   <div className="w-1/3 flex flex-col gap-6">
    <header className="border-b border-border pb-4">
     <h1 className="text-2xl font-bold text-primary ">SMTP_DISPATCH</h1>
     <p className="text-textMuted text-sm mt-1">Configure and fire delivery queues.</p>
    </header>

    <div className="bg-surface shadow-sm border border-border p-5 space-y-4">
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Generated Payload</label>
      <select
       value={campaignId}
       onChange={e => setCampaignId(e.target.value ? Number(e.target.value) : '')}
       className="w-full bg-surface border border-border p-2 text-sm text-textMain outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
       <option value="">-- Select Campaign --</option>
       {campaigns.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
       ))}
      </select>
     </div>
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Sending Relay (SMTP/OAuth)</label>
      <select
       value={accountId}
       onChange={e => setAccountId(e.target.value ? Number(e.target.value) : '')}
       className="w-full bg-surface border border-border p-2 text-sm text-textMain outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
       <option value="">-- Select Account --</option>
       {accounts.map(a => (
        <option key={a.id} value={a.id}>{accountLabel(a)}</option>
       ))}
      </select>
      {accounts.length === 0 && (
       <p className="text-textMuted text-xs mt-1">No email accounts. Add one in Settings.</p>
      )}
     </div>
     <div className="flex gap-4">
      <div className="flex-1">
       <label className="text-xs uppercase text-textMuted block mb-1">From #</label>
       <input type="number" value={fromLead} onChange={e => setFromLead(Number(e.target.value))} className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
      </div>
      <div className="flex-1">
       <label className="text-xs uppercase text-textMuted block mb-1">To #</label>
       <input type="number" value={toLead} onChange={e => setToLead(Number(e.target.value))} className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
      </div>
     </div>
     <div className="flex gap-4">
      <div className="flex-1">
       <label className="text-xs uppercase text-textMuted block mb-1">Min Delay (s)</label>
       <input type="number" value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
      </div>
      <div className="flex-1">
       <label className="text-xs uppercase text-textMuted block mb-1">Max Delay (s)</label>
       <input type="number" value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
      </div>
     </div>
     {error && <p className="text-red-400 text-xs border border-red-900/50 bg-red-900/10 px-3 py-2">{error}</p>}
     <button
      onClick={running ? handleAbort : handleDispatch}
      className={`w-full py-3 mt-4 border font-bold transition-colors text-sm shadow ${running ? 'bg-red-900/20 border-red-500/50 text-red-500 hover:bg-red-900/40' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primaryHover hover:text-white hover:text-black'}`}
     >
      {running ? 'ABORT_TRANSMISSION' : 'INITIATE_DISPATCH'}
     </button>
    </div>
   </div>

   <div className="flex-1 bg-surface border border-border flex flex-col relative overflow-hidden">
    <div className="p-3 border-b border-border bg-surface shadow-sm flex items-center justify-between text-xs">
     <span className="text-textMuted">RELAY_LOG // {running ? 'ACTIVE' : 'IDLE'}</span>
     <span className={`w-3 h-3 rounded-full ${running ? 'bg-primary animate-pulse' : 'bg-slate-200'}`}></span>
    </div>
    <div className="flex-1 p-4 overflow-y-auto text-sm text-textMain text-sm space-y-1">
     {logs.length === 0 ? (
      <span className="text-textMuted italic">No active dispatch routines...</span>
     ) : logs.map((l, i) => (
      <div key={i} className={l.includes('ERROR') ? 'text-red-400' : l.includes('[INFO]') || l.includes('complete') ? 'text-primary' : l.includes('SYSTEM') ? 'text-blue-400' : ''}>
       <span className="text-textMuted mr-2">{new Date().toISOString().split('T')[1].substring(0, 8)}</span>
       {l}
      </div>
     ))}
     <div ref={logEndRef} />
    </div>
   </div>
  </div>
 );
}
