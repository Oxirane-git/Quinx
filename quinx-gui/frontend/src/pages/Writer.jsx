import { useState, useEffect, useRef } from 'react';
import { PenTool, ChevronDown, RefreshCw } from 'lucide-react';
import TerminalLog from '../components/TerminalLog';
import StatusCard from '../components/StatusCard';

const Writer = () => {
    const [running, setRunning] = useState(false);
    const [leadFiles, setLeadFiles] = useState([]);
    const pollRef = useRef(null);

    // Poll status endpoint while running so the button re-enables after completion
    useEffect(() => {
        if (running) {
            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch('http://localhost:8000/api/writer/status');
                    const data = await res.json();
                    if (!data.running) {
                        setRunning(false);
                        clearInterval(pollRef.current);
                    }
                } catch {}
            }, 3000);
        }
        return () => clearInterval(pollRef.current);
    }, [running]);
    const [config, setConfig] = useState({
        inputFile: '',       // full path from API
        rangeFrom: 1,
        rangeTo: 9999,
        temperature: 0.7,
        maxTokens: '2048',
        checkpointEvery: 10,
        skipLowPers: true,
        campaignContext: '',
        signOff: ''
    });

    const fetchLeadFiles = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/leads/list');
            const data = await res.json();
            setLeadFiles(data);
            if (data.length > 0 && !config.inputFile) {
                setConfig(c => ({ ...c, inputFile: data[0].path }));
            }
        } catch (e) {
            console.error('Failed to fetch lead files:', e);
        }
    };

    useEffect(() => { fetchLeadFiles(); }, []);

    const handleRun = async () => {
        if (!config.inputFile) { alert('No lead file selected.'); return; }
        setRunning(true);
        try {
            const res = await fetch('http://localhost:8000/api/writer/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_file: config.inputFile,
                    range_from: parseInt(config.rangeFrom, 10),
                    range_to: parseInt(config.rangeTo, 10),
                    temperature: parseFloat(config.temperature),
                    max_tokens: parseInt(config.maxTokens, 10),
                    checkpoint_every: parseInt(config.checkpointEvery, 10),
                    skip_low_personalization: config.skipLowPers,
                    campaign_context: config.campaignContext,
                    sign_off: config.signOff
                })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`Failed to start: ${err.detail}`);
                setRunning(false);
            }
        } catch (e) {
            console.error(e);
            alert("Error starting writer.");
            setRunning(false);
        }
    };

    const selectedDisplay = leadFiles.find(f => f.path === config.inputFile)?.display || 'Select a place...';

    return (
        <div className="h-full flex flex-col space-y-5">

            {/* Page Header */}
            <header className="pb-4 border-b border-quinx-border">
                <div className="flex items-center space-x-2 mb-1">
                    <span className="w-1 h-5 bg-quinx-green rounded-full" />
                    <h1 className="text-xl font-bold text-white tracking-wide">Email Writer</h1>
                </div>
                <p className="text-quinx-muted text-sm pl-3">
                    Batch generate personalized cold emails using Gemini 2.5 Flash via{' '}
                    <span className="text-quinx-green font-medium">Email_Writer</span>.
                </p>
            </header>

            <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">

                {/* Left Column: Config Form */}
                <div className="col-span-4 bg-quinx-surface border border-quinx-border rounded-md flex flex-col h-full overflow-hidden">
                    {/* Top accent */}
                    <div className="h-px bg-gradient-to-r from-transparent via-quinx-green/40 to-transparent flex-shrink-0" />

                    {/* Panel header */}
                    <div className="px-5 py-4 border-b border-quinx-border flex-shrink-0">
                        <h2 className="text-sm font-semibold text-white tracking-wide">Writer Configuration</h2>
                    </div>

                    {/* Scrollable form */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                        {/* Campaign Context */}
                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                                Campaign Context
                            </label>
                            <textarea
                                rows={4}
                                className="w-full bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors resize-none placeholder:text-quinx-muted/40"
                                placeholder={"Describe your product or service...\ne.g. We offer a QR-code digital menu system for restaurants. Customers scan to view the menu and join a loyalty program. No app needed. Starts at $49/month. Website: qrmenu.com"}
                                value={config.campaignContext}
                                onChange={(e) => setConfig({ ...config, campaignContext: e.target.value })}
                                disabled={running}
                            />
                            <p className="text-[10px] text-quinx-muted/50 leading-relaxed">
                                Leave blank to use the default Quinx AI campaign.
                            </p>
                        </div>

                        {/* Sign-off */}
                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                                Email Sign-off
                            </label>
                            <input
                                type="text"
                                className="w-full bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                placeholder="Sahil | Quinx AI  /  quinxai.com"
                                value={config.signOff}
                                onChange={(e) => setConfig({ ...config, signOff: e.target.value })}
                                disabled={running}
                            />
                        </div>

                        <div className="flex flex-col space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                                    Lead Source
                                </label>
                                <button
                                    onClick={fetchLeadFiles}
                                    disabled={running}
                                    className="text-quinx-muted/50 hover:text-quinx-green transition-colors"
                                    title="Refresh list"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full bg-black border border-quinx-border rounded-md py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors appearance-none"
                                    value={config.inputFile}
                                    onChange={(e) => setConfig({ ...config, inputFile: e.target.value })}
                                    disabled={running}
                                >
                                    {leadFiles.length === 0
                                        ? <option value="">No leads found — run scraper first</option>
                                        : leadFiles.map(f => (
                                            <option key={f.path} value={f.path}>{f.display}</option>
                                        ))
                                    }
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-quinx-muted/60 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col space-y-1.5">
                                <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">From Row</label>
                                <input
                                    type="number" min="1"
                                    className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                    value={config.rangeFrom}
                                    onChange={(e) => setConfig({ ...config, rangeFrom: e.target.value })}
                                    disabled={running}
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">To Row</label>
                                <input
                                    type="number" min="1"
                                    className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                    value={config.rangeTo}
                                    onChange={(e) => setConfig({ ...config, rangeTo: e.target.value })}
                                    disabled={running}
                                />
                            </div>
                        </div>

                        <div className="pt-1 border-t border-quinx-border/60 flex flex-col space-y-2">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest flex justify-between items-center">
                                <span>Temperature</span>
                                <span className="text-quinx-green font-bold normal-case text-xs">{config.temperature}</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.1"
                                className="w-full accent-quinx-green h-1 rounded cursor-pointer"
                                value={config.temperature}
                                onChange={(e) => setConfig({ ...config, temperature: e.target.value })}
                                disabled={running}
                            />
                            <div className="flex justify-between text-[10px] text-quinx-muted/40">
                                <span>conservative</span>
                                <span>creative</span>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">Max Tokens</label>
                            <div className="flex space-x-2">
                                {['1024', '2048', '4096'].map(v => (
                                    <label
                                        key={v}
                                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all ${
                                            config.maxTokens === v
                                                ? 'border-quinx-green/50 bg-quinx-green/10 text-quinx-green'
                                                : 'border-quinx-border text-quinx-muted hover:border-quinx-muted/50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            value={v}
                                            checked={config.maxTokens === v}
                                            onChange={(e) => setConfig({ ...config, maxTokens: e.target.value })}
                                            className="sr-only"
                                            disabled={running}
                                        />
                                        {v}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 pt-1">
                            <div
                                className={`w-8 h-4 rounded-full transition-colors cursor-pointer flex-shrink-0 ${config.skipLowPers ? 'bg-quinx-green/80' : 'bg-quinx-border'}`}
                                onClick={() => !running && setConfig({ ...config, skipLowPers: !config.skipLowPers })}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${config.skipLowPers ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <label
                                className="text-sm text-quinx-text cursor-pointer select-none"
                                onClick={() => !running && setConfig({ ...config, skipLowPers: !config.skipLowPers })}
                            >
                                Skip poor personalization leads
                            </label>
                        </div>

                    </div>

                    {/* Sticky footer with run button */}
                    <div className="px-5 py-4 border-t border-quinx-border flex-shrink-0">
                        <button
                            onClick={handleRun}
                            disabled={running}
                            className={`w-full py-2.5 rounded-md text-sm font-bold flex justify-center items-center space-x-2 transition-all duration-200
                                ${running
                                    ? 'bg-quinx-border text-quinx-muted cursor-not-allowed'
                                    : 'bg-quinx-green text-black hover:bg-[#00e67a] hover:shadow-[0_0_20px_rgba(0,255,136,0.25)] active:scale-[0.98]'
                                }`}
                        >
                            {running ? (
                                <span>GENERATING...</span>
                            ) : (
                                <>
                                    <PenTool className="w-4 h-4" />
                                    <span>START WRITER BATCH</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Column: Status & Terminal */}
                <div className="col-span-8 flex flex-col space-y-5 min-h-0">

                    <div className="grid grid-cols-4 gap-4 shrink-0" style={{ height: '88px' }}>
                        <StatusCard title="Target Range" value={`${config.rangeFrom}–${config.rangeTo}`} />
                        <StatusCard title="Written" value="—" highlight={true} />
                        <StatusCard title="Skipped" value="—" />
                        <StatusCard title="API Key" value="KEY_1" />
                    </div>

                    <div className="flex-1 min-h-0">
                        <TerminalLog module="writer" />
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Writer;
