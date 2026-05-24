import { useState } from "react";
import { uploadImage } from "../services/api";
import { Loading } from "../components/Loading"
import { ErrorMessage } from "../components/ErrorMessage"
import { createAppError, normalizeError } from "../errors";

export const ImageForm = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [fileName, setFileName] = useState("");

    const handleFileChange = async e => {
        if (loading)
            return;

        const file = e.target.files?.[0];
        if (!file)
            return;

        if (!file.type.startsWith("image/")) {
            setFileName("");
            setErr(createAppError({
                title: "Unsupported file",
                message: "Choose an image file such as PNG, JPG, or WEBP.",
            }));
            e.target.value = "";
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
            onSuccess(jobID)
        } catch (err) {
            console.error(err)
            setErr(normalizeError(err, {
                title: "Upload failed",
                message: "The image could not be uploaded. Check that the backend is running and try again.",
            }));
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    }

    return (
        <main className="min-h-[calc(100vh-88px)] px-4 py-10 text-slate-900">
            <section className="mx-auto max-w-2xl">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <p className="text-sm font-semibold uppercase text-rose-600">Vandalizer</p>
                        <h2 className="mt-2 text-2xl font-semibold text-slate-950">New image</h2>
                    </div>

                    <label
                        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${loading ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-300 bg-slate-50 text-slate-700 hover:border-rose-300 hover:bg-rose-50"}`}
                    >
                        <input
                            className="sr-only"
                            type='file'
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={loading}
                        />
                        <span className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                            Choose image
                        </span>
                        <span className="mt-3 text-sm text-slate-500">
                            {fileName || "PNG, JPG, WEBP"}
                        </span>
                    </label>

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
    )
}
