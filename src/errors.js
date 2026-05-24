export const createAppError = ({ title, message, detail } = {}) => ({
    title: title || "Something went wrong",
    message: message || "Please try again.",
    detail,
});

const stringifyDetail = (detail) => {
    if (!detail) return "";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
        return detail
            .map(item => item?.msg || item?.message || JSON.stringify(item))
            .join(" ");
    }
    if (typeof detail === "object") {
        return detail.message || detail.error || JSON.stringify(detail);
    }
    return String(detail);
};

export const normalizeError = (err, fallback = {}) => {
    if (!err) return null;

    if (typeof err === "string") {
        return createAppError({
            title: fallback.title,
            message: err,
            detail: fallback.detail,
        });
    }

    if (err.title && err.message) {
        return createAppError({
            title: err.title || fallback.title,
            message: err.message || fallback.message,
            detail: err.detail || fallback.detail,
        });
    }

    if (err.response) {
        const status = err.response.status;
        const apiDetail = stringifyDetail(err.response.data?.detail || err.response.data);
        const statusCopy = {
            400: "The request was not accepted by the server.",
            404: "That result is not available. It may still be processing or the job may have expired.",
            413: "That image is too large for the server to accept.",
            422: "The server could not use this input.",
        };

        return createAppError({
            title: fallback.title || `Request failed (${status})`,
            message: fallback.message || statusCopy[status] || (
                status >= 500
                    ? "The backend hit an internal error while processing this step."
                    : "The backend rejected this request."
            ),
            detail: apiDetail || fallback.detail,
        });
    }

    if (err.request) {
        return createAppError({
            title: fallback.title || "Backend unavailable",
            message: "The backend did not respond. Check that the API server is running and try again.",
            detail: fallback.detail || fallback.message,
        });
    }

    return createAppError({
        title: fallback.title,
        message: fallback.message || err.message || "Please try again.",
        detail: fallback.detail,
    });
};
