import { getInputImgUrl } from "../services/api"


// todo dispaly score and textlabels
// todo make it render basd on the threshold
// hmm something i don't like i'm doing is how i hve to pass the boxes, scores, textLabels into this workspace, and to pass it later into BoxesOverlay, but i think pasing dims is fine? but idk...
// i think having a neted component pasing indicates there i something i can do better overall?

export default function Workspace({ jobID, onDimsChange, children }) {

  const onLoad = (e) => {
    const img = e.currentTarget;
    onDimsChange({ dw: img.clientWidth, dh: img.clientHeight, nw: img.naturalWidth, nh: img.naturalHeight });
  };

  return (
    <div className="relative inline-block">
      <img src={getInputImgUrl(jobID)} onLoad={onLoad} className="block max-w-full h-auto" alt="" />
      {children}
    </div>
  );
}
