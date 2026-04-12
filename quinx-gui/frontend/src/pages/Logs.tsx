import { useState, useEffect } from 'react';
import { Trash2, Database, Download } from 'lucide-react';
import { api } from '../lib/api';

interface Campaign {
 id: number;
 name: string;
 niche: string;
 status: string;
 created_at: string;
 has_leads: boolean;
 has_emails: boolean;
}

export default function Logs() {
 const [campaigns, setCampaigns] = useState<Campaign[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchCampaigns = () => {
  api.get('/api/campaigns/')
   .then(data => { setCampaigns(data); setLoading(false); })
   .catch(() => setLoading(false));
 };

 useEffect(() => { fetchCampaigns(); }, []);

 const deleteCampaign = async (id: number, name: string) => {
  if (!window.confirm(`Delete campaign "${name}" and all its data?`)) return;
  await api.delete(`/api/campaigns/${id}`);
  setCampaigns(prev => prev.filter(c => c.id !== id));
 };

 const deleteAll = async () => {
  if (!window.confirm(`Delete ALL ${campaigns.length} campaigns and their data? This cannot be undone.`)) return;
  await api.delete('/api/campaigns/all');
  setCampaigns([]);
 };

 const exportCsv = () => {
  const header = ['ID', 'Name', 'Niche', 'Status', 'Created At'];
  const rows = campaigns.map(c => [c.id, c.name, c.niche, c.status, c.created_at]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `quinx_campaigns_${Date.now()}.csv`;
  a.click();
 };

 return (
  <div className="h-full flex flex-col animate-in fade-in duration-500 font-sans text-white pb-6">
   <header className="border-b border-divider pb-4 mb-6 flex justify-between items-end">
    <div>
     <div className="flex items-center space-x-3 mb-2">
      <Database className="w-6 h-6 text-matrix" />
      <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">Logs</h1>
     </div>
     <p className="text-gray-400 text-sm pl-9">All your campaigns and their downloadable files.</p>
    </div>
    <div className="flex gap-4 font-mono font-bold tracking-wider">
     <button
      onClick={exportCsv}
      disabled={campaigns.length === 0}
      className="bg-gunmetal border border-divider hover:border-matrix hover:bg-matrix/5 text-white hover:text-matrix px-5 py-2.5 text-xs flex gap-2 items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,0,0,0.5)]"
     >
      <Download className="w-4 h-4" />
      Export CSV
     </button>
     <button
      onClick={deleteAll}
      disabled={campaigns.length === 0}
      className="bg-gunmetal border border-red-500/30 hover:border-red-500 hover:bg-red-900/20 text-red-500 px-5 py-2.5 text-xs flex gap-2 items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,0,0,0.5)]"
     >
      <Trash2 className="w-4 h-4" />
      Delete All
     </button>
    </div>
   </header>

   <div className="bg-gunmetal border border-divider flex-1 overflow-auto bento-hover shadow-2xl relative">
    <table className="w-full text-left text-sm whitespace-nowrap text-white font-mono">
     <thead className="uppercase text-[10px] text-gray-500 border-b border-divider bg-obsidian sticky top-0 z-10 shadow-sm">
      <tr>
       <th className="p-4 font-bold tracking-wider">#</th>
       <th className="p-4 font-bold tracking-wider">Campaign</th>
       <th className="p-4 font-bold tracking-wider">Niche</th>
       <th className="p-4 font-bold tracking-wider">Status</th>
       <th className="p-4 font-bold tracking-wider">Created</th>
       <th className="p-4 font-bold tracking-wider">Leads</th>
       <th className="p-4 font-bold tracking-wider">Emails</th>
       <th className="p-4 font-bold tracking-wider"></th>
      </tr>
     </thead>
     <tbody className="divide-y divide-divider/50 text-xs border-t-2 border-matrix/50">
      {loading ? (
       <tr><td colSpan={8} className="p-8 text-gray-500 italic text-center">Loading...</td></tr>
      ) : campaigns.length === 0 ? (
       <tr><td colSpan={8} className="p-8 text-gray-500 italic text-center">No campaigns yet.</td></tr>
      ) : campaigns.map(c => (
       <tr key={c.id} className="hover:bg-obsidian transition-colors group">
        <td className="p-4 text-gray-500 font-bold tracking-wider">#{String(c.id).padStart(4, '0')}</td>
        <td className="p-4 text-white font-bold">{c.name}</td>
        <td className="p-4 text-gray-400">{c.niche}</td>
        <td className="p-4">
         <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border ${c.status === 'completed' ? 'border-matrix/30 text-matrix bg-matrix/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
          {c.status?.toUpperCase() || 'ACTIVE'}
         </span>
        </td>
        <td className="p-4 text-gray-500">{c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '—'}</td>
        <td className="p-4">
         {c.has_leads ? (
          <button
           onClick={() => api.download(`/api/campaigns/${c.id}/download/leads`, `${c.name}_leads.xlsx`)}
           className="text-gray-400 text-[10px] uppercase font-bold tracking-wider border border-divider bg-obsidian px-2 py-1 hover:border-matrix hover:text-matrix transition-colors flex items-center gap-1 w-max"
          >
           <span>Download</span> <Download className="w-3 h-3" />
          </button>
         ) : <span className="text-gray-700 text-xs">—</span>}
        </td>
        <td className="p-4">
         {c.has_emails ? (
          <button
           onClick={() => api.download(`/api/campaigns/${c.id}/download/emails`, `${c.name}_emails.xlsx`)}
           className="text-gray-400 text-[10px] uppercase font-bold tracking-wider border border-divider bg-obsidian px-2 py-1 hover:border-matrix hover:text-matrix transition-colors flex items-center gap-1 w-max"
          >
           <span>Download</span> <Download className="w-3 h-3" />
          </button>
         ) : <span className="text-gray-700 text-xs">—</span>}
        </td>
        <td className="p-4 text-right">
         <button
          onClick={() => deleteCampaign(c.id, c.name)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all p-2 bg-black border border-zinc-800 hover:border-red-500/50 rounded-sm"
          title="Delete campaign"
         >
          <Trash2 className="w-3.5 h-3.5" />
         </button>
        </td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>
  </div>
 );
}
