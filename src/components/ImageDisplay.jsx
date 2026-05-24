import { BoxesOverlay } from "./BoxesOverlay"
import { MaskOverlay } from "./MaskOverlay"
import { useState } from "react";
import { Loading } from "../components/Loading"
import Workspace from "./Workspace"
import { useDetector } from "../hooks/useDetector"
import { ErrorMessage } from "./ErrorMessage";
import { useNavigate, useParams } from "react-router-dom";
import { useSegmentor } from "../hooks/useSegmentor";
import { useInpaintor } from '../hooks/useInpaintor'
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
}

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
        boxes = [],
        scores = [],
        text_labels: textLabels = [],
        detect,
        completed: detectorCompleted,
        loading: detectorLoading,
        err: detectorErr,
    } = useDetector(jobID);
    const {
        maskReady,
        segment,
        loading: segmentorLoading,
        err: segmentorErr,
    } = useSegmentor(jobID, boxes);
    const {
        inpaint,
        inpaintReady,
        loading: inpaintorLoading,
        err: inpaintorErr,
        resultVersion,
    } = useInpaintor(jobID)

    const [prompt, setPrompt] = useState("");
    const [inpaintMode, setInpaintMode] = useState("blur");
    const [positivePrompt, setPositivePrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [numInferenceSteps, setNumInferenceSteps] = useState(4);
    const [resultActionLoading, setResultActionLoading] = useState("");
    const [resultActionErr, setResultActionErr] = useState(null);

    const hasBoxes = boxes.length > 0;
    const needsDiffusionPrompt = inpaintMode === "diffusion";
    const hasDiffusionPrompt = positivePrompt.trim().length > 0;
    const canRunInpaint = maskReady
        && !inpaintorLoading
        && !segmentorLoading
        && (!needsDiffusionPrompt || hasDiffusionPrompt);
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

    const onDimsChange = (newData) => {
        setDims(newData);
    }

    const handleSubmit = async e => {
        e.preventDefault();
        await detect(prompt);
    }

    const handlePromptChange = e => {
        setPrompt(e.target.value);
    }

    const handleStartSegmenting = async () => {
        await segment();
    }

    const startInpainting = async () => {
        setResultActionErr(null);
        await inpaint({
            mode: inpaintMode,
            positivePrompt: needsDiffusionPrompt ? positivePrompt : "",
            negativePrompt: needsDiffusionPrompt ? negativePrompt : "",
            numInferenceSteps,
        });
    }

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
    }

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
    }

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
        )
    }

    return (
        <main className="min-h-[calc(100vh-88px)] px-4 py-6 text-slate-900">
            <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-4">
                    <div className="relative">
                        <Workspace {...{ jobID, onDimsChange }}>
                            <BoxesOverlay {...{ boxes, scores, textLabels, normalized: false, dims }} />
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
                        <StageStatus
                            loading={detectorLoading}
                            loadingTitle="Detecting objects"
                            error={detectorErr}
                            success={hasBoxes ? `${boxes.length} bounding ${boxes.length === 1 ? "box" : "boxes"} ready` : ""}
                            warning={detectorCompleted && !hasBoxes ? "No boxes found. Try a different prompt." : ""}
                            waiting="Ready"
                        />
                    </StageCard>

                    <StageCard title="Segmentation">
                        <button
                            className={actionButtonClass}
                            type="button"
                            onClick={handleStartSegmenting}
                            disabled={segmentorLoading || detectorLoading || !hasBoxes}
                        >
                            {segmentorLoading ? "Segmenting" : "Create mask"}
                        </button>
                        <StageStatus
                            loading={segmentorLoading}
                            loadingTitle="Creating mask"
                            error={segmentorErr}
                            success={maskReady ? "Mask ready" : ""}
                            waiting={hasBoxes ? "Ready" : "Waiting for boxes"}
                        />
                    </StageCard>

                    <StageCard title="Inpainting">
                        <div className="grid grid-cols-3 gap-2">
                            {INPAINT_MODES.map(mode => {
                                const selected = inpaintMode === mode.value;
                                return (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setInpaintMode(mode.value)}
                                        disabled={inpaintorLoading}
                                        className={`min-h-11 rounded-md border px-2 py-2 text-xs font-semibold leading-tight transition sm:text-sm ${selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"} disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                        {mode.label}
                                    </button>
                                )
                            })}
                        </div>

                        {needsDiffusionPrompt ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700" htmlFor="positivePrompt">
                                        Positive prompt
                                    </label>
                                    <input
                                        id="positivePrompt"
                                        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                        type="text"
                                        value={positivePrompt}
                                        onChange={e => setPositivePrompt(e.target.value)}
                                        placeholder="clean background, realistic texture"
                                        disabled={inpaintorLoading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700" htmlFor="negativePrompt">
                                        Negative prompt
                                    </label>
                                    <input
                                        id="negativePrompt"
                                        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                        type="text"
                                        value={negativePrompt}
                                        onChange={e => setNegativePrompt(e.target.value)}
                                        placeholder="blurry, artifacts, distorted"
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
                                        min="4"
                                        max="15"
                                        step="1"
                                        value={numInferenceSteps}
                                        onChange={e => setNumInferenceSteps(Number(e.target.value))}
                                        disabled={inpaintorLoading}
                                    />
                                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                                        <span>4</span>
                                        <span>15</span>
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
    )
}
