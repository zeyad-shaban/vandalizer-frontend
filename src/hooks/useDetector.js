import { useState } from 'react'
import { fetchBBoxes, sendDetectorPrompt } from '../services/api';
import { useGetServerResult } from './useGetServerResult';
import { createAppError, normalizeError } from '../errors';

/**
 * @typedef {Object} DetectorData
 * @property {number[][]} boxes
 * @property {number[]} scores
 * @property {string[]} textLabels
 */

export const useDetector = (jobID) => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [completed, setCompleted] = useState(false);
    /** @type {[DetectorData, Function]} */
    const { data, setData, getResult: getBBoxes } = useGetServerResult(
        jobID,
        fetchBBoxes,
        { boxes: [], scores: [], text_labels: [] },
    );

    const detect = async (prompt) => {
        const cleanPrompt = (prompt || "").trim();
        if (!cleanPrompt) {
            setErr(createAppError({
                title: "Detection needs a prompt",
                message: "Enter the object or objects you want to find before running detection.",
            }));
            return null;
        }

        try {
            setLoading(true);
            setErr(null);
            setCompleted(false);
            setData({ boxes: [], scores: [], text_labels: [] });
            await sendDetectorPrompt(jobID, cleanPrompt);
            const result = await getBBoxes({
                failureTitle: "Detection failed",
                failureMessage: "The detector stopped before it could produce bounding boxes.",
                timeoutMessage: "Detection is taking longer than expected. Check that the worker is running, then try again.",
            });
            setCompleted(true);
            return result;
        } catch (err) {
            console.log(err);
            setErr(normalizeError(err, {
                title: "Detection failed",
                message: "The detector could not finish this request.",
            }))
            return null;
        } finally {
            setLoading(false);
        }
    }

    return { ...data, detect, loading, err, completed }
}
