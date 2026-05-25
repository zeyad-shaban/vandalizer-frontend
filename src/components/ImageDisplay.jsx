import { BoxesOverlay } from "./BoxesOverlay";
import { MaskOverlay } from "./MaskOverlay";
import { useEffect, useMemo, useState } from "react";
import { Loading } from "../components/Loading";
import Workspace from "./Workspace";
import { useDetector } from "../hooks/useDetector";
import { ErrorMessage } from "./ErrorMessage";
import { useNavigate, useParams } from "react-router-dom";
import { useSegmentor } from "../hooks/useSegmentor";
import { useInpaintor } from "../hooks/useInpaintor";
import { fetchInpaintResult, getInpaintImgUrl, uploadImage } from "../services/api";
import { INPAINT_MODES } from "../constants";
import { createAppError, normalizeError } from "../errors";

const actionButtonClass = "inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500";

const StageCard = ({ title, children }) => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <div className="mt-4 space-y-4">{children}</div>
    </section>
);

const StageStatus = ({ loading, loadingTitle, error, success, warning, waiting }) => {
    if (loading) {
        return <Loading compact title={loadingTitle} />
    }

    if (error) {
        return <ErrorMessage compact err={error} />
    }

    if (success) {
        return (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                {success}
            </p>
        )
    }

    if (warning) {
        return (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                {warning}
            </p>
        )
    }

    return <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{waiting}</p>
};

const DownloadIcon = () => (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
    </svg>
);

const RefreshIcon = () => (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 1-15.1 6.7" />
        <path d="M3 12A9 9 0 0 1 18.1 5.3" />
        <path d="M17 1v5h5" />
        <path d="M7 23v-5H2" />
    </svg>
);

const IconButton = ({ label, onClick, disabled, children }) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
        className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 bg-white/95 text-slate-800 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
        {children}
    </button>
);

export const ImageDisplay = () => {
    const { jobID } = useParams();
    const navigate = useNavigate();
    const [dims, setDims] = useState({ dw: 1, dh: 1, nw: 1, nh: 1 });

    const {
        boxes: detectedBoxes = [],
        scores = [],
        text_labels: textLabels = [],
        detect,
        completed: detectorCompleted,
        loading: detectorLoading,
        err: detectorErr,
    } = useDetector(jobID);

    const [editorMode, setEditorMode] = useState("auto"); // auto | manual
    const [manualTool, setManualTool] = useState("add"); // add | erase
    const [boxItems, setBoxItems] = useState([]);
    const [selectedBoxId, setSelectedBoxId] = useState(null);

    const boxStateKey = useMemo(
        () => boxItems.map((item) => `${item.id}:${item.active ? "1" : "0"}:${item.box.join(",")}`).join("|"),
        [boxItems],
    );

    const activeBoxes = useMemo(
        () => boxItems.filter((item) => item.active).map((item) => item.box),
        [boxItems],
    );

    const {
        maskReady,
        segment,
        loading: segmentorLoading,
        err: segmentorErr,
    } = useSegmentor(jobID, activeBoxes, boxStateKey);

    const {
        inpaint,
        inpaintReady,
        loading: inpaintorLoading,
        err: inpaintorErr,
        resultVersion,
    } = useInpaintor(jobID, boxStateKey);

    const [prompt, setPrompt] = useState("");
    const [inpaintMode, setInpaintMode] = useState("blur");
    const [positivePrompt, setPositivePrompt] = useState("");
    const [numInferenceSteps, setNumInferenceSteps] = useState(2);
    const [strength, setStrength] = useState(0.7);
    const [resultActionLoading, setResultActionLoading] = useState("");
    const [resultActionErr, setResultActionErr] = useState(null);

    const hasAnyBoxes = boxItems.length > 0;
    const activeBoxCount = activeBoxes.length;
    const needsDiffusionPrompt = inpaintMode === "diffusion";
    const hasDiffusionPrompt = positivePrompt.trim().length > 0;

    const resultImageUrl = inpaintReady
        ? `${getInpaintImgUrl(jobID)}?v=${resultVersion || 0}`
        : "";

    const activeTask = detectorLoading
        ? "Detecting objects"
        : segmentorLoading
            ? "Building mask"
            : inpaintorLoading
                ? "Generating result"
                : "";

    useEffect(() => {
        if (editorMode !== "auto" || !detectorCompleted) {
            return;
        }

        const nextItems = detectedBoxes.map((box, index) => ({
            id: `det-${index}-${box.join("-")}`,
            box,
            active: true,
            source: "auto",
        }));

        setBoxItems(nextItems);
        setSelectedBoxId(null);
    }, [detectedBoxes, detectorCompleted, editorMode]);

    const onDimsChange = (newData) => {
        setDims(newData);
    };

    const handleAutoMode = () => {
        setEditorMode("auto");
        setManualTool("add");
    };

    const handleManualMode = () => {
        setEditorMode("manual");
        setManualTool("add");
        setBoxItems([]);
        setSelectedBoxId(null);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setSelectedBoxId(null);
        await detect(prompt);
    };

    const handlePromptChange = e => {
        setPrompt(e.target.value);
    };

    const handleStartSegmenting = async () => {
        await segment();
    };

    const handleSelectBox = (boxId) => {
        setSelectedBoxId(boxId);
    };

    const handleKeepBox = (boxId) => {
        if (editorMode !== "auto") {
            return;
        }

        setBoxItems((prev) =>
            prev.map((item) =>
                item.id === boxId ? { ...item, active: true } : item
            )
        );
    };

    const handleDeleteBox = (boxId) => {
        if (editorMode === "manual") {
            setBoxItems((prev) => prev.filter((item) => item.id !== boxId));
            if (selectedBoxId === boxId) {
                setSelectedBoxId(null);
            }
            return;
        }

        setBoxItems((prev) =>
            prev.map((item) =>
                item.id === boxId ? { ...item, active: false } : item
            )
        );
    };

    const handleAddBox = (box) => {
        const newId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setBoxItems((prev) => [...prev, { id: newId, box, active: true, source: "manual" }]);
        setSelectedBoxId(null);
    };

    const startInpainting = async () => {
        setResultActionErr(null);
        await inpaint({
            mode: inpaintMode,
            positivePrompt: needsDiffusionPrompt ? positivePrompt : "",
            numInferenceSteps,
            strength: strength,
        });
    };

    const handleDownloadResult = async () => {
        try {
            setResultActionLoading("download");
            setResultActionErr(null);
            const res = await fetchInpaintResult(jobID);
            const blobUrl = URL.createObjectURL(res.data);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `vandalizer-${jobID}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setResultActionErr(normalizeError(err, {
                title: "Download failed",
                message: "The result image could not be downloaded.",
            }));
        } finally {
            setResultActionLoading("");
        }
    };

    const handleUseResultAsInput = async () => {
        try {
            setResultActionLoading("reuse");
            setResultActionErr(null);
            const res = await fetchInpaintResult(jobID);
            const blob = res.data;
            if (!blob?.size) {
                throw createAppError({
                    title: "Result unavailable",
                    message: "The generated image could not be read for re-upload.",
                });
            }

            const file = new File([blob], "vandalizer-result.png", {
                type: blob.type || "image/png",
            });
            const uploadRes = await uploadImage(file);
            const nextJobID = uploadRes.data?.job_id || uploadRes.data;
            if (!nextJobID) {
                throw createAppError({
                    title: "Re-upload failed",
                    message: "The backend accepted the image but did not return a new job id.",
                });
            }
            navigate(`/detect/${nextJobID}`);
        } catch (err) {
            setResultActionErr(normalizeError(err, {
                title: "Could not reuse result",
                message: "The generated image could not be uploaded as a new input.",
            }));
        } finally {
            setResultActionLoading("");
        }
    };

    if (!jobID) {
        return (
            <main className="px-4 py-10">
                <div className="mx-auto max-w-2xl">
                    <ErrorMessage
                        err={{
                            title: "Missing workspace",
                            message: "This page needs a job id before it can load an image.",
                        }}
                    />
                </div>
            </main>
        );
    }

    const detectionSummary = editorMode === "manual"
        ? hasAnyBoxes
            ? `${boxItems.length} ${boxItems.length === 1 ? "box" : "boxes"} created`
            : "No boxes created yet."
        : hasAnyBoxes
            ? `${activeBoxCount}/${boxItems.length} ${boxItems.length === 1 ? "box" : "boxes"} selected`
            : "Ready";

    const canRunInpaint = maskReady
        && !inpaintorLoading
        && !segmentorLoading
        && (!needsDiffusionPrompt || hasDiffusionPrompt)

    const toolMode = editorMode === "manual" ? manualTool : "select";

    return (
        <main className="min-h-[calc(100vh-88px)] px-4 py-6 text-slate-900">
            <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-4">
                    <div className="relative">
                        <Workspace {...{ jobID, onDimsChange }}>
                            <BoxesOverlay
                                boxes={boxItems}
                                scores={scores}
                                textLabels={textLabels}
                                normalized={false}
                                dims={dims}
                                selectedBoxId={selectedBoxId}
                                toolMode={toolMode}
                                onToolModeChange={setManualTool}
                                onSelectBox={handleSelectBox}
                                onKeepBox={handleKeepBox}
                                onDeleteBox={handleDeleteBox}
                                onAddBox={handleAddBox}
                            />
                            <MaskOverlay jobID={jobID} show={maskReady} />
                        </Workspace>

                        {activeTask ? (
                            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/70 bg-white/90 p-3 shadow-lg backdrop-blur">
                                <Loading compact title={activeTask} />
                            </div>
                        ) : null}
                    </div>

                    {inpaintReady ? (
                        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-950">Result</h2>
                            <div className="relative mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                <img
                                    src={resultImageUrl}
                                    className="block w-full"
                                    alt="Generated result"
                                />
                                <div className="absolute right-3 top-3 flex gap-2">
                                    <IconButton
                                        label="Download result"
                                        onClick={handleDownloadResult}
                                        disabled={Boolean(resultActionLoading)}
                                    >
                                        <DownloadIcon />
                                    </IconButton>
                                    <IconButton
                                        label="Use result as new input"
                                        onClick={handleUseResultAsInput}
                                        disabled={Boolean(resultActionLoading)}
                                    >
                                        <RefreshIcon />
                                    </IconButton>
                                </div>
                            </div>
                            {resultActionLoading ? (
                                <div className="mt-3">
                                    <Loading
                                        compact
                                        title={resultActionLoading === "reuse" ? "Re-uploading result" : "Preparing download"}
                                    />
                                </div>
                            ) : null}
                            <ErrorMessage err={resultActionErr} className="mt-3" compact />
                        </section>
                    ) : null}
                </div>

                <aside className="space-y-4">
                    <StageCard title="Detection">

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleAutoMode}
                                className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${editorMode === "auto"
                                    ? "border-slate-950 bg-slate-950 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                    }`}
                            >
                                <span className="text-base">🤖</span>
                                Auto
                            </button>
                            <button
                                type="button"
                                onClick={handleManualMode}
                                className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${editorMode === "manual"
                                    ? "border-slate-950 bg-slate-950 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                    }`}
                            >
                                <span className="text-base">✍️</span>
                                Manual
                            </button>
                        </div>

                        {editorMode === "auto" ? (
                            <form className="space-y-3" onSubmit={handleSubmit}>
                                <label className="block text-sm font-medium text-slate-700" htmlFor="prompt">
                                    Object prompt
                                </label>
                                <input
                                    id="prompt"
                                    className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                    type="text"
                                    name="prompt"
                                    value={prompt}
                                    onChange={handlePromptChange}
                                    placeholder="hat, bag, sign"
                                    disabled={detectorLoading}
                                />
                                <button
                                    className={actionButtonClass}
                                    type="submit"
                                    disabled={detectorLoading || !prompt.trim()}
                                >
                                    {detectorLoading ? "Detecting" : "Detect"}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setManualTool("add")}
                                        className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${manualTool === "add"
                                            ? "border-slate-950 bg-slate-950 text-white"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                            }`}
                                    >
                                        <span className="inline-flex size-4 items-center justify-center">
                                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                                                <path d="M12 5v14" />
                                                <path d="M5 12h14" />
                                            </svg>
                                        </span>
                                        Plus
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManualTool("erase")}
                                        className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${manualTool === "erase"
                                            ? "border-slate-950 bg-slate-950 text-white"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                            }`}
                                    >
                                        <span className="inline-flex size-4 items-center justify-center">
                                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                                                <path d="M20 20H9" />
                                                <path d="M14 4l6 6-8 8H7L3 14l11-10z" />
                                            </svg>
                                        </span>
                                        Erase
                                    </button>
                                </div>
                                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                    Manual mode clears the auto-detected boxes. Use Plus to draw new boxes and Erase to remove them.
                                </p>
                            </div>
                        )}

                        <StageStatus
                            loading={detectorLoading}
                            loadingTitle="Detecting objects"
                            error={detectorErr}
                            success={detectionSummary}
                            waiting={editorMode === "manual" ? "Switch to Plus or Erase to edit boxes." : "Ready"}
                        />
                    </StageCard>

                    <StageCard title="Segmentation">
                        <button
                            className={actionButtonClass}
                            type="button"
                            onClick={handleStartSegmenting}
                            disabled={segmentorLoading || detectorLoading || activeBoxCount === 0}
                        >
                            {segmentorLoading ? "Segmenting" : "Create mask"}
                        </button>
                        <StageStatus
                            loading={segmentorLoading}
                            loadingTitle="Creating mask"
                            error={segmentorErr}
                            success={maskReady ? "Mask ready" : ""}
                            waiting={activeBoxCount > 0 ? "Ready" : "Keep at least one box active"}
                        />
                    </StageCard>

                    <StageCard title="Inpainting">
                        <div className={`grid grid-cols-3 gap-2`}>
                            {INPAINT_MODES.map(mode => {
                                const selected = inpaintMode === mode.value;
                                const disabled = inpaintorLoading;
                                return (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setInpaintMode(mode.value)}
                                        disabled={disabled}
                                        className={`min-h-11 rounded-md border px-2 py-2 text-xs font-semibold leading-tight transition sm:text-sm ${selected
                                            ? "border-slate-950 bg-slate-950 text-white"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                            } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                        {mode.label}
                                    </button>
                                );
                            })}
                        </div>

                        {needsDiffusionPrompt ? (
                            <div className={`space-y-3`}>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700" htmlFor="positivePrompt">
                                        Prompt
                                    </label>
                                    <input
                                        id="positivePrompt"
                                        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-100"
                                        type="text"
                                        value={positivePrompt}
                                        onChange={e => setPositivePrompt(e.target.value)}
                                        // placeholder="clean background, realistic texture"
                                        disabled={inpaintorLoading}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="text-sm font-medium text-slate-700" htmlFor="inferenceSteps">
                                            Inference steps
                                        </label>
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                            {numInferenceSteps}
                                        </span>
                                    </div>
                                    <input
                                        id="inferenceSteps"
                                        className="mt-2 w-full accent-rose-600"
                                        type="range"
                                        min="1"
                                        max="4"
                                        step="1"
                                        value={numInferenceSteps}
                                        onChange={e => setNumInferenceSteps(Number(e.target.value))}
                                        disabled={inpaintorLoading}
                                    />
                                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                                        <span>1</span>
                                        <span>4</span>
                                    </div>
                                </div>
                                <div>
                                    {/* Top Row: Label and Value badge */}
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700" htmlFor="strength">
                                            Denoising strength
                                        </label>
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                            {strength.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Hint Row: Clean, muted sub-text that sits perfectly below the label */}
                                    <p className="mt-1 text-xs leading-normal text-slate-400">
                                        controls how much of original image is changed. recommended: 0.5-0.8
                                    </p>

                                    {/* Slider Input */}
                                    <input
                                        id="strength"
                                        className="mt-2.5 w-full accent-rose-600 cursor-pointer"
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={strength}
                                        onChange={e => setStrength(Number(e.target.value))}
                                        disabled={inpaintorLoading}
                                    />

                                    {/* Min / Max indicators */}
                                    <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                        <span>Original</span>
                                        <span>Full Rewrite</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <button
                            className={actionButtonClass}
                            type="button"
                            onClick={startInpainting}
                            disabled={!canRunInpaint}
                        >
                            {inpaintorLoading ? "Generating" : "Generate result"}
                        </button>

                        <StageStatus
                            loading={inpaintorLoading}
                            loadingTitle="Generating result"
                            error={inpaintorErr}
                            success={inpaintReady ? "Result ready" : ""}
                            waiting={maskReady ? "Ready" : "Waiting for mask"}
                        />
                    </StageCard>
                </aside>
            </section>
        </main>
    );
};