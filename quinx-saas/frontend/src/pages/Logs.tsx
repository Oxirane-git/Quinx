import { useState, useEffect } from 'react';
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

 useEffect(() => {
  api.get('/api/campaigns')
   .then(data => { setCampaigns(data); setLoading(false); })
   .catch(() => setLoading(false));
 }, []);

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
  <div className="h-full flex flex-col animate-in fade-in duration-500">
   <header className="border-b border-border pb-4 mb-6 flex justify-between items-end">
    <div>
     <h1 className="text-2xl font-bold text-primary ">DATASTORE_LOGS</h1>
     <p className="text-textMuted text-sm mt-1">Global audit of all historical routines.</p>
    </div>
    <button
     onClick={exportCsv}
     disabled={campaigns.length === 0}
     className="bg-surface border border-border hover:border-primary text-textMain hover:text-primary px-4 py-2 text-sm flex gap-2 items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
     EXPORT_CSV
    </button>
   </header>

   <div className="bg-surface border border-border flex-1 overflow-auto">
    <table className="w-full text-left text-sm whitespace-nowrap text-textMain">
     <thead className="uppercase text-xs text-textMuted border-b border-border bg-surface shadow-sm">
      <tr>
       <th className="p-4">CID</th>
       <th className="p-4">Routine Name</th>
       <th className="p-4">Niche</th>
       <th className="p-4">Lifecycle</th>
       <th className="p-4">Created</th>
       <th className="p-4">Leads</th>
       <th className="p-4">Emails</th>
      </tr>
     </thead>
     <tbody>
      {loading ? (
       <tr><td colSpan={7} className="p-4 text-textMuted italic">Loading campaigns...</td></tr>
      ) : campaigns.length === 0 ? (
       <tr><td colSpan={7} className="p-4 text-textMuted italic">No campaigns yet. Run the scraper to create one.</td></tr>
      ) : campaigns.map(c => (
       <tr key={c.id} className="border-b border-border hover:bg-surface shadow-sm transition-colors">
        <td className="p-4 text-textMuted font-bold">#{c.id}</td>
        <td className="p-4 text-primary">{c.name}</td>
        <td className="p-4 text-textMain text-sm">{c.niche}</td>
        <td className="p-4">
         <span className={`px-2 py-1 text-xs border ${c.status === 'completed' ? 'border-primary text-primary bg-primary/5 text-primary bg-primary/10' : 'border-blue-500 text-blue-500 bg-blue-500/10'}`}>
          {c.status?.toUpperCase() || 'ACTIVE'}
         </span>
        </td>
        <td className="p-4 text-textMuted">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
        <td className="p-4">
         {c.has_leads ? (
          <button
           onClick={() => api.download(`/api/campaigns/${c.id}/download/leads`, `${c.name}_leads.xlsx`)}
           className="text-primary hover:underline text-xs border border-primary text-primary bg-primary/5/30 px-2 py-1 hover:bg-primary/10 transition-colors"
          >
           .xlsx ↓
          </button>
         ) : <span className="text-zinc-700 text-xs">—</span>}
        </td>
        <td className="p-4">
         {c.has_emails ? (
          <button
           onClick={() => api.download(`/api/campaigns/${c.id}/download/emails`, `${c.name}_emails.xlsx`)}
           className="text-primary hover:underline text-xs border border-primary text-primary bg-primary/5/30 px-2 py-1 hover:bg-primary/10 transition-colors"
          >
           .xlsx ↓
          </button>
         ) : <span className="text-zinc-700 text-xs">—</span>}
        </td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>
  </div>
 );
}
