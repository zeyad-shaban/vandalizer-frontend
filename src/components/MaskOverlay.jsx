import { useState } from "react";
import { getSegmentImgUrl } from "../services/api"

export const MaskOverlay = ({ jobID, show }) => {
    const [failed, setFailed] = useState(false);
    if (!show || failed) return null;

    return (
        <img
            src={getSegmentImgUrl(jobID)}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
                opacity: 0.6,      // Makes it semi-transparent
                zIndex: 5,         // Ensures it is above the base image
                objectFit: 'fill'  // Forces it to stretch exactly to the Workspace container
            }}
            onError={() => setFailed(true)}
        />
    )
}