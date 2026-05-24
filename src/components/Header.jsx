export const Header = () => {
    return (
        <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <a href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                    <h1 className="text-2xl font-bold text-slate-950">Vandalizer</h1>
                </a>
            </div>
        </header>
    )
}