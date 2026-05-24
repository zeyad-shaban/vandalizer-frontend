export const BoxesOverlay = ({ boxes = [], scores = [], textLabels = [], normalized, dims }) => {
    if (boxes.length === 0)
        return null;

    return <div className="absolute inset-0 pointer-events-none">
        {boxes.map(([x1, y1, x2, y2], i) => {
            const left = normalized ? x1 * dims.dw : x1 * (dims.dw / dims.nw);
            const top = normalized ? y1 * dims.dh : y1 * (dims.dh / dims.nh);
            const width = normalized ? (x2 - x1) * dims.dw : (x2 - x1) * (dims.dw / dims.nw);
            const height = normalized ? (y2 - y1) * dims.dh : (y2 - y1) * (dims.dh / dims.nh);
            const confidence = typeof scores[i] === "number" ? `${Math.round(scores[i] * 100)}%` : "";
            const label = [textLabels[i], confidence].filter(Boolean).join(" ");

            return (
                <div
                    key={i}
                    style={{ left, top, width, height }}
                    className="absolute box-border border-2 border-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.75)]"
                >
                    {label ? (
                        <span className="absolute left-0 top-0 max-w-full truncate bg-rose-600 px-1.5 py-0.5 text-xs font-semibold leading-5 text-white">
                            {label}
                        </span>
                    ) : null}
                </div>
            );
        })}
    </div>
}
