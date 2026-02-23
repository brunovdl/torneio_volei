export default function LiveBadge() {
    return (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
            <span className="text-red-400 text-xs font-bold tracking-widest uppercase">Ao Vivo</span>
        </div>
    )
}
