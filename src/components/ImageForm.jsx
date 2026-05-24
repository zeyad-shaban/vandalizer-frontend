import { useRef, useState } from "react";
import { uploadImage } from "../services/api";
import { Loading } from "../components/Loading";
import { ErrorMessage } from "../components/ErrorMessage";
import { createAppError, normalizeError } from "../errors";

export const ImageForm = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [fileName, setFileName] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleSelectedFile = async (file) => {
        if (loading || !file) return;

        if (!file.type.startsWith("image/")) {
            setFileName("");
            setErr(createAppError({
                title: "Unsupported file",
                message: "Choose an image file such as PNG, JPG, or WEBP.",
            }));
            return;
        }

        setLoading(true);
        setErr(null);
        setFileName(file.name);

        try {
            const res = await uploadImage(file);
            const jobID = res.data?.job_id;
            if (!jobID) {
                throw createAppError({
                    title: "Upload response was incomplete",
                    message: "The image reached the backend, but no job id came back.",
                });
            }
            onSuccess(jobID);
        } catch (err) {
            console.error(err);
            setErr(normalizeError(err, {
                title: "Upload failed",
                message: "The image could not be uploaded. Check that the backend is running and try again.",
            }));
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        await handleSelectedFile(file);
        e.target.value = "";
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        await handleSelectedFile(file);
    };

    const openFilePicker = () => {
        inputRef.current?.click();
    };

    return (
        <main className="min-h-[calc(100vh-88px)] px-4 py-10 text-slate-900">
            <section className="mx-auto max-w-2xl">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <p className="text-sm font-semibold uppercase text-rose-600">Vandalizer</p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-950">New image</h2>
                    </div>

                    <div
                        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
                            loading
                                ? "border-slate-200 bg-slate-50 text-slate-400"
                                : isDragging
                                    ? "border-rose-400 bg-rose-50 text-slate-700"
                                    : "border-slate-300 bg-slate-50 text-slate-700 hover:border-rose-300 hover:bg-rose-50"
                        }`}
                        onClick={openFilePicker}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!loading) setIsDragging(true);
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!loading) setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(false);
                        }}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={inputRef}
                            className="sr-only"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={loading}
                        />

                        <span className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                            Choose image
                        </span>

                        <span className="mt-3 text-sm text-slate-500">
                            {isDragging ? "Drop the image here" : (fileName || "PNG, JPG, WEBP")}
                        </span>
                    </div>

                    {loading ? (
                        <div className="mt-5">
                            <Loading title="Uploading image" description="Preparing the workspace." />
                        </div>
                    ) : null}

                    <ErrorMessage
                        err={err}
                        className="mt-5"
                        onDismiss={() => setErr(null)}
                    />
                </div>
            </section>
        </main>
    );
};