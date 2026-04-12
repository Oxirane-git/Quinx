import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Save, ChevronRight, Terminal } from 'lucide-react';
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
        } catch (e: unknown) {
            setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Save failed.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!window.confirm(`Delete campaign "${filename}"?`)) return;
        try {
            await api.delete(`/api/campaigns/config/${filename}`);
            if (selected === filename) { setSelected(null); setForm(EMPTY); setIsNew(false); }
            await fetchCampaigns();
        } catch {
            setMsg({ type: 'error', text: 'Delete failed.' });
        }
    };

    const field = (label, key, type = 'input', placeholder = '') => (
        <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                {label}
            </label>
            {type === 'textarea' ? (
                <textarea
                    rows={5}
                    placeholder={placeholder}
                    className="bg-black border border-zinc-800 rounded-none px-4 py-3 text-sm text-white focus:outline-none focus:border-matrix focus:ring-1 focus:ring-matrix transition-colors resize-none font-mono"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
            ) : (
                <input
                    type="text"
                    placeholder={placeholder}
                    className="bg-black border border-zinc-800 rounded-none px-4 py-3 text-sm text-white focus:outline-none focus:border-matrix focus:ring-1 focus:ring-matrix transition-colors font-mono"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">

            <header className="pb-4 border-b border-divider">
                <div className="flex items-center space-x-3 mb-2">
                    <Zap className="text-matrix w-6 h-6" />
                    <h1 className="text-2xl font-bold font-mono tracking-tight uppercase text-white">CAMPAIGN_CONFIG</h1>
                </div>
                <p className="text-gray-400 text-sm font-sans pl-9">
                    Define the service framework. Each campaign object is injected into the Gemini evaluation prompt.
                </p>
            </header>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                {/* Left: campaign list */}
                <div className="col-span-4 bg-gunmetal border border-divider rounded-none flex flex-col overflow-hidden bento-hover">
                    <div className="h-1 bg-matrix w-full flex-shrink-0" />
                    <div className="px-5 py-4 border-b border-divider flex items-center justify-between flex-shrink-0 bg-obsidian">
                        <span className="text-xs font-bold font-mono text-gray-400 tracking-wider">SAVED_DIRECTORIES</span>
                        <button
                            onClick={startNew}
                            className="flex items-center space-x-1 text-matrix hover:text-matrix-hover transition-colors text-xs font-bold font-mono uppercase"
                        >
                            <Plus className="w-4 h-4" />
                            <span>MKNODE</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                        {campaigns.length === 0 && (
                            <p className="text-gray-500 text-xs font-mono px-5 py-4">No directories found in registry.</p>
                        )}
                        {campaigns.map((c) => (
                            <div
                                key={c.filename}
                                onClick={() => selectCampaign(c)}
                                className={`group flex items-center justify-between px-5 py-3 cursor-pointer transition-colors ${
                                    selected === c.filename
                                        ? 'bg-matrix/10 border-l-2 border-matrix shadow-[inset_4px_0_0_0_rgba(0,255,65,0.2)]'
                                        : 'text-gray-400 hover:bg-obsidian hover:text-white border-l-2 border-transparent'
                                }`}
                            >
                                <div className="flex items-center space-x-3 min-w-0">
                                    <Terminal className={`w-4 h-4 flex-shrink-0 ${selected === c.filename ? 'text-matrix' : 'text-gray-600'}`} />
                                    <div className="min-w-0 font-mono">
                                        <p className={`text-sm tracking-tight truncate ${selected === c.filename ? 'text-matrix font-bold' : 'text-white'}`}>
                                            {c.campaignName || c.filename}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{c.filename}.json</p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(c.filename); }}
                                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all flex-shrink-0 ml-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: form */}
                <div className="col-span-8 bg-gunmetal border border-divider rounded-none flex flex-col overflow-hidden bento-hover">
                    <div className="px-6 py-5 border-b border-divider flex items-center justify-between flex-shrink-0 bg-obsidian">
                        <h2 className="text-sm font-bold font-mono text-white uppercase flex items-center gap-2">
                            <span className="w-2 h-2 bg-matrix"></span>
                            {isNew ? 'NEW_CAMPAIGN_NODE' : selected ? `MOUNTED: ${selected}` : 'AWAITING_SELECTION'}
                        </h2>
                        {msg && (
                            <span className={`text-xs font-mono font-bold px-3 py-1 bg-obsidian border ${msg.type === 'success' ? 'text-matrix border-matrix/30' : 'text-red-500 border-red-500/30'}`}>
                                {msg.text.toUpperCase()}
                            </span>
                        )}
                    </div>

                    {(isNew || selected) ? (
                        <>
                            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 bg-gunmetal">

                                <div className="grid grid-cols-2 gap-6">
                                    {field('Campaign Alias', 'campaignName', 'input', 'e.g. Quinx AI — Enterprise')}
                                    {field('Sender Identity', 'senderName', 'input', 'e.g. Sahil')}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    {field('Platform Vector', 'serviceName', 'input', 'e.g. Quinx AI')}
                                    {field('Domain Vector', 'serviceWebsite', 'input', 'e.g. quinxai.com')}
                                </div>

                                {field(
                                    'Value Proposition',
                                    'serviceTagline',
                                    'input',
                                    'One sentence core feature constraint'
                                )}

                                {field(
                                    'Context Array',
                                    'serviceContext',
                                    'textarea',
                                    'Bullet points describing mechanics\nExecution parameters\nKey metrics'
                                )}

                                {field('Pricing Schema', 'pricing', 'input', 'e.g. ₹3,999/month or $99/month')}

                                <div className="bg-black border border-zinc-800 rounded-none p-5 text-xs text-gray-400 space-y-2 font-mono mt-8">
                                    <p className="text-matrix font-bold mb-3 uppercase flex items-center gap-2">
                                        <ChevronRight className="w-4 h-4" /> Injection Map:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <p><span className="text-gray-600 bg-gunmetal px-1">{'{{serviceName}}'}</span> → Target Platform</p>
                                        <p><span className="text-gray-600 bg-gunmetal px-1">{'{{serviceTagline}}'}</span> → Core Proposition</p>
                                        <p><span className="text-gray-600 bg-gunmetal px-1">{'{{serviceContext}}'}</span> → Multi-line Block</p>
                                        <p><span className="text-gray-600 bg-gunmetal px-1">{'{{senderName}}'}</span> → Terminal Signature</p>
                                        <p><span className="text-gray-600 bg-gunmetal px-1">{'{{serviceWebsite}}'}</span> → Terminal Domain</p>
                                    </div>
                                </div>

                            </div>

                            <div className="px-8 py-5 border-t border-divider flex-shrink-0 bg-obsidian">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`w-full py-4 rounded-none text-sm font-mono font-bold flex justify-center items-center space-x-2 transition-all group
                                        ${saving
                                            ? 'bg-gunmetal text-gray-600 cursor-not-allowed border border-divider'
                                            : 'bg-matrix text-obsidian hover:bg-matrix-hover shadow-[0_0_15px_rgba(0,255,65,0.1)] hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]'
                                        }`}
                                >
                                    <Save className={`w-4 h-4 ${!saving && 'group-hover:scale-110 transition-transform'}`} />
                                    <span>{saving ? 'COMMIT_IN_PROGRESS...' : 'COMMIT_CHANGES()'}</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm font-mono bg-gunmetal">
                            <div className="text-center space-y-4">
                                <Terminal className="w-12 h-12 mx-auto stroke-1" />
                                <p className="uppercase tracking-widest text-xs">NO_ROOT_NODE_ATTACHED</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Campaign;
