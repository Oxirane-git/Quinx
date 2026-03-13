import { useState, useEffect, useRef } from 'react';
import { Play, MapPin, Hash, FolderOpen } from 'lucide-react';
import TerminalLog from '../components/TerminalLog';
import StatusCard from '../components/StatusCard';

const Scraper = () => {
    const [running, setRunning] = useState(false);
    const pollRef = useRef(null);

    // Poll status endpoint while running so the button re-enables after completion
    useEffect(() => {
        if (running) {
            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch('http://localhost:8000/api/scraper/status');
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
        niche: 'Cafes',
        customNiche: '',
        cities: 'London UK',
        limit: 20,
        outputFolder: './Email_Scrap/Leads/'
    });

    const handleRun = async () => {
        setRunning(true);
        try {
            const cityList = config.cities.split(',').map(s => s.trim()).filter(Boolean);
            const activeNiche = config.niche === 'Custom' ? config.customNiche : config.niche;

            const res = await fetch('http://localhost:8000/api/scraper/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    niche: activeNiche,
                    cities: cityList,
                    limit: parseInt(config.limit, 10),
                    output_folder: config.outputFolder
                })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`Failed to start: ${err.detail}`);
                setRunning(false);
            }
        } catch (e) {
            console.error(e);
            alert("Error starting scraper.");
            setRunning(false);
        }
    };

    const niches = [
        "Restaurants", "Cafes", "Coffee Shops", "Bars & Pubs", "Bakeries",
        "Food Trucks", "Gyms & Fitness Centers", "Yoga Studios", "Real Estate Agencies",
        "Dentists", "Custom"
    ];

    return (
        <div className="h-full flex flex-col space-y-5">

            {/* Page Header */}
            <header className="pb-4 border-b border-quinx-border">
                <div className="flex items-center space-x-2 mb-1">
                    <span className="w-1 h-5 bg-quinx-green rounded-full" />
                    <h1 className="text-xl font-bold text-white tracking-wide">Lead Scraper</h1>
                </div>
                <p className="text-quinx-muted text-sm pl-3">
                    Configure and trigger the{' '}
                    <span className="text-quinx-green font-medium">Email_Scrap</span>{' '}
                    pipeline mapped to Google Places API.
                </p>
            </header>

            <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">

                {/* Left Column: Config Form */}
                <div className="col-span-4 bg-quinx-surface border border-quinx-border rounded-md flex flex-col h-full overflow-hidden">
                    {/* Top accent */}
                    <div className="h-px bg-gradient-to-r from-transparent via-quinx-green/40 to-transparent flex-shrink-0" />

                    {/* Panel header */}
                    <div className="px-5 py-4 border-b border-quinx-border flex-shrink-0">
                        <h2 className="text-sm font-semibold text-white tracking-wide">Job Configuration</h2>
                    </div>

                    {/* Scrollable form */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                                Target Niche
                            </label>
                            <select
                                className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                value={config.niche}
                                onChange={(e) => setConfig({ ...config, niche: e.target.value })}
                                disabled={running}
                            >
                                {niches.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>

                        {config.niche === 'Custom' && (
                            <div className="flex flex-col space-y-1.5">
                                <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                                    Custom Niche
                                </label>
                                <input
                                    type="text"
                                    className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors placeholder:text-quinx-muted/40"
                                    value={config.customNiche}
                                    onChange={(e) => setConfig({ ...config, customNiche: e.target.value })}
                                    placeholder="e.g. Vintage Record Stores"
                                    disabled={running}
                                />
                            </div>
                        )}

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest flex items-center space-x-1.5">
                                <MapPin className="w-3 h-3" />
                                <span>Cities</span>
                                <span className="normal-case text-quinx-muted/50 font-normal">— comma separated</span>
                            </label>
                            <textarea
                                className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors min-h-[90px] resize-none placeholder:text-quinx-muted/40"
                                value={config.cities}
                                onChange={(e) => setConfig({ ...config, cities: e.target.value })}
                                placeholder="London UK, Tokyo Japan..."
                                disabled={running}
                            />
                        </div>

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest flex items-center space-x-1.5">
                                <Hash className="w-3 h-3" />
                                <span>Limit per City</span>
                            </label>
                            <input
                                type="number"
                                min="1" max="500"
                                className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors w-32"
                                value={config.limit}
                                onChange={(e) => setConfig({ ...config, limit: e.target.value })}
                                disabled={running}
                            />
                        </div>

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest flex items-center space-x-1.5">
                                <FolderOpen className="w-3 h-3" />
                                <span>Output Folder</span>
                            </label>
                            <input
                                type="text"
                                className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-quinx-muted/60 focus:outline-none cursor-default"
                                value={config.outputFolder}
                                readOnly
                            />
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
                                <span>PROCESS RUNNING...</span>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 fill-current" />
                                    <span>RUN SCRAPER / ENRICHER</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Column: Status & Terminal */}
                <div className="col-span-8 flex flex-col space-y-5 min-h-0">

                    <div className="grid grid-cols-3 gap-4 shrink-0" style={{ height: '88px' }}>
                        <StatusCard title="Cities Queued" value={config.cities.split(',').filter(Boolean).length || 0} />
                        <StatusCard title="Leads Found" value="—" subtitle="awaiting run" />
                        <StatusCard title="Emails Extracted" value="—" highlight={true} />
                    </div>

                    <div className="flex-1 min-h-0">
                        <TerminalLog module="scraper" />
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Scraper;
