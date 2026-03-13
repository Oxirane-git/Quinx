import { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, Database, ChevronDown } from 'lucide-react';
import StatusCard from '../components/StatusCard';

const Logs = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState('all');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const campRes = await fetch('http://localhost:8000/api/logs/campaigns');
            if (campRes.ok) setCampaigns(await campRes.json());

            const leadRes = await fetch('http://localhost:8000/api/logs/leads');
            if (leadRes.ok) setLeads(await leadRes.json());
        } catch (e) {
            console.error("Error fetching logs", e);
        }
        setLoading(false);
    };

    useEffect(() => { fetchLogs(); }, []);

    const filteredLeads = selectedCampaign === 'all'
        ? leads
        : leads.filter(l => l.campaign_name === selectedCampaign);

    const statusColors = {
        Scraped:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
        Written:  'text-quinx-green bg-quinx-green/10 border-quinx-green/20',
        Sent:     'text-purple-400 bg-purple-400/10 border-purple-400/20',
        Failed:   'text-red-400 bg-red-400/10 border-red-400/20',
    };

    return (
        <div className="h-full flex flex-col space-y-5">

            {/* Page Header */}
            <header className="pb-4 border-b border-quinx-border flex justify-between items-end">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <span className="w-1 h-5 bg-quinx-green rounded-full" />
                        <h1 className="text-xl font-bold text-white tracking-wide">Campaign Logs</h1>
                    </div>
                    <p className="text-quinx-muted text-sm pl-3">
                        Persistent history from{' '}
                        <span className="text-quinx-green font-medium">quinx_campaigns.db</span>{' '}
                        across all pipeline stages.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2 bg-quinx-surface border border-quinx-border rounded-md hover:border-quinx-green/50 text-quinx-muted hover:text-quinx-green transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-quinx-green text-black text-sm font-bold rounded-md hover:bg-[#00e67a] hover:shadow-[0_0_20px_rgba(0,255,136,0.25)] transition-all active:scale-[0.98]">
                        <DownloadCloud className="w-4 h-4" />
                        <span>EXPORT XLSX</span>
                    </button>
                </div>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-5 gap-4 shrink-0" style={{ height: '88px' }}>
                <StatusCard title="Total Campaigns" value={campaigns.length || '—'} />
                <StatusCard title="Total Leads" value={leads.length || '—'} />
                <StatusCard title="Emails Written" value="—" highlight={true} />
                <StatusCard title="Emails Sent" value="—" />
                <StatusCard title="Response Rate" value="0%" subtitle="manual input pending" />
            </div>

            {/* Table Panel */}
            <div className="flex-1 bg-quinx-surface border border-quinx-border rounded-md flex flex-col min-h-0 overflow-hidden">

                {/* Table toolbar */}
                <div className="px-5 py-3 border-b border-quinx-border flex items-center justify-between bg-[#131313] flex-shrink-0">
                    <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-quinx-muted/60" />
                        <h3 className="text-sm font-semibold text-white">Lead Pipeline</h3>
                        {!loading && (
                            <span className="text-[10px] text-quinx-muted/50 bg-quinx-border/40 px-2 py-0.5 rounded-full">
                                {filteredLeads.length} records
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <select
                            className="appearance-none bg-black border border-quinx-border rounded-md pl-3 pr-8 py-1.5 text-xs text-quinx-muted focus:outline-none focus:border-quinx-green/50 transition-colors cursor-pointer"
                            value={selectedCampaign}
                            onChange={(e) => setSelectedCampaign(e.target.value)}
                        >
                            <option value="all">All Campaigns</option>
                            {campaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-quinx-muted/50 pointer-events-none" />
                    </div>
                </div>

                {/* Table content */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full space-x-2 text-quinx-muted">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading database records...</span>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-3 text-quinx-muted">
                            <div className="w-12 h-12 rounded-full bg-quinx-border/30 flex items-center justify-center">
                                <Database className="w-5 h-5 opacity-40" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-quinx-muted/70">No lead data found</p>
                                <p className="text-xs text-quinx-muted/40 mt-1">Run the scraper to populate the database</p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-[#0f0f0f] border-b border-quinx-border text-[10px] uppercase tracking-widest text-quinx-muted/60">
                                    <th className="px-5 py-3 font-semibold">Business</th>
                                    <th className="px-5 py-3 font-semibold">City</th>
                                    <th className="px-5 py-3 font-semibold">Email</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead, i) => (
                                    <tr
                                        key={lead.id}
                                        className={`border-b border-quinx-border/50 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                                    >
                                        <td className="px-5 py-3 text-white font-medium">{lead.business_name}</td>
                                        <td className="px-5 py-3 text-quinx-muted">{lead.city}</td>
                                        <td className="px-5 py-3 font-mono text-quinx-green text-xs">{lead.email}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusColors[lead.status] ?? 'text-quinx-muted bg-quinx-border/30 border-quinx-border'}`}>
                                                {lead.status ?? 'Scraped'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Logs;
