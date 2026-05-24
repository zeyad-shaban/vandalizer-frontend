import { useCallback, useEffect, useRef, useState } from "react";
import { checkJobStatus } from "../services/api";
import { sleep } from "../utils"
import { createAppError } from "../errors";

const defaultMapResponse = res => res.data;

export const useGetServerResult = (jobID, fetchingFunc, initValues, options = {}) => {
    const {
        initialFetch = true,
        mapResponse = defaultMapResponse,
        pollInterval = 1000,
        timeoutMs = 120000,
    } = options;
    const [data, setData] = useState(initValues)
    const isComponentAlive = useRef(true);
    const initialData = useRef(initValues);

    useEffect(() => {
        const initFetching = async () => {
            if (!initialFetch || !jobID || !fetchingFunc) return;

            try {
                const res = await fetchingFunc(jobID);
                if (isComponentAlive.current) {
                    setData(mapResponse(res));
                }
            } catch (err) {
                if (err.response?.status !== 404)
                    console.debug("Could not load existing result", err);
            }
        }
        setData(initialData.current);
        initFetching();
    }, [jobID, fetchingFunc, initialFetch, mapResponse]);


    useEffect(() => {
        isComponentAlive.current = true; // it's werid that i had to do this..?
        return () => {
            isComponentAlive.current = false;
        }
    }, [])

    const getResult = useCallback(async ({
        failureTitle = "Processing failed",
        failureMessage = "The backend stopped before this step finished.",
        timeoutTitle = "Still waiting",
        timeoutMessage = "This is taking longer than expected. Check that the worker is running and try again.",
    } = {}) => {
        const startedAt = Date.now();

        try {
            while (isComponentAlive.current) {
                const status = (await checkJobStatus(jobID)).data.status;
                if (status === "SUCCESS" && isComponentAlive.current) {
                    const res = await fetchingFunc(jobID);
                    const nextData = mapResponse(res);
                    setData(nextData);
                    return nextData;
                }
                else if (status === "FAILURE" || status === "REVOKED") {
                    throw createAppError({
                        title: failureTitle,
                        message: failureMessage,
                    });
                }

                if (Date.now() - startedAt > timeoutMs) {
                    throw createAppError({
                        title: timeoutTitle,
                        message: timeoutMessage,
                    });
                }

                await sleep(pollInterval);
            }
        } catch (err) {
            console.error("Polling error: ", err)
            throw err;
        }
        return null;
    }, [fetchingFunc, jobID, mapResponse, pollInterval, timeoutMs])

    return { data, setData, getResult };
}
