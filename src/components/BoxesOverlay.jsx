import { useState } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const roundBox = (box) => box.map((v) => Number(v.toFixed(2)));

const boxArea = ([x1, y1, x2, y2]) => Math.abs((x2 - x1) * (y2 - y1));

const toDisplayStyle = (box, normalized, dims) => {
    const [x1, y1, x2, y2] = box;

    if (normalized) {
        return {
            left: x1 * dims.dw,
            top: y1 * dims.dh,
            width: (x2 - x1) * dims.dw,
            height: (y2 - y1) * dims.dh,
        };
    }

    const sx = dims.dw / dims.nw;
    const sy = dims.dh / dims.nh;

    return {
        left: x1 * sx,
        top: y1 * sy,
        width: (x2 - x1) * sx,
        height: (y2 - y1) * sy,
    };
};

const displayPointToDataPoint = (x, y, normalized, dims, rect) => {
    if (normalized) {
        return {
            x: x / rect.width,
            y: y / rect.height,
        };
    }

    return {
        x: x * (dims.nw / rect.width),
        y: y * (dims.nh / rect.height),
    };
};

const toDataBoxFromDisplay = (start, current, normalized, dims, rect) => {
    const left = Math.min(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const right = Math.max(start.x, current.x);
    const bottom = Math.max(start.y, current.y);

    const p1 = displayPointToDataPoint(left, top, normalized, dims, rect);
    const p2 = displayPointToDataPoint(right, bottom, normalized, dims, rect);

    return roundBox([p1.x, p1.y, p2.x, p2.y]);
};

const containsPoint = (box, point, normalized, dims) => {
    const [x1, y1, x2, y2] = box;

    const px = normalized ? point.x / dims.dw : point.x * (dims.nw / dims.dw);
    const py = normalized ? point.y / dims.dh : point.y * (dims.nh / dims.dh);

    return px >= x1 && px <= x2 && py >= y1 && py <= y2;
};

const getHitBoxIndex = ({ items, point, normalized, dims }) => {
    let bestIndex = -1;
    let bestArea = Infinity;

    for (let i = 0; i < items.length; i += 1) {
        const item = items[i];

        if (!containsPoint(item.box, point, normalized, dims)) {
            continue;
        }

        const area = boxArea(item.box);
        if (area < bestArea) {
            bestArea = area;
            bestIndex = i;
        }
    }

    return bestIndex;
};

const PlusIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </svg>
);

const EraserIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M20 20H9" />
        <path d="M14 4l6 6-8 8H7L3 14l11-10z" />
    </svg>
);

const CheckIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const TrashIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
    </svg>
);

const ToolButton = ({ active, onClick, label, children }) => (
    <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`inline-flex size-10 items-center justify-center rounded-md border shadow-sm transition ${
            active
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        }`}
    >
        {children}
    </button>
);

const stopEvent = (e) => {
    e.stopPropagation();
};

export const BoxesOverlay = ({
    boxes = [],
    scores = [],
    textLabels = [],
    normalized = false,
    dims,
    selectedBoxId = null,
    toolMode = "select", // "select" | "add" | "erase"
    onSelectBox,
    onKeepBox,
    onDeleteBox,
    onAddBox,
}) => {
    const [drag, setDrag] = useState(null);

    const items = Array.isArray(boxes) ? boxes : [];
    const showOverlay = items.length > 0 || toolMode !== "select";

    const handlePointerDown = (e) => {
        if (toolMode !== "add" || e.button !== 0) return;
        if (e.target !== e.currentTarget) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const y = clamp(e.clientY - rect.top, 0, rect.height);

        setDrag({
            start: { x, y },
            current: { x, y },
            rect,
        });

        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (toolMode !== "add" || !drag) return;

        const rect = drag.rect;
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const y = clamp(e.clientY - rect.top, 0, rect.height);

        setDrag((prev) => (prev ? { ...prev, current: { x, y } } : prev));
    };

    const finishDrag = () => {
        if (toolMode !== "add" || !drag) return;

        const { start, current, rect } = drag;
        const dx = Math.abs(current.x - start.x);
        const dy = Math.abs(current.y - start.y);

        setDrag(null);

        if (dx < 6 || dy < 6) return;

        const nextBox = toDataBoxFromDisplay(start, current, normalized, dims, rect);
        onAddBox?.(nextBox);
    };

    const handleOverlayClick = (e) => {
        if (toolMode === "add") return;

        const rect = e.currentTarget.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };

        const hitIndex = getHitBoxIndex({
            items,
            point,
            normalized,
            dims,
        });

        if (hitIndex < 0) {
            onSelectBox?.(null);
            return;
        }

        const hitItem = items[hitIndex];

        if (toolMode === "erase") {
            onDeleteBox?.(hitItem.id);
            onSelectBox?.(null);
            return;
        }

        onSelectBox?.(hitItem.id);
    };

    const dragStyle = drag
        ? {
            left: Math.min(drag.start.x, drag.current.x),
            top: Math.min(drag.start.y, drag.current.y),
            width: Math.abs(drag.current.x - drag.start.x),
            height: Math.abs(drag.current.y - drag.start.y),
        }
        : null;

    if (!showOverlay) {
        return null;
    }

    return (
        <div
            className="absolute inset-0 z-20 select-none pointer-events-auto"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={() => setDrag(null)}
            onPointerLeave={() => {
                if (toolMode === "add") setDrag(null);
            }}
            onClick={handleOverlayClick}
        >
            {items.map((item, i) => {
                const { box, active } = item;
                const style = toDisplayStyle(box, normalized, dims);
                const confidence = typeof scores[i] === "number" ? `${Math.round(scores[i] * 100)}%` : "";
                const label = [textLabels[i], confidence].filter(Boolean).join(" ");
                const isSelected = selectedBoxId === item.id;

                return (
                    <div
                        key={item.id}
                        style={style}
                        className={`absolute box-border transition ${
                            active
                                ? isSelected
                                    ? "border-[3px] border-rose-600 bg-rose-100/20 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                                    : "border-[3px] border-rose-500 bg-rose-100/10 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
                                : "border-[3px] border-slate-500 bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.75)]"
                        }`}
                    >
                        {label ? (
                            <span
                                className={`absolute left-0 top-0 max-w-full truncate px-1.5 py-0.5 text-xs font-semibold leading-5 ${
                                    active ? "bg-rose-600 text-white" : "bg-slate-600 text-white"
                                }`}
                            >
                                {label}
                            </span>
                        ) : null}

                        {isSelected ? (
                            <div
                                className="absolute right-1 top-1 z-40 flex gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-md"
                                onPointerDown={stopEvent}
                                onMouseDown={stopEvent}
                                onClick={stopEvent}
                            >
                                <button
                                    type="button"
                                    title="Keep box"
                                    aria-label="Keep box"
                                    className={`inline-flex size-8 items-center justify-center rounded-md border disabled:cursor-default ${
                                        active
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                    }`}
                                    disabled={active}
                                    onPointerDown={stopEvent}
                                    onMouseDown={stopEvent}
                                    onClick={(e) => {
                                        stopEvent(e);
                                        onKeepBox?.(item.id);
                                    }}
                                >
                                    <CheckIcon />
                                </button>
                                <button
                                    type="button"
                                    title="Delete box"
                                    aria-label="Delete box"
                                    className={`inline-flex size-8 items-center justify-center rounded-md border disabled:cursor-default ${
                                        active
                                            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                                            : "border-rose-200 bg-rose-50 text-rose-700"
                                    }`}
                                    disabled={!active}
                                    onPointerDown={stopEvent}
                                    onMouseDown={stopEvent}
                                    onClick={(e) => {
                                        stopEvent(e);
                                        onDeleteBox?.(item.id);
                                    }}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ) : null}
                    </div>
                );
            })}

            {dragStyle ? (
                <div
                    className="absolute box-border border-[3px] border-dashed border-rose-600 bg-rose-100/15 pointer-events-none"
                    style={dragStyle}
                />
            ) : null}
        </div>
    );
};
