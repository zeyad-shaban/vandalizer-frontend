import axios from 'axios';
import { OUT_INPAINT_PATH, OUT_BBOXES_PATH, OUT_SEGMENT_PATH, OUT_SEGMENT_BIN_PATH, INPUT_IMG_PATH } from "@/constants"

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const apiClient = axios.create({ baseURL: API_BASE_URL });

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

export const startMaskGeneration = (jobID, prompt) => {
    const endpoint = `/process/generate_mask/${jobID}`;
    const data = new FormData();
    data.append('prompt', prompt);

    return apiClient.post(endpoint, data);
}

export const startSegmenting = (jobID, bboxes) => {
    const endpoint = `/process/segment_objects/${jobID}`;
    return apiClient.post(endpoint, { bboxes });
}

export const uploadManualMask = (jobID, maskBlob) => {
    const data = new FormData();
    data.append('job_id', jobID);
    data.append('mask', maskBlob, 'manual-mask.png');

    return apiClient.post('/api/upload-manual-mask', data);
}

export const startInpainting = (jobID, options) => {
    const endpoint = `/process/inpaint/${jobID}`;
    return apiClient.post(endpoint, {
        mode: options.mode,
        positive_prompt: options.positivePrompt || "",
        num_inference_steps: options.numInferenceSteps,
        strength: options.strength,
    });
}

export const fetchInpaintResult = jobID =>
    apiClient.get(`/uploads/${jobID}/${OUT_INPAINT_PATH}`, { responseType: 'blob' });

export const checkJobStatus = jobID =>
    apiClient.get(`/job_status/${jobID}`)


export const fetchBBoxes = jobID =>
    apiClient.get(`/uploads/${jobID}/${OUT_BBOXES_PATH}`);

export const fetchSegmentMasks = jobID =>
    apiClient.get(`/uploads/${jobID}/${OUT_SEGMENT_PATH}`, { responseType: 'blob' })

export const fetchSegmentBinaryMask = jobID =>
    apiClient.get(`/uploads/${jobID}/${OUT_SEGMENT_BIN_PATH}`, { responseType: 'blob' })


// just helpers
export const getInputImgUrl = (jobID) =>
    `${API_BASE_URL}/uploads/${jobID}/${INPUT_IMG_PATH}`

export const getSegmentImgUrl = (jobID) =>
    `${API_BASE_URL}/uploads/${jobID}/${OUT_SEGMENT_PATH}`

export const getSegmentBinaryImgUrl = (jobID) =>
    `${API_BASE_URL}/uploads/${jobID}/${OUT_SEGMENT_BIN_PATH}`

export const getInpaintImgUrl = (jobID) =>
    `${API_BASE_URL}/uploads/${jobID}/${OUT_INPAINT_PATH}`
