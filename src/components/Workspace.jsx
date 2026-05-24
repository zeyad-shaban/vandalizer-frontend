import { useState } from "react";
import { getInputImgUrl } from "../services/api"
import { ErrorMessage } from "./ErrorMessage";
import { Loading } from "./Loading";


// todo dispaly score and textlabels
// todo make it render basd on the threshold
// hmm something i don't like i'm doing is how i hve to pass the boxes, scores, textLabels into this workspace, and to pass it later into BoxesOverlay, but i think pasing dims is fine? but idk...
// i think having a neted component pasing indicates there i something i can do better overall?

export default function Workspace({ jobID, onDimsChange, children }) {
  const [imageLoad, setImageLoad] = useState({ jobID, status: "loading" });
  const imgState = imageLoad.jobID === jobID ? imageLoad.status : "loading";

  const onLoad = (e) => {
    const img = e.currentTarget;
    setImageLoad({ jobID, status: "ready" });
    onDimsChange?.({ dw: img.clientWidth, dh: img.clientHeight, nw: img.naturalWidth, nh: img.naturalHeight });
  };

  return (
    <div className="relative min-h-80 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
      {imgState === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <Loading title="Loading image" description="Fetching the uploaded file." />
        </div>
      ) : null}

      {imgState === "failed" ? (
        <div className="flex min-h-80 items-center justify-center p-6">
          <ErrorMessage
            err={{
              title: "Image unavailable",
              message: "The uploaded image could not be loaded. The job may have expired or the backend may be offline.",
            }}
          />
        </div>
      ) : (
        <img
          key={jobID}
          src={getInputImgUrl(jobID)}
          onLoad={onLoad}
          onError={() => setImageLoad({ jobID, status: "failed" })}
          className="block h-auto w-full"
          alt="Uploaded input"
        />
      )}

      {imgState === "ready" ? children : null}
    </div>
  );
}
