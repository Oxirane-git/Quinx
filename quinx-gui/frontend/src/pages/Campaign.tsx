import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Save, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';

const EMPTY = {
    campaignName: '',
    serviceName: '',
    serviceTagline: '',
    serviceContext: '',
    pricing: '',
    serviceWebsite: '',
    senderName: '',
};

const toSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const Campaign = () => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [selected, setSelected] = useState<string | null>(null); // filename slug
    const [form, setForm] = useState(EMPTY);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

    const fetchCampaigns = async () => {
        try {
            const res = await api.get('/api/campaigns/list');
            setCampaigns(Array.isArray(res.data) ? res.data : []);
        } catch {
            setMsg({ type: 'error', text: 'Could not reach backend.' });
        }
    };

    useEffect(() => { fetchCampaigns(); }, []);

    const selectCampaign = (c: any) => {
        setSelected(c.filename);
        setIsNew(false);
        setForm({
            campaignName: c.campaignName || '',
            serviceName: c.serviceName || '',
            serviceTagline: c.serviceTagline || '',
            serviceContext: c.serviceContext || '',
            pricing: c.pricing || '',
            serviceWebsite: c.serviceWebsite || '',
            senderName: c.senderName || '',
        });
        setMsg(null);
    };

    const startNew = () => {
        setSelected(null);
        setIsNew(true);
        setForm(EMPTY);
        setMsg(null);
    };

    const handleSave = async () => {
        if (!form.campaignName.trim() || !form.serviceName.trim()) {
            setMsg({ type: 'error', text: 'Campaign name and service name are required.' });
            return;
        }
        const filename = isNew ? toSlug(form.campaignName) : selected;
        setSaving(true);
        setMsg(null);
        try {
            await api.post('/api/campaigns/save', { filename, ...form });
            setMsg({ type: 'success', text: `Saved as "${filename}"` });
            setSelected(filename);
            setIsNew(false);
            await fetchCampaigns();
        } catch (e: any) {
            setMsg({ type: 'error', text: e.response?.data?.detail || e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!window.confirm(`Delete campaign "${filename}"?`)) return;
        try {
            await api.delete(`/api/campaigns/${filename}`);
            if (selected === filename) { setSelected(null); setForm(EMPTY); setIsNew(false); }
            await fetchCampaigns();
        } catch {
            setMsg({ type: 'error', text: 'Delete failed.' });
        }
    };

    const field = (label, key, type = 'input', placeholder = '') => (
        <div className="flex flex-col space-y-1.5">
            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                {label}
            </label>
            {type === 'textarea' ? (
                <textarea
                    rows={5}
                    placeholder={placeholder}
                    className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors resize-none font-mono"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
            ) : (
                <input
                    type="text"
                    placeholder={placeholder}
                    className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col space-y-5">

            <header className="pb-4 border-b border-quinx-border">
                <div className="flex items-center space-x-2 mb-1">
                    <span className="w-1 h-5 bg-quinx-green rounded-full" />
                    <h1 className="text-xl font-bold text-white tracking-wide">Campaign Config</h1>
                </div>
                <p className="text-quinx-muted text-sm pl-3">
                    Define the service you're pitching. Each campaign is a reusable template injected into the AI prompt.
                </p>
            </header>

            <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">

                {/* Left: campaign list */}
                <div className="col-span-3 bg-quinx-surface border border-quinx-border rounded-md flex flex-col overflow-hidden">
                    <div className="h-px bg-gradient-to-r from-transparent via-quinx-green/40 to-transparent flex-shrink-0" />
                    <div className="px-4 py-3 border-b border-quinx-border flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-white tracking-wide">Saved Campaigns</span>
                        <button
                            onClick={startNew}
                            className="flex items-center space-x-1 text-quinx-green hover:text-white transition-colors text-xs font-medium"
                        >
                            <Plus className="w-3 h-3" />
                            <span>New</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto py-1">
                        {campaigns.length === 0 && (
                            <p className="text-quinx-muted/50 text-xs px-4 py-3">No campaigns yet.</p>
                        )}
                        {campaigns.map((c) => (
                            <div
                                key={c.filename}
                                onClick={() => selectCampaign(c)}
                                className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                                    selected === c.filename
                                        ? 'bg-quinx-green/10 text-quinx-green'
                                        : 'text-quinx-muted hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center space-x-2 min-w-0">
                                    {selected === c.filename && (
                                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate">{c.campaignName || c.filename}</p>
                                        <p className="text-[10px] text-quinx-muted/60 truncate">{c.filename}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(c.filename); }}
                                    className="opacity-0 group-hover:opacity-100 text-quinx-muted/40 hover:text-red-400 transition-all flex-shrink-0 ml-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: form */}
                <div className="col-span-9 bg-quinx-surface border border-quinx-border rounded-md flex flex-col overflow-hidden">
                    <div className="h-px bg-gradient-to-r from-transparent via-quinx-green/40 to-transparent flex-shrink-0" />
                    <div className="px-5 py-4 border-b border-quinx-border flex items-center justify-between flex-shrink-0">
                        <h2 className="text-sm font-semibold text-white tracking-wide">
                            {isNew ? 'New Campaign' : selected ? `Editing: ${selected}` : 'Select or create a campaign'}
                        </h2>
                        {msg && (
                            <span className={`text-xs font-medium ${msg.type === 'success' ? 'text-quinx-green' : 'text-red-400'}`}>
                                {msg.text}
                            </span>
                        )}
                    </div>

                    {(isNew || selected) ? (
                        <>
                            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                                <div className="grid grid-cols-2 gap-4">
                                    {field('Campaign Name', 'campaignName', 'input', 'e.g. Quinx AI — Restaurant Retention')}
                                    {field('Sender Name', 'senderName', 'input', 'e.g. Sahil')}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {field('Service Name', 'serviceName', 'input', 'e.g. Quinx AI')}
                                    {field('Service Website', 'serviceWebsite', 'input', 'e.g. quinxai.com')}
                                </div>

                                {field(
                                    'Service Tagline',
                                    'serviceTagline',
                                    'input',
                                    'One sentence — what the service does and who it helps'
                                )}

                                {field(
                                    'Service Context',
                                    'serviceContext',
                                    'textarea',
                                    '- Bullet points describing what the service does\n- How it works\n- Key benefits\n- Pricing'
                                )}

                                {field('Pricing', 'pricing', 'input', 'e.g. ₹3,999/month or $99/month')}

                                <div className="bg-black/40 border border-quinx-border/50 rounded-md p-4 text-xs text-quinx-muted/70 space-y-1">
                                    <p className="text-quinx-green/80 font-semibold mb-2">How this is used in the prompt:</p>
                                    <p><span className="text-white/60">{'{{serviceName}}'}</span> → Service Name</p>
                                    <p><span className="text-white/60">{'{{serviceTagline}}'}</span> → Service Tagline</p>
                                    <p><span className="text-white/60">{'{{serviceContext}}'}</span> → Service Context block</p>
                                    <p><span className="text-white/60">{'{{senderName}}'}</span> → used in email sign-off</p>
                                    <p><span className="text-white/60">{'{{serviceWebsite}}'}</span> → used in email sign-off</p>
                                </div>

                            </div>

                            <div className="px-5 py-4 border-t border-quinx-border flex-shrink-0">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`w-full py-2.5 rounded-md text-sm font-bold flex justify-center items-center space-x-2 transition-all duration-200
                                        ${saving
                                            ? 'bg-quinx-border text-quinx-muted cursor-not-allowed'
                                            : 'bg-quinx-green text-black hover:bg-[#00e67a] hover:shadow-[0_0_20px_rgba(0,255,136,0.25)] active:scale-[0.98]'
                                        }`}
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{saving ? 'SAVING...' : 'SAVE CAMPAIGN'}</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-quinx-muted/40 text-sm">
                            <div className="text-center space-y-2">
                                <Zap className="w-8 h-8 mx-auto opacity-30" />
                                <p>Select a campaign to edit or create a new one</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Campaign;
