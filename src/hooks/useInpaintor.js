import { useState } from "react"
import { startInpainting, fetchInpaintResult } from "../services/api"
import { useGetServerResult } from "./useGetServerResult"

export const useInpaintor = (jobID) => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const { data, getResult: getInpaintResult } = useGetServerResult(
        jobID, fetchInpaintResult, { inpaintedImgUrl: null }
    );

    const inpaint = async (prompt) => {
        try {
            setLoading(true);
            await startInpainting(jobID, prompt);
            await getInpaintResult();
        } catch (err) {
            console.error(err);
            setErr("Failed to inpaint, check developer console for more details");
        } finally {
            setLoading(false);
        }
    }
    return { ...data, inpaint, loading, err };
}
