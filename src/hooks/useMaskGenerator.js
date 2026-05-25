import { useCallback, useEffect, useState } from "react";
import { fetchSegmentMasks, startMaskGeneration } from "../services/api";
import { useGetServerResult } from "./useGetServerResult";
import { createAppError, normalizeError } from "../errors";

const responseBlob = (res) => res.data;

const blobHasMaskPixels = async (blob) => {
    if (!blob?.size) return false;

    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 12) {
            return true;
        }
    }
    return false;
};

export const useMaskGenerator = (jobID) => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [maskReady, setMaskReady] = useState(false);
    const [hasMaskPixels, setHasMaskPixels] = useState(false);
    const [maskVersion, setMaskVersion] = useState(0);

    const { data, setData, getResult } = useGetServerResult(
        jobID,
        fetchSegmentMasks,
        null,
        { mapResponse: responseBlob },
    );

    const commitMaskBlob = useCallback(async (blob) => {
        if (!blob) {
            setMaskReady(false);
            setHasMaskPixels(false);
            return false;
        }

        const nextHasPixels = await blobHasMaskPixels(blob);
        setMaskReady(true);
        setHasMaskPixels(nextHasPixels);
        setMaskVersion(Date.now());
        return nextHasPixels;
    }, []);

    useEffect(() => {
        queueMicrotask(() => {
            setErr(null);
            setMaskReady(false);
            setHasMaskPixels(false);
            setMaskVersion(0);
        });
    }, [jobID]);

    useEffect(() => {
        let cancelled = false;

        const inspectExistingMask = async () => {
            if (!data) return;

            try {
                const nextHasPixels = await blobHasMaskPixels(data);
                if (!cancelled) {
                    setMaskReady(true);
                    setHasMaskPixels(nextHasPixels);
                    setMaskVersion(Date.now());
                }
            } catch (e) {
                if (!cancelled) {
                    console.debug("Could not inspect mask pixels", e);
                }
            }
        };

        inspectExistingMask();

        return () => {
            cancelled = true;
        };
    }, [data]);

    const generateMask = async (prompt) => {
        const cleanPrompt = (prompt || "").trim();
        if (!cleanPrompt) {
            const nextErr = createAppError({
                title: "Mask generation needs a prompt",
                message: "Enter the object or objects you want to mask before generating.",
            });
            setErr(nextErr);
            return false;
        }

        try {
            setLoading(true);
            setErr(null);
            setMaskReady(false);
            setHasMaskPixels(false);
            setData(null);

            await startMaskGeneration(jobID, cleanPrompt);
            const maskBlob = await getResult({
                failureTitle: "Mask generation failed",
                failureMessage: "The backend stopped before it could create a mask.",
                timeoutMessage: "Mask generation is taking longer than expected. Check that the worker is running, then try again.",
            });

            return await commitMaskBlob(maskBlob);
        } catch (e) {
            console.error("Error generating mask", e);
            setErr(normalizeError(e, {
                title: "Mask generation failed",
                message: "The app could not create a mask for this image.",
            }));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const acceptUploadedMask = (nextHasPixels = true) => {
        setErr(null);
        setMaskReady(true);
        setHasMaskPixels(Boolean(nextHasPixels));
        setMaskVersion(Date.now());
    };

    return {
        generateMask,
        acceptUploadedMask,
        loading,
        err,
        maskReady,
        hasMaskPixels,
        maskVersion,
    };
};
