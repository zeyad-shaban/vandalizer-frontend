# Vandalizer Frontend

React frontend for Vandalizer, an AI image editing app for detecting, masking, and removing or replacing objects in images.

[Live app](https://vandalizer-frontend.vercel.app/) | [Backend Space](https://huggingface.co/spaces/zeyadcode/vandalizer-backend) | [Demo video](https://youtu.be/dkpUaaLSOQU)

[![Watch the Vandalizer demo](https://img.youtube.com/vi/dkpUaaLSOQU/hqdefault.jpg)](https://youtu.be/dkpUaaLSOQU)

## Related Repositories

- [vandalizer-frontend](https://github.com/zeyad-shaban/vandalizer-frontend) - this React/Vite UI.
- [vandalizer-backend](https://github.com/zeyad-shaban/vandalizer-backend) - FastAPI, Celery, Redis, and model inference service.
- [vandalizer-ai-workspace](https://github.com/zeyad-shaban/vandalizer-ai-workspace) - research notebooks and model prototyping workspace.

## What It Does

The frontend lets a user upload an image, create an object mask, edit the mask manually, then generate a final edited image. It is built as a focused workspace rather than a marketing page: upload first, then edit.

Current workflow:

1. Upload an image and receive a backend job id.
2. Generate an automatic mask from a text prompt, such as `hat`, `bag`, or `sign`.
3. Switch to manual mode to paint, erase, or clear the mask.
4. Choose an inpainting mode:
   - `Blur` for privacy-style redaction.
   - `Remove` for object removal.
   - `Replace` for prompt-guided diffusion inpainting.
5. Download the result or reuse it as the input for a new edit.

## Tech Stack

- React 19
- Vite
- React Router
- Axios
- Tailwind CSS 4
- ESLint
- Vercel deployment

## Project Structure

```text
src/
  App.jsx                    Route setup for upload and edit screens
  main.jsx                   React entry point
  constants.js               Shared output filenames and inpainting modes
  errors.js                  API/browser error normalization
  services/
    api.js                   Axios client and backend endpoint wrappers
  hooks/
    useGetServerResult.js    Polling helper for async backend jobs
    useMaskGenerator.js      Prompt-based mask generation state
    useInpaintor.js          Inpainting job state
    useDetector.js           Detector endpoint state helper
    useSegmentor.js          Segmentation endpoint state helper
  components/
    ImageForm.jsx            Upload screen
    ImageDisplay.jsx         Main editing workspace
    Workspace.jsx            Uploaded image display surface
    ManualMaskCanvas.jsx     Canvas-based mask painting and export
    MaskOverlay.jsx          Server-generated visual mask overlay
    BoxesOverlay.jsx         Interactive bounding box overlay
    Loading.jsx              Loading indicator
    ErrorMessage.jsx         User-facing error display
```

## Backend Contract

The app reads `VITE_API_BASE_URL` and calls the backend over HTTP.

Important endpoints used by the UI:

- `POST /upload` - upload an image and create a job.
- `POST /process/generate_mask/{job_id}` - detect prompted objects and create a mask.
- `POST /api/upload-manual-mask` - upload a manually painted mask.
- `POST /process/inpaint/{job_id}` - generate the edited output.
- `GET /job_status/{job_id}` - poll Celery task state.
- `GET /uploads/{job_id}/...` - fetch input images, masks, boxes, and generated results.

The frontend expects the backend to write these files inside each job folder:

- `input_img.png`
- `detector_boxes.json`
- `segmentor_masks_bin.png`
- `segmentor_masks_visual.png`
- `inpainted.png`

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

To use the hosted backend instead:

```bash
VITE_API_BASE_URL=https://zeyadcode-vandalizer-backend.hf.space
```

Run the dev server:

```bash
npm run dev
```

The Vite server is configured to run on `http://localhost:3001`.

## Scripts

```bash
npm run dev      # Start local Vite dev server
npm run build    # Build production assets
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint
```

## Notes for Reviewers

This repository contains the browser experience only. The heavy model work is intentionally kept in the backend service, while the AI experimentation and model selection process live in the AI workspace repository.
