import { BoxesOverlay } from "./BoxesOverlay"
import { MaskOverlay } from "./MaskOverlay"
import { useState } from "react";
import { Loading } from "../components/Loading"
import Workspace from "./Workspace"
import { useDetector } from "../hooks/useDetector"
import { ErrorMessage } from "./ErrorMessage";
import { useParams } from "react-router-dom";
import { useSegmentor } from "../hooks/useSegmentor";
import { useInpaintor } from '../hooks/useInpaintor'
import { getInpaintImgUrl } from "../services/api";

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

export const ImageDisplay = () => {
    const { jobID } = useParams();
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
    } = useInpaintor(jobID)

    const [prompt, setPrompt] = useState("");
    const [inpaintPrompt, setInpaintPrompt] = useState("");

    const hasBoxes = boxes.length > 0;
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
        await inpaint(inpaintPrompt);
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
                            <img
                                src={getInpaintImgUrl(jobID)}
                                className="mt-4 block w-full rounded-md border border-slate-200"
                                alt="Generated result"
                            />
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
                        <label className="block text-sm font-medium text-slate-700" htmlFor="inpaintPrompt">
                            Edit prompt
                        </label>
                        <input
                            id="inpaintPrompt"
                            className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            type="text"
                            value={inpaintPrompt}
                            onChange={e => setInpaintPrompt(e.target.value)}
                            placeholder=""
                            disabled={inpaintorLoading}
                        />
                        <button
                            className={actionButtonClass}
                            type="button"
                            onClick={startInpainting}
                            disabled={inpaintorLoading || segmentorLoading || !maskReady}
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
