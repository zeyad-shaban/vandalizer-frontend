import axios from 'axios';

const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

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
    apiClient.get(`/uploads/${jobID}/${import.meta.env.VITE_OUT_INPAINT_PATH}`);

export const checkJobStatus = jobID =>
    apiClient.get(`/job_status/${jobID}`)


export const fetchBBoxes = jobID =>
    apiClient.get(`/uploads/${jobID}/${import.meta.env.VITE_OUT_BBOXES_PATH}`);

export const fetchSegmentMasks = jobID =>
    apiClient.get(`/uploads/${jobID}/${import.meta.env.VITE_OUT_SEGMENT_PATH}`)


// just helpers
export const getInputImgUrl = (jobID) =>
    `${import.meta.env.VITE_API_BASE_URL}/uploads/${jobID}/${import.meta.env.VITE_INPUT_IMG_PATH}`

export const getSegmentImgUrl = (jobID) =>
    `${import.meta.env.VITE_API_BASE_URL}/uploads/${jobID}/${import.meta.env.VITE_OUT_SEGMENT_PATH}`