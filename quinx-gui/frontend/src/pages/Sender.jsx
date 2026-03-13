import { useState, useEffect, useRef } from 'react';
import { Send, XCircle, Clock, AtSign, ChevronDown, RefreshCw } from 'lucide-react';
import TerminalLog from '../components/TerminalLog';
import StatusCard from '../components/StatusCard';

const Sender = () => {
    const [running, setRunning] = useState(false);
    const [emailFiles, setEmailFiles] = useState([]);
    const pollRef = useRef(null);

    // Poll status endpoint while running so the button re-enables after completion
    useEffect(() => {
        if (running) {
            pollRef.current = setInterval(async () => {
                try {
                    const res = await fetch('http://localhost:8000/api/sender/status');
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
        sendLimit: 0,        // 0 = send all
        minDelay: 10,
        maxDelay: 15,
        fromEmail: 'team@tryquinx.com',
        retryFailed: true,
        retryDelay: 4
    });

    const fetchEmailFiles = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/emails/list');
            const data = await res.json();
            setEmailFiles(data);
            if (data.length > 0 && !config.inputFile) {
                setConfig(c => ({ ...c, inputFile: data[0].path }));
            }
        } catch (e) {
            console.error('Failed to fetch email files:', e);
        }
    };

    useEffect(() => { fetchEmailFiles(); }, []);

    const handleStart = async () => {
        if (!config.inputFile) { alert('No email file selected.'); return; }
        setRunning(true);
        try {
            const res = await fetch('http://localhost:8000/api/sender/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_file: config.inputFile,
                    send_limit: parseInt(config.sendLimit, 10),
                    min_delay: parseInt(config.minDelay, 10),
                    max_delay: parseInt(config.maxDelay, 10),
                    from_email: config.fromEmail,
                    retry_failed: config.retryFailed,
                    retry_delay: parseInt(config.retryDelay, 10)
                })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`Failed to start: ${err.detail}`);
                setRunning(false);
            }
        } catch (e) {
            console.error(e);
            alert("Error starting sender.");
            setRunning(false);
        }
    };

    const handleAbort = async () => {
        try {
            await fetch('http://localhost:8000/api/sender/abort', { method: 'POST' });
            setRunning(false);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="h-full flex flex-col space-y-5">

            {/* Page Header */}
            <header className="pb-4 border-b border-quinx-border">
                <div className="flex items-center space-x-2 mb-1">
                    <span className="w-1 h-5 bg-quinx-green rounded-full" />
                    <h1 className="text-xl font-bold text-white tracking-wide">Email Sender</h1>
                </div>
                <p className="text-quinx-muted text-sm pl-3">
                    SMTP dispatch automation mapped to Node.js in{' '}
                    <span className="text-quinx-green font-medium">Email_Sender</span>.
                </p>
            </header>

            <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">

                {/* Left Column: Config Form */}
                <div className="col-span-4 bg-quinx-surface border border-quinx-border rounded-md flex flex-col h-full overflow-hidden">
                    {/* Top accent */}
                    <div className="h-px bg-gradient-to-r from-transparent via-quinx-green/40 to-transparent flex-shrink-0" />

                    {/* Panel header */}
                    <div className="px-5 py-4 border-b border-quinx-border flex-shrink-0">
                        <h2 className="text-sm font-semibold text-white tracking-wide">SMTP Config</h2>
                    </div>

                    {/* Scrollable form */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                        <div className="flex flex-col space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                                    Email Source
                                </label>
                                <button
                                    onClick={fetchEmailFiles}
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
                                    {emailFiles.length === 0
                                        ? <option value="">No emails found — run writer first</option>
                                        : emailFiles.map(f => (
                                            <option key={f.path} value={f.path}>{f.display}</option>
                                        ))
                                    }
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-quinx-muted/60 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest">
                                Send Limit
                            </label>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="number" min="0"
                                    className="w-28 bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                    value={config.sendLimit}
                                    onChange={(e) => setConfig({ ...config, sendLimit: e.target.value })}
                                    disabled={running}
                                />
                                <span className="text-xs text-quinx-muted/60">emails at once (0 = all)</span>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest flex items-center space-x-1.5">
                                <Clock className="w-3 h-3" />
                                <span>Send Delay (seconds)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-[10px] text-quinx-muted/60">Min</span>
                                    <input
                                        type="number" min="0"
                                        className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                        value={config.minDelay}
                                        onChange={(e) => setConfig({ ...config, minDelay: e.target.value })}
                                        disabled={running}
                                    />
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="text-[10px] text-quinx-muted/60">Max</span>
                                    <input
                                        type="number" min="0"
                                        className="bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                        value={config.maxDelay}
                                        onChange={(e) => setConfig({ ...config, maxDelay: e.target.value })}
                                        disabled={running}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[11px] font-semibold text-quinx-muted uppercase tracking-widest flex items-center space-x-1.5">
                                <AtSign className="w-3 h-3" />
                                <span>Sender Address</span>
                            </label>
                            <input
                                type="text"
                                className="w-full bg-black border border-quinx-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-quinx-green/60 transition-colors"
                                value={config.fromEmail}
                                onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                                disabled={running}
                            />
                            <p className="text-[11px] text-quinx-muted/50 italic">Password loaded securely from .env</p>
                        </div>

                        <div className="pt-1 border-t border-quinx-border/60 flex items-center space-x-3">
                            <div
                                className={`w-8 h-4 rounded-full transition-colors cursor-pointer flex-shrink-0 ${config.retryFailed ? 'bg-quinx-green/80' : 'bg-quinx-border'}`}
                                onClick={() => !running && setConfig({ ...config, retryFailed: !config.retryFailed })}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${config.retryFailed ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <label
                                className="text-sm text-quinx-text cursor-pointer select-none"
                                onClick={() => !running && setConfig({ ...config, retryFailed: !config.retryFailed })}
                            >
                                Auto-retry failed sends
                                <span className="text-quinx-muted/60 text-xs ml-1">(after {config.retryDelay}s)</span>
                            </label>
                        </div>

                    </div>

                    {/* Sticky footer */}
                    <div className="px-5 py-4 border-t border-quinx-border flex-shrink-0 flex space-x-3">
                        <button
                            onClick={handleStart}
                            disabled={running}
                            className={`flex-1 py-2.5 rounded-md text-sm font-bold flex justify-center items-center space-x-2 transition-all duration-200
                                ${running
                                    ? 'bg-quinx-border text-quinx-muted cursor-not-allowed'
                                    : 'bg-quinx-green text-black hover:bg-[#00e67a] hover:shadow-[0_0_20px_rgba(0,255,136,0.25)] active:scale-[0.98]'
                                }`}
                        >
                            <Send className="w-4 h-4" />
                            <span>{running ? 'SENDING...' : 'DISPATCH EMAILS'}</span>
                        </button>

                        {running && (
                            <button
                                onClick={handleAbort}
                                className="bg-red-950/60 text-red-400 border border-red-500/30 hover:bg-red-900/60 hover:border-red-400/60 px-4 rounded-md flex items-center justify-center transition-all"
                                title="Abort Process"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column: Status & Terminal */}
                <div className="col-span-8 flex flex-col space-y-5 min-h-0">

                    <div className="grid grid-cols-3 gap-4 shrink-0" style={{ height: '88px' }}>
                        <StatusCard title="Emails Sent" value="—" highlight={true} />
                        <StatusCard title="Failed" value="—" />
                        <StatusCard title="Remaining" value="—" />
                    </div>

                    <div className="flex-1 min-h-0">
                        <TerminalLog module="sender" />
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Sender;
