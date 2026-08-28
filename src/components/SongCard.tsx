import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, ExternalLink, Star, Flame, Target, Music2, Lock } from 'lucide-react';
import type { Song } from '@/types';
import { canPlaySong, getRequiredSkills, getAcquiredSkills } from '@/lib/quest';

interface SongCardProps {
  song: Song;
  completed: boolean;
  skillLevels: Record<string, number>;
  onToggleComplete: (songNo: number) => void;
  onLogSession: (song: Song) => void;
  variant?: 'default' | 'compact';
}

export function SongCard({ song, completed, skillLevels, onToggleComplete, onLogSession, variant = 'default' }: SongCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { ok, missing } = canPlaySong(song, skillLevels);

  const difficultyDots = Array.from({ length: 8 }, (_, i) => i < song.演奏難易度);
  const hasDetails = Boolean(
    song.練習ポイント || song.壁 || song.必須スキル || song.習得スキル || song.次候補 || song.参考動画URL,
  );

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        completed
          ? 'border-emerald-700/40 bg-emerald-950/30'
          : ok
            ? 'border-slate-700/60 bg-slate-900/40 hover:border-amber-600/50 hover:bg-slate-800/50'
            : 'border-slate-800/60 bg-slate-900/20'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">No.{song.No}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                song.推奨ルート === '未分類'
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-amber-950/60 text-amber-400/90'
              }`}>
                {song.推奨ルート}
              </span>
            </div>
            <h3 className="truncate text-base font-bold text-slate-100 sm:text-lg">{song.曲名}</h3>
            <p className="mt-0.5 truncate text-sm text-slate-400">{song.アーティスト}</p>
          </div>

          <button
            onClick={() => onToggleComplete(song.No)}
            className={`shrink-0 rounded-full p-1.5 transition-all ${
              completed
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-slate-600 hover:text-amber-400'
            }`}
            title={completed ? '習得済み' : '習得マーク'}
          >
            {completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">難易度</span>
            <div className="flex gap-0.5">
              {difficultyDots.map((filled, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-2.5 rounded-full sm:w-3 ${filled ? 'bg-amber-500' : 'bg-slate-700'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 text-amber-500/70" />
            <span className="text-slate-400">適性 {song.エチュード適性}</span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Flame className="h-3.5 w-3.5 text-orange-500/70" />
            <span className="text-slate-400">定番 {song.ジャンル定番度}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {song.ルーツ && (
            <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-amber-300/80">
              {song.ルーツ}
            </span>
          )}
          {song.主スキル && (
            <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-sky-300/80">
              {song.主スキル}
            </span>
          )}
          {!ok && missing.length > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-red-950/40 px-2 py-0.5 text-[11px] font-medium text-red-400/80">
              <Lock className="h-3 w-3" />
              {missing.length}スキル不足
            </span>
          )}
        </div>

        {song.一言説明 && <p className="mt-3 text-sm leading-relaxed text-slate-400">{song.一言説明}</p>}

        {variant === 'default' && (
          <>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onLogSession(song)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-600/30"
              >
                <Music2 className="h-3.5 w-3.5" />
                練習記録
              </button>
              {song.参考動画URL && (
                <a
                  href={song.参考動画URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700/60"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  参考動画
                </a>
              )}
              {hasDetails && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
                >
                  {expanded ? '閉じる' : '詳細'}
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {expanded && hasDetails && (
              <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Target className="h-3.5 w-3.5" /> 練習ポイント
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300">{song.練習ポイント}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-500">壁</p>
                  <p className="text-sm text-slate-300">{song.壁}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-red-400/70">必須スキル</p>
                    <div className="flex flex-wrap gap-1">
                      {getRequiredSkills(song).map((s) => {
                        const lv = skillLevels[s] ?? 0;
                        return (
                          <span key={s} className={`rounded px-1.5 py-0.5 text-[11px] ${lv > 0 ? 'bg-emerald-950/40 text-emerald-400/80' : 'bg-red-950/30 text-red-400/60'}`}>
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-emerald-400/70">習得スキル</p>
                    <div className="flex flex-wrap gap-1">
                      {getAcquiredSkills(song).map((s) => (
                        <span key={s} className="rounded bg-emerald-950/30 px-1.5 py-0.5 text-[11px] text-emerald-400/80">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {song.次候補 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">次の候補</p>
                    <p className="text-sm text-slate-300">{song.次候補}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
