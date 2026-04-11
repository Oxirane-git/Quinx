import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface Campaign { id: number; name: string; niche: string; }
interface Lead { id: number; business_name: string; email: string; city: string; status: string; }

export default function Writer() {
 const [campaigns, setCampaigns] = useState<Campaign[]>([]);
 const [selectedCampaign, setSelectedCampaign] = useState<number | ''>('');
 const [leads, setLeads] = useState<Lead[]>([]);
 const [fromLead, setFromLead] = useState(0);
 const [toLead, setToLead] = useState(100);
 const [temperature, setTemperature] = useState(0.7);
 const [maxTokens, setMaxTokens] = useState(1024);
 const [running, setRunning] = useState(false);
 const [progress, setProgress] = useState(0);
 const [error, setError] = useState('');
 const [downloadId, setDownloadId] = useState<number | null>(null);
 const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

 useEffect(() => {
  api.get('/api/campaigns').then(setCampaigns).catch(() => {});
  return () => { if (pollRef.current) clearInterval(pollRef.current); };
 }, []);

 const handleCampaignChange = async (id: number | '') => {
  setSelectedCampaign(id);
  setLeads([]);
  setDownloadId(null);
  if (!id) return;
  try {
   const data = await api.get(`/api/campaigns/${id}/leads`);
   setLeads(data.leads || []);
   setToLead(data.leads?.length || 100);
  } catch { /* ignore */ }
 };

 const estimatedCost = ((toLead - fromLead) * 0.01).toFixed(2);

 const startWriting = async () => {
  if (!selectedCampaign) { setError('Select a campaign first.'); return; }
  setError('');
  setRunning(true);
  setProgress(0);
  setDownloadId(null);
  try {
   const { job_id } = await api.post('/api/writer/start-task', {
    campaign_id: selectedCampaign,
    from_lead: fromLead,
    to_lead: toLead,
    temperature,
    max_tokens: maxTokens,
    skip_missing: true,
   });

   pollRef.current = setInterval(async () => {
    try {
     const status = await api.get(`/api/campaigns/task/${job_id}/status`);
     if (status.status === 'SUCCESS') {
      setProgress(100);
      clearInterval(pollRef.current!);
      setRunning(false);
      setDownloadId(selectedCampaign as number);
      const data = await api.get(`/api/campaigns/${selectedCampaign}/leads`);
      setLeads(data.leads || []);
     } else if (status.status === 'FAILURE') {
      setError('Writer task failed.');
      clearInterval(pollRef.current!);
      setRunning(false);
     } else if (status.status === 'STARTED' || status.status === 'PENDING') {
      setProgress(p => Math.min(p + 5, 90));
     }
    } catch {
     clearInterval(pollRef.current!);
     setRunning(false);
    }
   }, 2000);
  } catch (err: unknown) {
   setError(err instanceof Error ? err.message : 'Failed to start writer');
   setRunning(false);
  }
 };

 return (
  <div className="flex gap-6 h-full animate-in fade-in duration-500">
   <div className="w-1/3 flex flex-col gap-6 overflow-y-auto">
    <header className="border-b border-border pb-4">
     <h1 className="text-2xl font-bold text-primary ">LLM_WRITER</h1>
     <p className="text-textMuted text-sm mt-1">Batch process generated copy.</p>
    </header>

    <div className="bg-surface shadow-sm border border-border p-5 space-y-4">
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Target Campaign</label>
      <select
       value={selectedCampaign}
       onChange={e => handleCampaignChange(e.target.value ? Number(e.target.value) : '')}
       className="w-full bg-surface border border-border p-2 text-sm text-textMain outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
       <option value="">-- Select Campaign --</option>
       {campaigns.map(c => (
        <option key={c.id} value={c.id}>{c.name} ({c.niche})</option>
       ))}
      </select>
     </div>
     <div className="flex gap-4">
      <div className="flex-1">
       <label className="text-xs uppercase text-textMuted block mb-1">Index Start</label>
       <input type="number" value={fromLead} onChange={e => setFromLead(Number(e.target.value))} className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
      </div>
      <div className="flex-1">
       <label className="text-xs uppercase text-textMuted block mb-1">Index End</label>
       <input type="number" value={toLead} onChange={e => setToLead(Number(e.target.value))} className="w-full bg-surface border border-border p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-textMain" />
      </div>
     </div>
     <div>
      <label className="text-xs uppercase text-textMuted mb-1 flex justify-between">
       <span>Temperature</span>
       <span className="text-primary border border-primary/20 px-1">{temperature}</span>
      </label>
      <input type="range" min="0.3" max="1" step="0.1" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-primary" />
     </div>
     <div>
      <label className="text-xs uppercase text-textMuted block mb-1">Max Tokens</label>
      <div className="flex gap-4">
       <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="tk" checked={maxTokens === 1024} onChange={() => setMaxTokens(1024)} className="accent-primary" /> 1024</label>
       <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="tk" checked={maxTokens === 2048} onChange={() => setMaxTokens(2048)} className="accent-primary" /> 2048</label>
      </div>
     </div>
     <div className="text-xs bg-surface p-3 border border-border mt-4 text-textMain text-sm">
      <p>Estimated Cost:</p>
      <p className="text-lg font-bold text-primary">${estimatedCost}</p>
     </div>
     {error && <p className="text-red-400 text-xs border border-red-900/50 bg-red-900/10 px-3 py-2">{error}</p>}
     <button
      disabled={running}
      onClick={startWriting}
      className="w-full py-3 mt-4 border border-primary/20 text-sm font-bold bg-surface transition-colors bg-primary/10 text-primary hover:bg-primaryHover hover:text-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed shadow"
     >
      {running ? 'PROCESSING...' : 'EXECUTE_GENERATION'}
     </button>

     {downloadId && (
      <button
       type="button"
       onClick={() => api.download(`/api/campaigns/${downloadId}/download/emails`, `campaign_${downloadId}_emails.xlsx`)}
       className="w-full py-2 border border-primary text-primary bg-primary/5/40 text-primary text-sm hover:bg-primaryHover hover:text-white hover:text-black transition-colors"
      >
       ↓ DOWNLOAD_EMAILS.xlsx
      </button>
     )}
    </div>
   </div>

   <div className="flex-1 flex flex-col gap-4">
    <div className="bg-surface border border-border flex-1 p-4 relative overflow-auto">
     <div className="absolute top-0 right-0 p-4 font-bold text-3xl opacity-10">OUTPUT_PREVIEW</div>
     <table className="w-full text-left text-sm whitespace-nowrap text-textMain text-sm">
      <thead className="uppercase text-xs text-textMuted border-b border-border">
       <tr>
        <th className="py-2">#</th>
        <th>Business</th>
        <th>Email</th>
        <th>City</th>
        <th>Status</th>
       </tr>
      </thead>
      <tbody>
       {leads.length === 0 ? (
        <tr><td colSpan={5} className="py-4 text-textMuted italic">No leads loaded. Select a campaign.</td></tr>
       ) : leads.map((lead, i) => (
        <tr key={lead.id} className="border-b border-border hover:bg-surface shadow-sm">
         <td className="py-2">{i + 1}</td>
         <td>{lead.business_name}</td>
         <td>{lead.email}</td>
         <td>{lead.city}</td>
         <td className={lead.status === 'written' ? 'text-primary font-bold' : 'text-textMuted'}>{lead.status?.toUpperCase() || 'PENDING'}</td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>

    <div className="bg-surface shadow-sm border border-border h-10 p-2 flex items-center">
     <div className="w-full bg-surface h-2 rounded overflow-hidden">
      <div
       className="bg-primary h-full  transition-all duration-300"
       style={{ width: `${progress}%` }}
      ></div>
     </div>
     <span className="ml-4 text-xs font-bold text-primary">{progress}%</span>
    </div>
   </div>
  </div>
 );
}
