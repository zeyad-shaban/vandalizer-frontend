import { getSegmentImgUrl } from "../services/api"

export const BoxesOverlay = ({ boxes, score, textLabels, normalized, dims }) => {
    if (boxes.length == 0)
        return null;

    return <div className="absolute inset-0 pointer-events-none">
        {boxes.map(([x1, y1, x2, y2], i) => {
            const left = normalized ? x1 * dims.dw : x1 * (dims.dw / dims.nw);
            const top = normalized ? y1 * dims.dh : y1 * (dims.dh / dims.nh);
            const width = normalized ? (x2 - x1) * dims.dw : (x2 - x1) * (dims.dw / dims.nw);
            const height = normalized ? (y2 - y1) * dims.dh : (y2 - y1) * (dims.dh / dims.nh);
            return (
                <div
                    key={i}
                    style={{ left, top, width, height }}
                    className="absolute border-2 border-red-500 box-border"
                />
            );
        })}
    </div>
}