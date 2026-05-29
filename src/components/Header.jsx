export const Header = () => {
    return (
        <header className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md">
            <div className="mx-auto max-w-6xl">

                <div className="flex items-center justify-between">

                    {/* Brand */}
                    <a
                        href="/"
                        className="flex flex-col transition-opacity hover:opacity-80"
                    >
                        <h1 className="text-2xl font-bold text-slate-950">
                            Vandalizer
                        </h1>

                        <p className="text-xs text-slate-500">
                            AI Image Editing Workspace
                        </p>
                    </a>

                </div>

            </div>
        </header>
    );
};