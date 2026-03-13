import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Edit3, Send, Database, Activity } from 'lucide-react';

const Sidebar = () => {
    const [statuses, setStatuses] = useState({ scraper: false, writer: false, sender: false });
    const [backendOnline, setBackendOnline] = useState(false);

    const checkStatuses = async () => {
        try {
            const [scraperRes, writerRes, senderRes] = await Promise.all([
                fetch('http://localhost:8000/api/scraper/status').catch(() => ({ ok: false })),
                fetch('http://localhost:8000/api/writer/status').catch(() => ({ ok: false })),
                fetch('http://localhost:8000/api/sender/status').catch(() => ({ ok: false }))
            ]);

            setBackendOnline(scraperRes.ok || writerRes.ok || senderRes.ok);
            setStatuses({
                scraper: scraperRes.ok ? (await scraperRes.json()).running : false,
                writer: writerRes.ok ? (await writerRes.json()).running : false,
                sender: senderRes.ok ? (await senderRes.json()).running : false,
            });
        } catch (e) {
            setBackendOnline(false);
        }
    };

    useEffect(() => {
        checkStatuses();
        const interval = setInterval(checkStatuses, 5000);
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { path: '/scraper', label: 'Lead Scraper', icon: Search, id: 'scraper' },
        { path: '/writer', label: 'Email Writer', icon: Edit3, id: 'writer' },
        { path: '/sender', label: 'Email Sender', icon: Send, id: 'sender' },
        { path: '/logs', label: 'Campaign Logs', icon: Database, id: 'logs' },
    ];

    return (
        <div className="w-64 bg-quinx-surface border-r border-quinx-border h-full flex flex-col">

            {/* Brand Header */}
            <div className="px-5 py-5 border-b border-quinx-border">
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-md bg-quinx-green/10 border border-quinx-green/20 flex items-center justify-center shadow-[0_0_16px_rgba(0,255,136,0.12)] flex-shrink-0">
                        <Activity className="text-quinx-green w-[18px] h-[18px]" />
                    </div>
                    <div>
                        <h1 className="text-[13px] font-bold text-white tracking-widest leading-tight">
                            QUINX<span className="text-quinx-green">_OPS</span>
                        </h1>
                        <p className="text-[9px] text-quinx-muted/70 tracking-[0.2em] mt-0.5 uppercase">
                            Outreach Automation
                        </p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <div className="flex-1 py-4 px-3">
                <p className="text-[9px] font-semibold text-quinx-muted/50 tracking-[0.2em] uppercase px-3 mb-2">
                    Modules
                </p>
                <nav className="space-y-0.5">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `relative flex items-center space-x-3 px-3 py-2.5 rounded-md transition-all duration-150 ${
                                    isActive
                                        ? 'bg-quinx-green/10 text-quinx-green'
                                        : 'text-quinx-muted hover:bg-white/5 hover:text-quinx-text'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-quinx-green rounded-r-full" />
                                    )}
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="font-medium text-[13px] flex-1">{item.label}</span>
                                    {item.id !== 'logs' && (
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                                            statuses[item.id]
                                                ? 'bg-quinx-green shadow-[0_0_6px_#00ff88]'
                                                : 'bg-quinx-border'
                                        }`} />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Footer */}
            <div className="px-4 py-3.5 border-t border-quinx-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                            backendOnline ? 'bg-quinx-green shadow-[0_0_5px_#00ff88]' : 'bg-quinx-muted/30'
                        }`} />
                        <span className={`text-[10px] tracking-wider ${
                            backendOnline ? 'text-quinx-green' : 'text-quinx-muted/50'
                        }`}>
                            {backendOnline ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
                        </span>
                    </div>
                    <span className="text-[10px] text-quinx-border">v1.0.0</span>
                </div>
            </div>

        </div>
    );
};

export default Sidebar;
