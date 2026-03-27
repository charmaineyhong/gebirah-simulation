interface Props {
  currentDay: number;
  totalDays: number;
  isPlaying: boolean;
  speed: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (day: number) => void;
  onStop: () => void;
}

const SPEEDS = [1, 2, 5, 10];

export default function PlaybackControls({
  currentDay,
  totalDays,
  isPlaying,
  speed,
  onTogglePlay,
  onSpeedChange,
  onSeek,
  onStop,
}: Props) {
  const progress = totalDays > 0 ? (currentDay / totalDays) * 100 : 0;
  const isFinished = currentDay >= totalDays;

  return (
    <div className="panel p-4">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-500">
            Day {currentDay} / {totalDays}
          </span>
          <span className="text-xs font-mono text-slate-500">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          disabled={isFinished}
          className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-400 hover:bg-brand-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Speed buttons */}
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                speed === s
                  ? "bg-brand-500/20 text-brand-500 border border-brand-500/30"
                  : "text-slate-500 hover:text-zinc-800 border border-transparent"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Day scrubber */}
        <input
          type="range"
          min={0}
          max={totalDays}
          value={currentDay}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="flex-1 h-1 accent-brand-500 cursor-pointer"
        />

        {/* Stop & Exit */}
        <button
          onClick={onStop}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
