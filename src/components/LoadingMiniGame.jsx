import { useEffect, useState } from "react";

export const LoadingMiniGame = ({ active }) => {
    const [pos, setPos] = useState({ x: 50, y: 50 });
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (!active) return;

        const interval = setInterval(() => {
            setPos({
                x: Math.random() * 80 + 10,
                y: Math.random() * 60 + 20,
            });
        }, 800);

        return () => clearInterval(interval);
    }, [active]);

    if (!active) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-50">
            <div className="relative h-44 w-72 rounded-xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
                <p className="absolute top-2 left-2 text-xs text-slate-500">
                    Loading... Click the dot 🎯
                </p>

                <p className="absolute top-2 right-2 text-xs font-bold text-white bg-rose-500/90 px-2 py-1 rounded-md shadow-md">
                    Score: {score}
                </p>

                <div
                    onClick={() => setScore(score + 1)}
                    className="absolute h-4 w-4 rounded-full bg-rose-500 cursor-pointer transition-all duration-300"
                    style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                    }}
                />
            </div>
        </div>
    );
};