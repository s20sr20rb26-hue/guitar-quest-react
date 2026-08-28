import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import type { Song } from '@/types';
import type { QuestState } from '@/lib/quest';
import { ROUTE_OPTIONS, SKILL_CATEGORIES } from '@/data/songs';
import { SongCard } from '@/components/SongCard';

interface CoursesTabProps {
  songs: Song[];
  state: QuestState;
  onToggleComplete: (songNo: number) => void;
  onLogSession: (song: Song) => void;
}

export function CoursesTab({ songs, state, onToggleComplete, onLogSession }: CoursesTabProps) {
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [rootFilter, setRootFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [hideCompleted, setHideCompleted] = useState(false);

  const completed = useMemo(() => new Set(state.completedSongNos), [state.completedSongNos]);
  const rootOptions = useMemo(
    () => [...new Set(songs.map((song) => song.ルーツ).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja')),
    [songs],
  );

  const filtered = useMemo(() => {
    return songs.filter((song) => {
      if (hideCompleted && completed.has(song.No)) return false;
      if (routeFilter !== 'all' && song.推奨ルート !== routeFilter) return false;
      if (rootFilter !== 'all' && song.ルーツ !== rootFilter) return false;
      if (skillFilter !== 'all') {
        const category = SKILL_CATEGORIES.find((item) => item.key === skillFilter);
        if (category && category.keywords.length > 0) {
          const skills = [song.主スキル, song.必須スキル, song.習得スキル].join(' ');
          if (!category.keywords.some((keyword) => skills.includes(keyword))) return false;
        }
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const text = [song.曲名, song.アーティスト, song.推奨ルート, song.ルーツ, song.主スキル].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [songs, search, routeFilter, rootFilter, skillFilter, hideCompleted, completed]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-3 text-lg font-black text-slate-100">エチュード検索</h2>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="曲名、アーティスト、ルーツで検索..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="h-3.5 w-3.5" /> カテゴリ
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <FilterChip active={routeFilter === 'all'} onClick={() => setRouteFilter('all')} label="全部" />
            {ROUTE_OPTIONS.map((route) => (
              <FilterChip
                key={route}
                active={routeFilter === route}
                onClick={() => setRouteFilter(route)}
                label={route}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="h-3.5 w-3.5" /> ルーツ
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <FilterChip active={rootFilter === 'all'} onClick={() => setRootFilter('all')} label="全部" />
            {rootOptions.map((root) => (
              <FilterChip
                key={root}
                active={rootFilter === root}
                onClick={() => setRootFilter(root)}
                label={root}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="h-3.5 w-3.5" /> スキル
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {SKILL_CATEGORIES.map((category) => (
              <FilterChip
                key={category.key}
                active={skillFilter === category.key}
                onClick={() => setSkillFilter(category.key)}
                label={category.label}
              />
            ))}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-600 focus:ring-amber-600"
          />
          習得済みを隠す
        </label>
      </div>

      <div className="text-xs text-slate-500">{filtered.length}曲</div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((song) => (
          <SongCard
            key={song.No}
            song={song}
            completed={completed.has(song.No)}
            skillLevels={state.skillLevels}
            onToggleComplete={onToggleComplete}
            onLogSession={onLogSession}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-12 text-center">
          <p className="text-sm text-slate-500">該当する曲が見つかりませんでした</p>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-amber-600 text-white'
          : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60'
      }`}
    >
      {label}
    </button>
  );
}
