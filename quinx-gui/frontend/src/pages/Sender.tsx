import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Send, Server, Activity } from 'lucide-react';

interface Campaign { id: number; name: string; niche: string; }
interface EmailAccount { id: number; provider: string; email: string; host: string; port: string; }

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
 const [jobId, setJobId] = useState<string | null>(null);
 const [log, setLog] = useState('');
 const [error, setError] = useState('');
 const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const logEndRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  api.get('/api/campaigns/').then(setCampaigns).catch(() => {});
  api.get('/api/users/settings/email-accounts').then(setAccounts).catch(() => {});
  return () => { if (pollRef.current) clearInterval(pollRef.current); };
 }, []);

 useEffect(() => {
  logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [log]);

 const accountLabel = (acc: EmailAccount) => `${acc.email || '—'} (${acc.provider})`;

 const handleDispatch = async () => {
  if (!campaignId || !accountId) { setError('Select a campaign and email account.'); return; }
  setError('');
  setRunning(true);
  setLog('[SYSTEM] Initiating dispatch sequence...');
  try {
   const { job_id } = await api.post('/api/sender/start-task', {
    campaign_id: campaignId,
    from_lead: fromLead,
    to_lead: toLead,
    account_id: accountId,
    min_delay: minDelay,
    max_delay: maxDelay,
   });
   setJobId(job_id);

   pollRef.current = setInterval(async () => {
    try {
     const status = await api.get(`/api/campaigns/task/${job_id}/status`);
     if (status.log) setLog(status.log);
     if (status.status === 'SUCCESS') {
      setLog(prev => prev + '\n[SYSTEM] Dispatch complete.');
      clearInterval(pollRef.current!);
      setRunning(false);
      setJobId(null);
     } else if (status.status === 'FAILURE') {
      setLog(prev => prev + `\n[ERROR] ${status.result?.error || 'Dispatch task failed.'}`);
      clearInterval(pollRef.current!);
      setRunning(false);
      setJobId(null);
     } else if (status.status === 'CANCELLED') {
      clearInterval(pollRef.current!);
      setRunning(false);
      setJobId(null);
     }
    } catch {
     setLog(prev => prev + '\n[ERROR] Lost contact with relay.');
     clearInterval(pollRef.current!);
     setRunning(false);
     setJobId(null);
    }
   }, 2000);
  } catch (err: unknown) {
   setLog(`[ERROR] ${err instanceof Error ? err.message : 'Failed to start dispatch'}`);
   setRunning(false);
  }
 };

 const handleAbort = async () => {
  if (pollRef.current) clearInterval(pollRef.current);
  if (jobId) {
   await api.post(`/api/sender/stop-task/${jobId}`, {}).catch(() => {});
  }
  setLog(prev => prev + '\n[SYSTEM] Transmission aborted by operator.');
  setRunning(false);
  setJobId(null);
 };

 return (
  <div className="flex gap-8 h-full animate-in fade-in duration-500 font-sans text-white">
   <div className="w-[400px] flex flex-col gap-6 flex-shrink-0">
    <header className="border-b border-divider pb-4">
     <div className="flex items-center space-x-3 mb-2">
      <Send className="w-6 h-6 text-matrix" />
      <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">SMTP_DISPATCH</h1>
     </div>
     <p className="text-gray-400 text-sm pl-9">Configure and fire delivery queues.</p>
    </header>

    <div className="bg-gunmetal border border-divider p-6 space-y-6 bento-hover relative">
     <div className="absolute top-0 right-0 w-16 h-16 bg-matrix/5 rounded-bl-full pointer-events-none"></div>

     <div className="space-y-5 font-mono">
      <div>
       <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* TARGET_PAYLOAD</label>
       <select
        value={campaignId}
        onChange={e => setCampaignId(e.target.value ? Number(e.target.value) : '')}
        className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none focus:border-matrix focus:ring-1 focus:ring-matrix rounded-none appearance-none"
       >
        <option value="">-- SELECT_PAYLOAD_NODE --</option>
        {campaigns.map(c => (
         <option key={c.id} value={c.id}>{c.name}</option>
        ))}
       </select>
      </div>
      <div>
       <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* SMTP_RELAY_NODE</label>
       <select
        value={accountId}
        onChange={e => setAccountId(e.target.value ? Number(e.target.value) : '')}
        className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none focus:border-matrix focus:ring-1 focus:ring-matrix rounded-none appearance-none"
       >
        <option value="">-- SELECT_SMTP_INSTANCE --</option>
        {accounts.map(a => (
         <option key={a.id} value={a.id}>{accountLabel(a)}</option>
        ))}
       </select>
       {accounts.length === 0 && (
        <p className="text-yellow-500/70 text-xs mt-2 italic flex gap-2"><Activity className="w-4 h-4"/> No outbound relays detected. Config in Settings.</p>
       )}
      </div>
      <div className="flex gap-4">
       <div className="flex-1">
        <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">INDEX_START</label>
        <input type="number" value={fromLead} onChange={e => setFromLead(Number(e.target.value))} className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-none" />
       </div>
       <div className="flex-1">
        <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">INDEX_END</label>
        <input type="number" value={toLead} onChange={e => setToLead(Number(e.target.value))} className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-none" />
       </div>
      </div>
      <div className="flex gap-4 bg-black border border-zinc-800 p-4 shadow-inner">
       <div className="flex-1">
        <label className="text-[10px] font-bold text-matrix block mb-2 tracking-wider uppercase">Min STAGGER (s)</label>
        <input type="number" value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-none" />
       </div>
       <div className="flex-1">
        <label className="text-[10px] font-bold text-matrix block mb-2 tracking-wider uppercase">Max STAGGER (s)</label>
        <input type="number" value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-none" />
       </div>
      </div>
      {error && <p className="text-red-500 text-xs border border-red-500/30 bg-red-900/10 px-4 py-3 tracking-wide rounded-none mt-2">ERR: {error}</p>}
     </div>

     <div className="flex gap-3 pt-4 border-t border-divider font-mono">
      <button
       disabled={running}
       onClick={handleDispatch}
       className="flex-1 py-3 text-sm font-bold transition-all bg-matrix text-obsidian hover:bg-matrix-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gunmetal disabled:text-gray-500 disabled:border-divider border border-transparent shadow-[0_0_10px_rgba(0,255,65,0.15)] flex justify-center items-center gap-2"
      >
       <Send className="w-4 h-4" />
       {running ? 'DISPATCH_IN_PROGRESS...' : 'INITIATE_DISPATCH()'}
      </button>
      {running && (
       <button
        onClick={handleAbort}
        className="px-6 py-3 text-sm font-bold border border-red-500/50 text-red-500 bg-red-900/10 hover:bg-red-500 hover:text-white transition-colors"
       >
        SIGKILL
       </button>
      )}
     </div>
    </div>
   </div>

   <div className="flex-1 bg-black border border-zinc-800 flex flex-col shadow-2xl relative overflow-hidden bento-hover">
    <div className={`absolute top-0 left-0 w-full h-1 ${running ? 'bg-matrix animate-pulse shadow-[0_0_15px_rgba(0,255,65,0.5)]' : 'bg-gray-800'}`}></div>
    
    <div className="p-4 border-b border-divider bg-gunmetal/80 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500">
     <div className="flex items-center gap-2">
      <Server className="w-4 h-4" />
      <span>STDOUT // RELAY_LOG</span>
     </div>
     <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${running ? 'bg-matrix animate-pulse' : 'bg-gray-600'}`}></span>
      <span>{running ? 'OUTBOUND_ACTIVE' : 'IDLE'}</span>
     </div>
    </div>

    <div className="flex-1 p-5 overflow-y-auto font-mono text-xs max-w-full space-y-1.5 scrollbar-thin scrollbar-thumb-divider scrollbar-track-transparent">
     {!log ? (
      <span className="text-gray-600 italic">No active dispatch routines...</span>
     ) : log.split('\n').map((l, i) => {
      const isError = l.includes('ERROR');
      const isSuccess = l.includes('complete') || l.includes('SUCCESS');
      const isSystem = l.includes('SYSTEM');
      
      let textColor = 'text-gray-400';
      if (isError) textColor = 'text-red-500';
      else if (isSuccess) textColor = 'text-matrix/90';
      else if (isSystem) textColor = 'text-blue-400';

      return (
       <div key={i} className={`flex gap-3 leading-relaxed break-words hover:bg-gunmetal/30 px-1 -mx-1 rounded-sm ${textColor}`}>
        <span className="text-gray-600 flex-shrink-0 select-none">
         [{new Date().toISOString().split('T')[1].substring(0, 8)}]
        </span>
        <span className="break-all">{l}</span>
       </div>
      )
     })}
     <div ref={logEndRef} className="h-4" />
    </div>
   </div>
  </div>
 );
}
