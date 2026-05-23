export const ErrorMessage = ({ err }) => {
    if (err == null || err == "") return null

    return (
        <p>who gets an error in 2026 seriously? {err}</p>
    )
}