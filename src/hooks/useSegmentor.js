import { useEffect, useState } from "react";
import { useGetServerResult } from "./useGetServerResult";
import { fetchSegmentMasks, startSegmenting } from "../services/api";
import { createAppError, normalizeError } from "../errors";

const markReady = () => true;

export const useSegmentor = (jobID, boxes, resetKey = "") => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const { data, setData, getResult } = useGetServerResult(
        jobID,
        fetchSegmentMasks,
        false,
        { mapResponse: markReady },
    );

    useEffect(() => {
        setErr(null);
        setData(false);
    }, [jobID, resetKey, setData]);

    const segment = async () => {
        if (!Array.isArray(boxes) || boxes.length === 0) {
            const nextErr = createAppError({
                title: "No active boxes selected",
                message: "Keep at least one box active before creating a mask.",
            });
            setErr(nextErr);
            return false;
        }

        try {
            setLoading(true);
            setErr(null);
            setData(false);

            await startSegmenting(jobID, boxes);

            await getResult({
                failureTitle: "Segmentation failed",
                failureMessage: "The segmenter stopped before it could create a mask.",
                timeoutMessage: "Segmentation is taking longer than expected. Check that the worker is running, then try again.",
            });

            return true;
        } catch (e) {
            console.error("Error Starting Segmentation", e);
            setErr(normalizeError(e, {
                title: "Segmentation failed",
                message: "The segmenter could not finish this request.",
            }));
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { maskReady: Boolean(data), segment, loading, err };
};