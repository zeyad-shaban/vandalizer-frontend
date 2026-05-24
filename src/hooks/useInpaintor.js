import { useEffect, useState } from "react";
import { startInpainting, fetchInpaintResult } from "../services/api";
import { useGetServerResult } from "./useGetServerResult";
import { normalizeError } from "../errors";

const markReady = () => true;

export const useInpaintor = (jobID, resetKey = "") => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [resultVersion, setResultVersion] = useState(0);

    const { data, setData, getResult: getInpaintResult } = useGetServerResult(
        jobID,
        fetchInpaintResult,
        false,
        { mapResponse: markReady },
    );

    useEffect(() => {
        setErr(null);
        setData(false);
        setResultVersion(0);
    }, [jobID, resetKey, setData]);

    const inpaint = async (options) => {
        try {
            setLoading(true);
            setErr(null);
            setData(false);

            await startInpainting(jobID, options);

            await getInpaintResult({
                failureTitle: "Inpainting failed",
                failureMessage: "The backend stopped before it could generate the final image.",
                timeoutMessage: "Inpainting is taking longer than expected. Check that the worker is running, then try again.",
            });

            setResultVersion(Date.now());
            return true;
        } catch (err) {
            console.error(err);
            setErr(normalizeError(err, {
                title: "Inpainting failed",
                message: "The app could not generate the final image. Make sure segmentation finished first.",
            }));
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { inpaintReady: Boolean(data), inpaint, loading, err, resultVersion };
};