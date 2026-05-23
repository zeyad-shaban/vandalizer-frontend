import axios from 'axios';
import { OUT_INPAINT_PATH, OUT_BBOXES_PATH, OUT_SEGMENT_PATH, INPUT_IMG_PATH } from "@/constants"

const apiClient = axios.create({ baseURL: import.meta.env.API_BASE_URL });

export const uploadImage = (file) => {
    const data = new FormData()
    data.append('img', file)
    return apiClient.post('/upload', data)
}

export const sendDetectorPrompt = (jobID, prompt) => {
    const endpoint = `/process/detect_objects/${jobID}`;
    const data = new FormData();
    data.append('prompt', prompt);

    return apiClient.post(endpoint, data);
}

export const startSegmenting = (jobID, bboxes) => {
    const endpoint = `/process/segment_objects/${jobID}`;
    return apiClient.post(endpoint, { bboxes });
}

export const startInpainting = (jobID, prompt) => {
    const endpoint = `/process/inpaint/${jobID}`;
    const data = new FormData();
    data.append('prompt', prompt);
    return apiClient.post(endpoint, data);
}

export const fetchInpaintResult = jobID =>
    apiClient.get(`/uploads/${jobID}/${OUT_INPAINT_PATH}`);

export const checkJobStatus = jobID =>
    apiClient.get(`/job_status/${jobID}`)


export const fetchBBoxes = jobID =>
    apiClient.get(`/uploads/${jobID}/${OUT_BBOXES_PATH}`);

export const fetchSegmentMasks = jobID =>
    apiClient.get(`/uploads/${jobID}/${OUT_SEGMENT_PATH}`)


// just helpers
export const getInputImgUrl = (jobID) =>
    `${import.meta.env.API_BASE_URL}/uploads/${jobID}/${INPUT_IMG_PATH}`

export const getSegmentImgUrl = (jobID) =>
    `${import.meta.env.API_BASE_URL}/uploads/${jobID}/${OUT_SEGMENT_PATH}`