import { Compass, Target, Sparkles, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import type { Song } from '@/types';
import type { QuestState } from '@/lib/quest';
import { canPlaySong, getRequiredSkills, getAcquiredSkills } from '@/lib/quest';
import { ROUTE_OPTIONS } from '@/data/songs';
import { SongCard } from '@/components/SongCard';

interface QuestTabProps {
  songs: Song[];
  state: QuestState;
  onToggleComplete: (songNo: number) => void;
  onLogSession: (song: Song) => void;
  onSetGoal: (goal: string | null) => void;
}

export function QuestTab({ songs, state, onToggleComplete, onLogSession, onSetGoal }: QuestTabProps) {
  const completed = new Set(state.completedSongNos);

  const recommended = songs
    .filter((s) => !completed.has(s.No))
    .map((song) => {
      const { ok, missing } = canPlaySong(song, state.skillLevels);
      let score = 0;
      if (ok) score += 100;
      score -= missing.length * 15;
      score += song.エチュード適性 * 3;
      score += song.ジャンル定番度 * 2;
      score -= song.演奏難易度 * 2;
      if (state.currentGoal && song.推奨ルート === state.currentGoal) score += 20;
      return { song, score, ok, missing };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const routeCounts = ROUTE_OPTIONS.map((route) => {
    const routeSongs = songs.filter((s) => s.推奨ルート === route);
    const done = routeSongs.filter((s) => completed.has(s.No)).length;
    return { route, total: routeSongs.length, done };
  }).filter((r) => r.total > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-800/30 bg-gradient-to-br from-amber-950/30 to-slate-900/40 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Compass className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">今日のクエスト</h2>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-slate-400">
          あなたのスキルレベルと目標ルートに基づいて、今すぐ練習すべき曲を提案します。
        </p>

        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Target className="h-3.5 w-3.5" /> 目標ルート
          </label>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => onSetGoal(null)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                state.currentGoal === null
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              指定なし
            </button>
            {routeCounts.map(({ route, done, total }) => (
              <button
                key={route}
                onClick={() => onSetGoal(route)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  state.currentGoal === route
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {route} ({done}/{total})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">おすすめの次の曲</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommended.map(({ song, ok, missing }) => (
            <div key={song.No} className="relative">
              {!ok && (
                <div className="absolute -top-2 left-3 z-10 flex items-center gap-1 rounded-full bg-red-950/80 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  <Lock className="h-3 w-3" />
                  {missing.length}スキル不足
                </div>
              )}
              <SongCard
                song={song}
                completed={completed.has(song.No)}
                skillLevels={state.skillLevels}
                onToggleComplete={onToggleComplete}
                onLogSession={onLogSession}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ルート別進捗
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {routeCounts.map(({ route, done, total }) => {
            const pct = total > 0 ? (done / total) * 100 : 0;
            return (
              <div key={route} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">{route}</span>
                  <span className="text-xs text-slate-500">{done}/{total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 to-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
