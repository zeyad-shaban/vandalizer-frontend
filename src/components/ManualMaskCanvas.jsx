import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { fetchSegmentBinaryMask } from "../services/api";

const OVERLAY_COLOR = "rgba(225, 29, 72, 0.58)";

const loadDrawableFromBlob = async (blob) => {
    if ("createImageBitmap" in window) {
        return createImageBitmap(blob);
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not load mask image"));
        };
        img.src = url;
    });
};

export const ManualMaskCanvas = forwardRef(function ManualMaskCanvas({
    jobID,
    dims,
    editable,
    visible,
    tool,
    brushSize,
    onMaskStateChange,
}, ref) {
    const displayCanvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef(null);
    const modifiedRef = useRef(false);
    const canvasSizeRef = useRef({ width: 0, height: 0 });

    const naturalWidth = Math.max(1, Math.round(dims?.nw || 1));
    const naturalHeight = Math.max(1, Math.round(dims?.nh || 1));

    const ensureCanvases = useCallback(() => {
        const displayCanvas = displayCanvasRef.current;
        if (!displayCanvas) return null;

        if (!maskCanvasRef.current) {
            maskCanvasRef.current = document.createElement("canvas");
        }

        const maskCanvas = maskCanvasRef.current;
        const sizeChanged = canvasSizeRef.current.width !== naturalWidth
            || canvasSizeRef.current.height !== naturalHeight;

        if (sizeChanged) {
            canvasSizeRef.current = { width: naturalWidth, height: naturalHeight };
            displayCanvas.width = naturalWidth;
            displayCanvas.height = naturalHeight;
            maskCanvas.width = naturalWidth;
            maskCanvas.height = naturalHeight;
            maskCanvas.getContext("2d").clearRect(0, 0, naturalWidth, naturalHeight);
        }

        return { displayCanvas, maskCanvas };
    }, [naturalHeight, naturalWidth]);

    const hasPixels = useCallback(() => {
        const canvases = ensureCanvases();
        if (!canvases) return false;

        const { maskCanvas } = canvases;
        const ctx = maskCanvas.getContext("2d", { willReadFrequently: true });
        const pixels = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 12) {
                return true;
            }
        }
        return false;
    }, [ensureCanvases]);

    const renderOverlay = useCallback(() => {
        const canvases = ensureCanvases();
        if (!canvases) return;

        const { displayCanvas, maskCanvas } = canvases;
        const ctx = displayCanvas.getContext("2d");
        ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = OVERLAY_COLOR;
        ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
        ctx.globalCompositeOperation = "source-over";
    }, [ensureCanvases]);

    const emitState = useCallback((modified = modifiedRef.current) => {
        onMaskStateChange?.({
            modified,
            hasPixels: hasPixels(),
        });
    }, [hasPixels, onMaskStateChange]);

    const clearAll = useCallback((markModified = true) => {
        const canvases = ensureCanvases();
        if (!canvases) return;

        const { maskCanvas } = canvases;
        maskCanvas.getContext("2d").clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        modifiedRef.current = markModified;
        renderOverlay();
        emitState(markModified);
    }, [emitState, ensureCanvases, renderOverlay]);

    const loadMaskBlob = useCallback(async (blob, markModified = false) => {
        const canvases = ensureCanvases();
        if (!canvases || !blob?.size) return false;

        const { maskCanvas } = canvases;
        const source = await loadDrawableFromBlob(blob);
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = naturalWidth;
        tempCanvas.height = naturalHeight;

        const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.clearRect(0, 0, naturalWidth, naturalHeight);
        tempCtx.drawImage(source, 0, 0, naturalWidth, naturalHeight);
        source.close?.();

        const sourcePixels = tempCtx.getImageData(0, 0, naturalWidth, naturalHeight);
        const output = tempCtx.createImageData(naturalWidth, naturalHeight);

        for (let i = 0; i < sourcePixels.data.length; i += 4) {
            const red = sourcePixels.data[i];
            const green = sourcePixels.data[i + 1];
            const blue = sourcePixels.data[i + 2];
            const alpha = sourcePixels.data[i + 3];
            const luminance = (red + green + blue) / 3;
            const masked = alpha < 255 ? alpha > 12 : luminance > 127;

            if (masked) {
                output.data[i] = 255;
                output.data[i + 1] = 255;
                output.data[i + 2] = 255;
                output.data[i + 3] = 255;
            }
        }

        const maskCtx = maskCanvas.getContext("2d");
        maskCtx.clearRect(0, 0, naturalWidth, naturalHeight);
        maskCtx.putImageData(output, 0, 0);

        modifiedRef.current = markModified;
        renderOverlay();
        emitState(markModified);
        return hasPixels();
    }, [emitState, ensureCanvases, hasPixels, naturalHeight, naturalWidth, renderOverlay]);

    const loadFromServer = useCallback(async () => {
        if (!jobID) {
            clearAll(false);
            return false;
        }

        try {
            const res = await fetchSegmentBinaryMask(jobID);
            return loadMaskBlob(res.data, false);
        } catch (err) {
            if (err.response?.status === 404) {
                clearAll(false);
                return false;
            }
            throw err;
        }
    }, [clearAll, jobID, loadMaskBlob]);

    const exportMaskBlob = useCallback(async () => {
        const canvases = ensureCanvases();
        if (!canvases) {
            throw new Error("Mask canvas is not ready");
        }

        const { maskCanvas } = canvases;
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = maskCanvas.width;
        exportCanvas.height = maskCanvas.height;
        const ctx = exportCanvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(maskCanvas, 0, 0);

        return new Promise((resolve, reject) => {
            exportCanvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Could not export mask"));
            }, "image/png");
        });
    }, [ensureCanvases]);

    useImperativeHandle(ref, () => ({
        clearAll,
        exportMaskBlob,
        getHasPixels: hasPixels,
        loadFromServer,
    }), [clearAll, exportMaskBlob, hasPixels, loadFromServer]);

    useEffect(() => {
        ensureCanvases();
        renderOverlay();
    }, [ensureCanvases, renderOverlay]);

    useEffect(() => {
        modifiedRef.current = false;
        clearAll(false);
    }, [clearAll, jobID, naturalHeight, naturalWidth]);

    const getPoint = (event) => {
        const canvas = displayCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * naturalWidth,
            y: ((event.clientY - rect.top) / rect.height) * naturalHeight,
        };
    };

    const drawDot = (point) => {
        const canvases = ensureCanvases();
        if (!canvases) return;

        const ctx = canvases.maskCanvas.getContext("2d");
        ctx.save();
        ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const drawLine = (from, to) => {
        const canvases = ensureCanvases();
        if (!canvases) return;

        const ctx = canvases.maskCanvas.getContext("2d");
        ctx.save();
        ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
    };

    const finishStroke = () => {
        if (!drawingRef.current) return;

        drawingRef.current = false;
        lastPointRef.current = null;
        modifiedRef.current = true;
        renderOverlay();
        emitState(true);
    };

    const handlePointerDown = (event) => {
        if (!editable || event.button !== 0) return;

        event.preventDefault();
        const point = getPoint(event);
        drawingRef.current = true;
        lastPointRef.current = point;
        drawDot(point);
        renderOverlay();
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
        if (!editable || !drawingRef.current || !lastPointRef.current) return;

        event.preventDefault();
        const point = getPoint(event);
        drawLine(lastPointRef.current, point);
        lastPointRef.current = point;
        renderOverlay();
    };

    return (
        <canvas
            ref={displayCanvasRef}
            className={`absolute inset-0 z-30 h-full w-full select-none ${visible ? "" : "hidden"} ${editable ? "pointer-events-auto" : "pointer-events-none"}`}
            style={{
                cursor: editable ? "crosshair" : "default",
                touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            onPointerLeave={finishStroke}
            aria-label="Manual mask painting canvas"
        />
    );
});
