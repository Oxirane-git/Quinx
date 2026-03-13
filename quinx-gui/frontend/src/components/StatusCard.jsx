const StatusCard = ({ title, value, subtitle, highlight = false, icon: Icon }) => {
    return (
        <div className={`
            relative bg-quinx-surface border rounded-md p-4 flex flex-col justify-between h-full overflow-hidden
            ${highlight
                ? 'border-quinx-green/30 shadow-[0_0_24px_rgba(0,255,136,0.07)]'
                : 'border-quinx-border'
            }
        `}>
            {/* Top accent line + gradient on highlighted cards */}
            {highlight && (
                <>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-quinx-green/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-quinx-green/[0.04] to-transparent pointer-events-none" />
                </>
            )}

            <div className="flex items-start justify-between relative">
                <h3 className="text-quinx-muted text-[10px] uppercase tracking-[0.15em] font-semibold leading-tight">
                    {title}
                </h3>
                {Icon && (
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${highlight ? 'text-quinx-green/40' : 'text-quinx-border'}`} />
                )}
            </div>

            <div className="flex items-end space-x-2 relative mt-1">
                <span className={`text-2xl font-bold tabular-nums leading-none ${highlight ? 'text-quinx-green' : 'text-white'}`}>
                    {value}
                </span>
                {subtitle && (
                    <span className="text-quinx-muted text-[11px] pb-0.5">{subtitle}</span>
                )}
            </div>
        </div>
    );
};

export default StatusCard;
