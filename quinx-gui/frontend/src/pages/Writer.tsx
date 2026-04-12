import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Pencil, Send, Download, FileText } from 'lucide-react';

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
 const [campaignConfig, setCampaignConfig] = useState('');
 const [running, setRunning] = useState(false);
 const [jobId, setJobId] = useState<string | null>(null);
 const [log, setLog] = useState('');
 const [error, setError] = useState('');
 const [downloadId, setDownloadId] = useState<number | null>(null);
 const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const logEndRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  api.get('/api/campaigns/').then(setCampaigns).catch(() => {});
  return () => { if (pollRef.current) clearInterval(pollRef.current); };
 }, []);

 useEffect(() => {
  logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [log]);

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
  setLog('[WRITER] Starting email generation...');
  setDownloadId(null);
  try {
   const { job_id } = await api.post('/api/writer/start-task', {
    campaign_id: selectedCampaign,
    from_lead: fromLead,
    to_lead: toLead,
    temperature,
    max_tokens: maxTokens,
    skip_missing: true,
    campaign_config: campaignConfig,
   });
   setJobId(job_id);

   pollRef.current = setInterval(async () => {
    try {
     const status = await api.get(`/api/campaigns/task/${job_id}/status`);
     if (status.log) setLog(status.log);
     if (status.status === 'SUCCESS') {
      setLog(prev => prev + '\n[WRITER] Generation complete.');
      clearInterval(pollRef.current!);
      setRunning(false);
      setJobId(null);
      setDownloadId(selectedCampaign as number);
      const data = await api.get(`/api/campaigns/${selectedCampaign}/leads`);
      setLeads(data.leads || []);
     } else if (status.status === 'FAILURE') {
      setLog(prev => prev + `\n[ERROR] ${status.result?.error || 'Writer task failed.'}`);
      setError(status.result?.error || 'Writer task failed.');
      clearInterval(pollRef.current!);
      setRunning(false);
      setJobId(null);
     } else if (status.status === 'CANCELLED') {
      clearInterval(pollRef.current!);
      setRunning(false);
      setJobId(null);
     }
    } catch {
     clearInterval(pollRef.current!);
     setRunning(false);
     setJobId(null);
    }
   }, 2000);
  } catch (err: unknown) {
   setError(err instanceof Error ? err.message : 'Failed to start writer');
   setRunning(false);
  }
 };

 const stopWriting = async () => {
  if (pollRef.current) clearInterval(pollRef.current);
  if (jobId) {
   await api.post(`/api/writer/stop-task/${jobId}`, {}).catch(() => {});
  }
  setLog(prev => prev + '\n[WRITER] Stopped by operator.');
  setRunning(false);
  setJobId(null);
 };

 return (
  <div className="flex gap-8 h-full animate-in fade-in duration-500 font-sans text-white">
   <div className="w-[400px] flex flex-col gap-6 flex-shrink-0">
    <header className="border-b border-divider pb-4">
     <div className="flex items-center space-x-3 mb-2">
      <Pencil className="w-6 h-6 text-matrix" />
      <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">LLM_WRITER</h1>
     </div>
     <p className="text-gray-400 text-sm pl-9">Batch process semantic payload generation.</p>
    </header>

    <div className="bg-gunmetal border border-divider p-6 space-y-6 bento-hover relative">
     <div className="absolute top-0 right-0 w-16 h-16 bg-matrix/5 rounded-bl-full pointer-events-none"></div>
     <div className="space-y-4 font-mono">
      <div>
       <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* TARGET_CAMPAIGN</label>
       <select
        value={selectedCampaign}
        onChange={e => handleCampaignChange(e.target.value ? Number(e.target.value) : '')}
        className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none focus:border-matrix focus:ring-1 focus:ring-matrix rounded-none appearance-none"
       >
        <option value="">-- SELECT_NODE --</option>
        {campaigns.map(c => (
         <option key={c.id} value={c.id}>{c.name} ({c.niche})</option>
        ))}
       </select>
      </div>
      <div>
       <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">CONFIG_OVERRIDE (OPTIONAL)</label>
       <input
        type="text"
        value={campaignConfig}
        onChange={e => setCampaignConfig(e.target.value)}
        placeholder="e.g. quinx_ai"
        className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-none"
       />
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
      <div>
       <label className="text-xs font-bold text-gray-500 mb-2 flex justify-between uppercase">
        <span>Temperature</span>
        <span className="text-matrix bg-black border border-zinc-800 px-2">{temperature.toFixed(1)}</span>
       </label>
       <input type="range" min="0.3" max="1" step="0.1" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-matrix" />
      </div>
      <div>
       <label className="text-xs font-bold text-gray-500 block mb-3 tracking-wider">MAX_TOKENS</label>
       <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-matrix transition-colors">
         <input type="radio" name="tk" checked={maxTokens === 1024} onChange={() => setMaxTokens(1024)} className="accent-matrix" /> 1024
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-matrix transition-colors">
         <input type="radio" name="tk" checked={maxTokens === 2048} onChange={() => setMaxTokens(2048)} className="accent-matrix" /> 2048
        </label>
       </div>
      </div>
      <div className="text-xs bg-obsidian p-4 border border-divider mt-6 flex justify-between items-center text-white shadow-inner">
       <span className="tracking-wider uppercase text-gray-500">Predicted Compute Cost:</span>
       <span className="text-xl font-bold text-matrix tracking-normal">${estimatedCost}</span>
      </div>
      {error && <p className="text-red-500 text-xs border border-red-500/30 bg-red-900/10 px-4 py-3 tracking-wide rounded-none mt-2">ERR: {error}</p>}
     </div>

     <div className="flex gap-3 pt-4 border-t border-divider font-mono">
      <button
       disabled={running}
       onClick={startWriting}
       className="flex-1 py-3 text-sm font-bold transition-all bg-matrix text-obsidian hover:bg-matrix-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gunmetal disabled:text-gray-500 disabled:border-divider border border-transparent shadow-[0_0_10px_rgba(0,255,65,0.15)] flex justify-center items-center gap-2"
      >
       <Send className="w-4 h-4" />
       {running ? 'PROCESSING...' : 'EXECUTE_GENERATION()'}
      </button>
      {running && (
       <button
        onClick={stopWriting}
        className="px-6 py-3 text-sm font-bold border border-red-500/50 text-red-500 bg-red-900/10 hover:bg-red-500 hover:text-white transition-colors"
       >
        SIGKILL
       </button>
      )}
     </div>

     {downloadId && (
      <button
       type="button"
       onClick={() => api.download(`/api/campaigns/${downloadId}/download/emails`, `campaign_${downloadId}_emails.xlsx`)}
       className="w-full mt-4 py-3 border border-matrix text-matrix bg-matrix/5 text-xs font-bold font-mono tracking-wider hover:bg-matrix hover:text-obsidian transition-all flex items-center justify-center gap-2"
      >
       <Download className="w-4 h-4" />
       PULL_OUTPUT.XLSX
      </button>
     )}
    </div>
   </div>

   <div className="flex-1 flex flex-col gap-6 h-[calc(100vh-6rem)]">
    <div className="bg-gunmetal border border-divider flex-1 overflow-auto bento-hover shadow-lg">
     <div className="p-4 border-b border-divider bg-obsidian flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-matrix/10 to-transparent"></div>
      <div className="flex items-center gap-2">
       <FileText className="w-4 h-4 text-matrix/50" />
       <span>PAYLOAD_INSPECTOR</span>
      </div>
      <span className={`w-2 h-2 rounded-full ${running ? 'bg-matrix animate-pulse' : 'bg-gray-600'}`}></span>
     </div>
     <table className="w-full text-left text-sm whitespace-nowrap text-white font-mono">
      <thead className="uppercase text-[10px] text-gray-500 border-b border-divider sticky top-0 bg-gunmetal">
       <tr>
        <th className="p-4 font-bold tracking-wider">#</th>
        <th className="p-4 font-bold tracking-wider">Target_Entity</th>
        <th className="p-4 font-bold tracking-wider">Address</th>
        <th className="p-4 font-bold tracking-wider">Vector</th>
        <th className="p-4 font-bold tracking-wider">State</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-divider/50 text-xs">
       {leads.length === 0 ? (
        <tr><td colSpan={5} className="p-6 text-gray-600 italic">No valid entities. Initialize node selection.</td></tr>
       ) : leads.map((lead, i) => (
        <tr key={lead.id} className="hover:bg-obsidian transition-colors">
         <td className="p-4 text-gray-500">{i + 1}</td>
         <td className="p-4 ">{lead.business_name}</td>
         <td className="p-4 text-gray-400">{lead.email}</td>
         <td className="p-4 text-gray-500">{lead.city}</td>
         <td className="p-4">
          <span className={`px-2 py-1 ${lead.status === 'written' ? 'text-matrix bg-matrix/10 border border-matrix/20' : 'text-gray-500 bg-black border border-zinc-800'}`}>
           {lead.status?.toUpperCase() || 'PENDING_EVAL'}
          </span>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>

    <div className="bg-black border border-zinc-800 h-48 flex flex-col shadow-lg relative bento-hover">
     <div className="p-2 border-b border-divider bg-gunmetal font-mono text-[10px] uppercase text-gray-500 tracking-widest pl-4">STDOUT // Execution Log</div>
     <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-white space-y-1.5 scrollbar-thin scrollbar-thumb-divider scrollbar-track-transparent">
      {!log ? (
       <span className="text-gray-600 italic">No output yet.</span>
      ) : log.split('\n').map((l, i) => (
       <div key={i} className={l.includes('ERROR') ? 'text-red-500' : l.includes('complete') || l.includes('Success') ? 'text-matrix/90' : 'text-gray-400 font-sans tracking-wide leading-relaxed'}>
        {l}
       </div>
      ))}
      <div ref={logEndRef} className="h-4" />
     </div>
    </div>
   </div>
  </div>
 );
}
