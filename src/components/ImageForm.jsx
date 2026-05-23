import { useState } from "react";
import { uploadImage } from "../services/api";
import { Loading } from "../components/Loading"
import { ErrorMessage } from "../components/ErrorMessage"

// todo dont' dispaly unless the app is healthy
export const ImageForm = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const handleFileChange = async e => {
        if (loading)
            return;

        setLoading(true);
        setErr(null);

        try {
            const res = await uploadImage(e.target.files[0]);
            onSuccess(res.data)
        } catch (err) {
            console.log(err)
            setErr("Failed to upload image, check developer console for details");
        } finally {
            setLoading(false);
        }
    }

    if (loading)
        return <Loading />
    if (err)
        return <ErrorMessage err={err} />

    return (
        <div>
            <input type='file' accept="image/*" onChange={handleFileChange} />
        </div>
    )
}