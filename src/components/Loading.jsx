export const Loading = ({
    title = "Working",
    description = "This can take a moment.",
    compact = false,
}) => {
    return (
        <div
            className={`flex items-center gap-3 text-slate-600 ${compact ? "text-sm" : "justify-center py-10"}`}
            role="status"
            aria-live="polite"
        >
            <span className={`${compact ? "size-4" : "size-6"} shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-rose-500`} />
            <span>
                <span className="block font-medium text-slate-800">{title}</span>
                {!compact && description ? <span className="block text-sm">{description}</span> : null}
            </span>
        </div>
    )
}
