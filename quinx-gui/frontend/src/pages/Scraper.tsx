import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';

export default function Scraper() {
 const [logs, setLogs] = useState<string[]>([]);
 const [isRunning, setIsRunning] = useState(false);
 const [niche, setNiche] = useState('');
 const [cities, setCities] = useState('');
 const [leadLimit, setLeadLimit] = useState(60);
 const [campaignName, setCampaignName] = useState('');
 const [downloadId, setDownloadId] = useState<number | null>(null);
 const [downloadName, setDownloadName] = useState('');
 const logEndRef = useRef<HTMLDivElement>(null);
 const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

 const appendLog = (line: string) => setLogs(prev => [...prev, line]);

 const startScrape = async (e: React.SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsRunning(true);
  setDownloadId(null);
  setLogs(['[SYSTEM] Dispatching scraper task...']);

  const cityList = cities.split(',').map(c => c.trim()).filter(Boolean);
  const name = campaignName || `${niche}_${Date.now()}`;

  try {
   const { job_id, campaign_id } = await api.post('/api/scraper/start-task', {
    niche,
    cities: cityList,
    lead_limit: leadLimit,
    campaign_name: name,
   });

   appendLog(`[INFO] Task queued — Job ID: ${job_id}`);

   pollRef.current = setInterval(async () => {
    try {
     const status = await api.get(`/api/campaigns/task/${job_id}/status`);
     appendLog(`[WORKER] Status: ${status.status}`);

     if (status.status === 'SUCCESS') {
      appendLog(`[SYSTEM] Task complete. ${JSON.stringify(status.result)}`);
      clearInterval(pollRef.current!);
      setIsRunning(false);
      setDownloadId(campaign_id);
      setDownloadName(name);
     } else if (status.status === 'FAILURE') {
      appendLog(`[ERROR] Task failed.`);
      clearInterval(pollRef.current!);
      setIsRunning(false);
     }
    } catch {
     appendLog('[ERROR] Failed to poll task status.');
     clearInterval(pollRef.current!);
     setIsRunning(false);
    }
   }, 2000);
  } catch (err: unknown) {
   appendLog(`[ERROR] ${err instanceof Error ? err.message : 'Failed to start task'}`);
   setIsRunning(false);
  }
 };

 useEffect(() => {
  logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [logs]);

 useEffect(() => {
  return () => { if (pollRef.current) clearInterval(pollRef.current); };
 }, []);

 return (
  <div className="flex gap-6 h-full animate-in fade-in duration-500">
   <div className="w-1/3 flex flex-col gap-6">
    <header className="border-b border-border pb-4">
     <h1 className="text-2xl font-bold text-primary ">LEAD_EXTRACTION</h1>
     <p className="text-textMuted text-sm mt-1">Configure and deploy scraping spiders.</p>
    </header>

    <form onSubmit={startScrape} className="bg-surface shadow-sm border border-border p-5 space-y-4">
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Campaign Name</label>
      <input
       type="text"
       value={campaignName}
       onChange={e => setCampaignName(e.target.value)}
       className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain"
       placeholder="e.g. NYC_Restaurants_Q1"
      />
     </div>
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Target Niche</label>
      <input
       type="text"
       value={niche}
       onChange={e => setNiche(e.target.value)}
       className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain"
       placeholder="e.g. Restaurants"
       required
      />
     </div>
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Geolocation Vectors (comma-separated)</label>
      <textarea
       value={cities}
       onChange={e => setCities(e.target.value)}
       className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain resize-none h-20"
       placeholder="New York, London, Tokyo..."
       required
      />
     </div>
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Max Leads / Vector</label>
      <input
       type="number"
       value={leadLimit}
       onChange={e => setLeadLimit(Number(e.target.value))}
       max="200"
       className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain"
      />
     </div>
     <button
      disabled={isRunning}
      type="submit"
      className="w-full py-3 mt-4 border text-sm font-bold bg-surface transition-colors bg-primary/10 border-primary/20 text-primary hover:bg-primaryHover hover:text-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed shadow"
     >
      {isRunning ? 'RUNTIME_ACTIVE' : 'DEPLOY_SPIDERS'}
     </button>

     {downloadId && (
      <button
       type="button"
       onClick={() => api.download(`/api/campaigns/${downloadId}/download/leads`, `${downloadName}_leads.xlsx`)}
       className="w-full py-2 border border-primary text-primary bg-primary/5/40 text-primary text-sm hover:bg-primaryHover hover:text-white hover:text-black transition-colors"
      >
       ↓ DOWNLOAD_LEADS.xlsx
      </button>
     )}
    </form>
   </div>

   <div className="flex-1 bg-surface border border-border flex flex-col shadow-2xl relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-primary h-1 opacity-20"></div>
    <div className="p-3 border-b border-border bg-surface shadow-sm flex items-center justify-between text-xs">
     <span className="text-textMuted">TERMINAL OUTPUT</span>
     <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-primary animate-pulse' : 'bg-slate-200'}`}></span>
    </div>
    <div className="flex-1 p-4 overflow-y-auto text-sm text-textMain text-sm space-y-1">
     {logs.length === 0 ? (
      <span className="text-textMuted italic">Waiting for task dispatch...</span>
     ) : (
      logs.map((l, i) => (
       <div key={i} className={l.includes('ERROR') ? 'text-red-400' : l.includes('SUCCESS') || l.includes('[INFO]') ? 'text-primary' : l.includes('SYSTEM') ? 'text-blue-400' : ''}>
        <span className="text-textMuted mr-2">{new Date().toISOString().split('T')[1].substring(0, 8)}</span>
        {l}
       </div>
      ))
     )}
     <div ref={logEndRef} />
    </div>
   </div>
  </div>
 );
}
