import { normalizeError } from "../errors"

export const ErrorMessage = ({
    err,
    fallback,
    onRetry,
    retryLabel = "Try again",
    onDismiss,
    compact = false,
    className = "",
}) => {
    const error = normalizeError(err, fallback);
    if (!error) return null

    return (
        <div
            className={`rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-950 shadow-sm ${className}`}
            role="alert"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="font-semibold">{error.title}</p>
                    <p className={`${compact ? "text-sm" : "mt-1 text-sm"} text-rose-900`}>{error.message}</p>
                </div>
                {onDismiss ? (
                    <button
                        type="button"
                        className="shrink-0 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                        onClick={onDismiss}
                    >
                        Dismiss
                    </button>
                ) : null}
            </div>

            {error.detail ? (
                <details className="mt-3 text-xs text-rose-800">
                    <summary className="cursor-pointer font-medium">Details</summary>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-white/80 p-2 font-mono text-[11px] leading-relaxed">
                        {error.detail}
                    </pre>
                </details>
            ) : null}

            {onRetry ? (
                <button
                    type="button"
                    className="mt-3 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={onRetry}
                >
                    {retryLabel}
                </button>
            ) : null}
        </div>
    )
}
