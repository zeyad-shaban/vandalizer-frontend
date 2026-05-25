import { useCallback, useMemo, useRef, useState } from "react";
import { MaskOverlay } from "./MaskOverlay";
import { ManualMaskCanvas } from "./ManualMaskCanvas";
import { Loading } from "../components/Loading";
import Workspace from "./Workspace";
import { ErrorMessage } from "./ErrorMessage";
import { useNavigate, useParams } from "react-router-dom";
import { useMaskGenerator } from "../hooks/useMaskGenerator";
import { useInpaintor } from "../hooks/useInpaintor";
import { fetchInpaintResult, getInpaintImgUrl, uploadImage, uploadManualMask } from "../services/api";
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

const BrushIcon = () => (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 3l3 3-9.5 9.5-3-3L18 3z" />
        <path d="M8.5 12.5L6 15c-1.2 1.2-.8 3.2-2.8 4 2.7.5 5-.1 6.3-1.5l2-2" />
    </svg>
);

const EraserIcon = () => (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H9" />
        <path d="M14 4l6 6-8 8H7L3 14l11-10z" />
    </svg>
);

const XIcon = () => (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const ModeIcon = () => (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="m5.6 5.6 2.1 2.1" />
        <path d="m16.3 16.3 2.1 2.1" />
        <path d="m18.4 5.6-2.1 2.1" />
        <path d="m7.7 16.3-2.1 2.1" />
        <circle cx="12" cy="12" r="3.5" />
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

const ToggleButton = ({ selected, onClick, label, children, disabled }) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={selected}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex size-10 items-center justify-center rounded-md border text-sm font-semibold transition ${
            selected
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        } disabled:cursor-not-allowed disabled:opacity-60`}
    >
        {children}
    </button>
);

const ModeButton = ({ selected, onClick, label, children, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
            selected
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        } disabled:cursor-not-allowed disabled:opacity-60`}
    >
        {children}
        {label}
    </button>
);

export const ImageDisplay = () => {
    const { jobID } = useParams();
    const navigate = useNavigate();
    const manualCanvasRef = useRef(null);
    const [dims, setDims] = useState({ dw: 1, dh: 1, nw: 1, nh: 1 });

    const {
        generateMask,
        acceptUploadedMask,
        loading: maskLoading,
        err: maskErr,
        maskReady,
        hasMaskPixels,
        maskVersion,
    } = useMaskGenerator(jobID);

    const [maskMode, setMaskMode] = useState("auto");
    const [manualTool, setManualTool] = useState("brush");
    const [brushSize, setBrushSize] = useState(34);
    const [manualMaskState, setManualMaskState] = useState({ modified: false, hasPixels: false });
    const [manualEditVersion, setManualEditVersion] = useState(0);
    const [manualUploadLoading, setManualUploadLoading] = useState(false);
    const [manualUploadErr, setManualUploadErr] = useState(null);

    const {
        inpaint,
        inpaintReady,
        loading: inpaintorLoading,
        err: inpaintorErr,
        resultVersion,
    } = useInpaintor(jobID, `${maskVersion}:${manualEditVersion}`);

    const [prompt, setPrompt] = useState("");
    const [inpaintMode, setInpaintMode] = useState("blur");
    const [positivePrompt, setPositivePrompt] = useState("");
    const [numInferenceSteps, setNumInferenceSteps] = useState(2);
    const [strength, setStrength] = useState(0.7);
    const [resultActionLoading, setResultActionLoading] = useState("");
    const [resultActionErr, setResultActionErr] = useState(null);

    const needsDiffusionPrompt = inpaintMode === "diffusion";
    const hasDiffusionPrompt = positivePrompt.trim().length > 0;
    const showManualOverlay = maskMode === "manual" || manualMaskState.modified;
    const effectiveHasMaskPixels = showManualOverlay ? manualMaskState.hasPixels : hasMaskPixels;
    const processing = maskLoading || inpaintorLoading || manualUploadLoading;

    const resultImageUrl = inpaintReady
        ? `${getInpaintImgUrl(jobID)}?v=${resultVersion || 0}`
        : "";

    const activeTask = maskLoading
        ? "Generating mask"
        : manualUploadLoading
            ? "Uploading mask"
            : inpaintorLoading
                ? "Generating result"
                : "";

    const handleManualMaskStateChange = useCallback((nextState) => {
        setManualMaskState((prev) => {
            const modified = Boolean(nextState.modified);
            const hasPixels = Boolean(nextState.hasPixels);
            if (prev.modified === modified && prev.hasPixels === hasPixels) {
                return prev;
            }
            return { modified, hasPixels };
        });

        if (nextState.modified) {
            setManualEditVersion(Date.now());
        }
    }, []);

    const onDimsChange = (newData) => {
        setDims(newData);
    };

    const handleAutoMode = () => {
        setMaskMode("auto");
        setManualUploadErr(null);
    };

    const handleManualMode = async () => {
        setMaskMode("manual");
        setManualUploadErr(null);

        if (!manualMaskState.modified) {
            try {
                await manualCanvasRef.current?.loadFromServer();
            } catch (err) {
                setManualUploadErr(normalizeError(err, {
                    title: "Mask load failed",
                    message: "The existing mask could not be loaded into the manual canvas.",
                }));
            }
        }
    };

    const handleGenerateMask = async (e) => {
        e.preventDefault();
        setManualUploadErr(null);
        setManualMaskState({ modified: false, hasPixels: false });
        setManualEditVersion(Date.now());

        const generatedHasPixels = await generateMask(prompt);
        try {
            const loadedHasPixels = await manualCanvasRef.current?.loadFromServer();
            setManualMaskState({
                modified: false,
                hasPixels: Boolean(loadedHasPixels ?? generatedHasPixels),
            });
        } catch (err) {
            console.debug("Could not seed manual canvas", err);
        }
    };

    const handleClearManualMask = () => {
        manualCanvasRef.current?.clearAll(true);
        setManualEditVersion(Date.now());
    };

    const startInpainting = async () => {
        setManualUploadErr(null);
        setResultActionErr(null);

        if (!effectiveHasMaskPixels) {
            setManualUploadErr(createAppError({
                title: "Mask is empty",
                message: "Create or paint at least one masked pixel before running inpainting.",
            }));
            return;
        }

        const shouldUploadManualMask = maskMode === "manual" || manualMaskState.modified;

        if (shouldUploadManualMask) {
            try {
                setManualUploadLoading(true);
                const stillHasPixels = manualCanvasRef.current?.getHasPixels();
                if (!stillHasPixels) {
                    throw createAppError({
                        title: "Mask is empty",
                        message: "Create or paint at least one masked pixel before running inpainting.",
                    });
                }

                const maskBlob = await manualCanvasRef.current.exportMaskBlob();
                await uploadManualMask(jobID, maskBlob);
                acceptUploadedMask(true);
                setManualMaskState({ modified: false, hasPixels: true });
            } catch (err) {
                setManualUploadErr(normalizeError(err, {
                    title: "Mask upload failed",
                    message: "The manual mask could not be saved before inpainting.",
                }));
                return;
            } finally {
                setManualUploadLoading(false);
            }
        }

        await inpaint({
            mode: inpaintMode,
            positivePrompt: needsDiffusionPrompt ? positivePrompt : "",
            numInferenceSteps,
            strength,
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

    const maskStatus = useMemo(() => {
        if (effectiveHasMaskPixels) {
            return { success: "Mask ready" };
        }

        if (maskReady && !hasMaskPixels && !manualMaskState.modified) {
            return { warning: "No masked pixels found." };
        }

        if (manualMaskState.modified && !manualMaskState.hasPixels) {
            return { warning: "Manual mask is empty." };
        }

        return { waiting: maskMode === "auto" ? "Ready" : "Painted mask required" };
    }, [effectiveHasMaskPixels, hasMaskPixels, manualMaskState.hasPixels, manualMaskState.modified, maskMode, maskReady]);

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

    const canRunInpaint = effectiveHasMaskPixels
        && !processing
        && (!needsDiffusionPrompt || hasDiffusionPrompt);

    return (
        <main className="min-h-[calc(100vh-88px)] px-4 py-6 text-slate-900">
            <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-4">
                    <div className="relative">
                        <Workspace {...{ jobID, onDimsChange }}>
                            <MaskOverlay
                                jobID={jobID}
                                show={maskReady && !showManualOverlay}
                                version={maskVersion}
                            />
                            <ManualMaskCanvas
                                ref={manualCanvasRef}
                                jobID={jobID}
                                dims={dims}
                                editable={maskMode === "manual" && !processing}
                                visible={showManualOverlay}
                                tool={manualTool}
                                brushSize={brushSize}
                                onMaskStateChange={handleManualMaskStateChange}
                            />
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
                    <StageCard title="Mask Generation">
                        <div className="grid grid-cols-2 gap-2">
                            <ModeButton
                                label="Auto"
                                selected={maskMode === "auto"}
                                onClick={handleAutoMode}
                                disabled={processing}
                            >
                                <ModeIcon />
                            </ModeButton>
                            <ModeButton
                                label="Manual"
                                selected={maskMode === "manual"}
                                onClick={handleManualMode}
                                disabled={processing}
                            >
                                <BrushIcon />
                            </ModeButton>
                        </div>

                        {maskMode === "auto" ? (
                            <form className="space-y-3" onSubmit={handleGenerateMask}>
                                <label className="block text-sm font-medium text-slate-700" htmlFor="prompt">
                                    Object prompt
                                </label>
                                <input
                                    id="prompt"
                                    className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                    type="text"
                                    name="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="hat, bag, sign"
                                    disabled={maskLoading}
                                />
                                <button
                                    className={actionButtonClass}
                                    type="submit"
                                    disabled={maskLoading || !prompt.trim()}
                                >
                                    {maskLoading ? "Generating" : "Generate Mask"}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <ToggleButton
                                        label="Brush"
                                        selected={manualTool === "brush"}
                                        onClick={() => setManualTool("brush")}
                                        disabled={processing}
                                    >
                                        <BrushIcon />
                                    </ToggleButton>
                                    <ToggleButton
                                        label="Eraser"
                                        selected={manualTool === "eraser"}
                                        onClick={() => setManualTool("eraser")}
                                        disabled={processing}
                                    >
                                        <EraserIcon />
                                    </ToggleButton>
                                    <div className="flex-1" />
                                    <IconButton
                                        label="Clear all"
                                        onClick={handleClearManualMask}
                                        disabled={processing}
                                    >
                                        <XIcon />
                                    </IconButton>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label className="text-sm font-medium text-slate-700" htmlFor="brushSize">
                                            Brush size
                                        </label>
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                            {brushSize}px
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="size-2 rounded-full bg-rose-500" aria-hidden="true" />
                                        <input
                                            id="brushSize"
                                            className="w-full accent-rose-600"
                                            type="range"
                                            min="6"
                                            max="96"
                                            step="2"
                                            value={brushSize}
                                            onChange={(e) => setBrushSize(Number(e.target.value))}
                                            disabled={processing}
                                        />
                                        <span className="size-5 rounded-full bg-rose-500" aria-hidden="true" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <StageStatus
                            loading={maskLoading}
                            loadingTitle="Generating mask"
                            error={maskErr || manualUploadErr}
                            success={maskStatus.success}
                            warning={maskStatus.warning}
                            waiting={maskStatus.waiting}
                        />
                    </StageCard>

                    <StageCard title="Inpainting">
                        <div className="grid grid-cols-3 gap-2">
                            {INPAINT_MODES.map(mode => {
                                const selected = inpaintMode === mode.value;
                                const disabled = processing;
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
                            <div className="space-y-3">
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
                                        disabled={processing}
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
                                        disabled={processing}
                                    />
                                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                                        <span>1</span>
                                        <span>4</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700" htmlFor="strength">
                                            Denoising strength
                                        </label>
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                            {strength.toFixed(2)}
                                        </span>
                                    </div>
                                    <input
                                        id="strength"
                                        className="mt-2.5 w-full cursor-pointer accent-rose-600"
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={strength}
                                        onChange={e => setStrength(Number(e.target.value))}
                                        disabled={processing}
                                    />
                                    <div className="mt-1 flex justify-between text-[10px] font-medium uppercase text-slate-400">
                                        <span>Original</span>
                                        <span>Rewrite</span>
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
                            {manualUploadLoading
                                ? "Uploading Mask"
                                : inpaintorLoading
                                    ? "Generating"
                                    : "Generate Result"}
                        </button>

                        <StageStatus
                            loading={manualUploadLoading || inpaintorLoading}
                            loadingTitle={manualUploadLoading ? "Uploading mask" : "Generating result"}
                            error={manualUploadErr || inpaintorErr}
                            success={inpaintReady ? "Result ready" : ""}
                            warning={!effectiveHasMaskPixels ? "Create a non-empty mask first." : ""}
                            waiting={effectiveHasMaskPixels ? "Ready" : "Waiting for mask"}
                        />
                    </StageCard>
                </aside>
            </section>
        </main>
    );
};
