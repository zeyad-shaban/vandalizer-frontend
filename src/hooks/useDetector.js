import { useState } from 'react'
import { fetchBBoxes, sendDetectorPrompt } from '../services/api';
import { useGetServerResult } from './useGetServerResult';

/**
 * @typedef {Object} DetectorData
 * @property {number[][]} boxes
 * @property {number[]} scores
 * @property {string[]} textLabels
 */

export const useDetector = (jobID) => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    /** @type {[DetectorData, Function]} */
    const { data, getResult: getBBoxes } = useGetServerResult(jobID, fetchBBoxes, { boxes: [], scores: [], textLabels: [] });

    const detect = async (prompt) => {
        try {
            setLoading(true);
            await sendDetectorPrompt(jobID, prompt);
            await getBBoxes();
        } catch (err) {
            console.log(err);
            setErr("Failed to detect objects, check developer console for more details")
        } finally {
            setLoading(false);
        }
    }

    return { ...data, detect, loading, err }
}