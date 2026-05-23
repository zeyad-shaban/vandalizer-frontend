import { useEffect, useRef, useState } from "react";
import { checkJobStatus, fetchBBoxes } from "../services/api";
import { sleep } from "../utils"

export const useGetServerResult = (jobID, fetchingFunc, initValues) => {
    const [data, setData] = useState(initValues)
    const isComponentAlive = useRef(true);

    useEffect(() => {
        const initFetching = async () => {
            try {
                const res = await fetchBBoxes(jobID);
                setData(res.data);
            } catch (err) {
                if (err.response?.status !== 404)
                    console.error("Can't run intial fetch ", err);
            }
        }
        initFetching();
    }, [jobID]);


    useEffect(() => {
        isComponentAlive.current = true; // it's werid that i had to do this..?
        return () => {
            isComponentAlive.current = false;
        }
    }, [])

    const getResult = async () => {
        try {
            while (isComponentAlive.current) {
                const status = (await checkJobStatus(jobID)).data.status; // PENDING, RUNNING, SUCCESS, ERROR
                if (status == "SUCCESS" && isComponentAlive.current) {
                    const res = await fetchingFunc(jobID);
                    setData(res.data);
                    return true;
                }
                else if (status == "FAILURE") {
                    throw new Error("Server error, job failed to execute detections");
                }

                await sleep(1000);
            }
        } catch (err) {
            console.error("Polling error: ", err)
            throw err;
        }
    }

    return { data, getResult };
}