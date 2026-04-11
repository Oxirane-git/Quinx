import { useEffect, useRef, useState, useCallback } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { WS } from '../api';

const TerminalLog = ({ module }) => {
    const [logs, setLogs] = useState([]);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef(null);
    const bottomRef = useRef(null);
    const shouldReconnect = useRef(true);

    const connect = useCallback(() => {
        if (!shouldReconnect.current) return;
        wsRef.current = new WebSocket(`${WS}/ws/${module}`);

        wsRef.current.onopen = () => setConnected(true);

        wsRef.current.onmessage = (event) => {
            const timestamp = new Date().toLocaleTimeString('en-US', {
                hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            setLogs(prev => [...prev, { text: event.data, timestamp }]);
        };

        wsRef.current.onclose = () => {
            setConnected(false);
            setTimeout(() => connect(), 3000);
        };

        wsRef.current.onerror = () => setConnected(false);
    }, [module]);

    useEffect(() => {
        shouldReconnect.current = true;
        connect();
        return () => {
            shouldReconnect.current = false;
            if (wsRef.current) wsRef.current.close();
        };
    }, [connect]);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleCopy = () => {
        const text = logs.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
        navigator.clipboard.writeText(text);
    };

    const getLogStyle = (text) => {
        if (text.includes('[ERROR]') || text.toLowerCase().includes('failed')) return 'text-red-400';
        if (text.includes('[WARN]') || text.toLowerCase().includes('warning')) return 'text-yellow-400';
        if (text.includes('[SYSTEM]') || text.includes('[INFO]')) return 'text-blue-400';
        if (text.includes('✓') || text.toLowerCase().includes('success') || text.toLowerCase().includes('complete')) return 'text-quinx-green';
        return 'text-gray-400';
    };

    return (
        <div className="bg-[#080808] border border-quinx-border rounded-md flex flex-col h-full overflow-hidden">

            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-quinx-border bg-[#0d0d0d] flex-shrink-0">
                <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${
                        connected ? 'bg-quinx-green shadow-[0_0_7px_#00ff88]' : 'bg-quinx-muted/30'
                    }`} />
                    <span className="text-[11px] font-mono tracking-wider">
                        <span className="text-quinx-muted/50">stream://</span>
                        <span className="text-quinx-text">{module}</span>
                        {!connected && (
                            <span className="text-quinx-muted/40"> — reconnecting...</span>
                        )}
                    </span>
                </div>
                <div className="flex items-center space-x-0.5">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-quinx-muted/40 hover:text-quinx-muted rounded transition-colors"
                        title="Copy all logs"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => setLogs([])}
                        className="p-1.5 text-quinx-muted/40 hover:text-red-500 rounded transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Log output */}
            <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
                {logs.length === 0 ? (
                    <span className="text-quinx-muted/40 italic">Waiting for stream...</span>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="flex items-start space-x-3 group hover:bg-white/[0.02] -mx-1 px-1 rounded">
                            <span className="text-quinx-border/70 flex-shrink-0 select-none pt-px group-hover:text-quinx-muted/50 transition-colors min-w-[56px]">
                                {log.timestamp}
                            </span>
                            <span className={`${getLogStyle(log.text)} whitespace-pre-wrap break-all flex-1`}>
                                {log.text}
                            </span>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

        </div>
    );
};

export default TerminalLog;
