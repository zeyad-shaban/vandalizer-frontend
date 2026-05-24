export const Header = () => {
    return (
        <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <h1 className="text-lg font-semibold text-slate-950">Vandalizer</h1>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    image workspace
                </span>
            </div>
        </header>
    )
}
