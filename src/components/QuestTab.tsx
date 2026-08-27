import { Compass, Disc3, Music2, RefreshCcw, Sparkles, Target } from 'lucide-react';
import type { Song } from '@/types';
import type { QuestState } from '@/lib/quest';
import { canPlaySong, getWeekProgress, recommendNextSongs } from '@/lib/quest';
import { ROUTE_OPTIONS } from '@/data/songs';
import { SongCard } from '@/components/SongCard';

interface QuestTabProps {
  songs: Song[];
  state: QuestState;
  onToggleComplete: (songNo: number) => void;
  onLogSession: (song: Song) => void;
  onSetGoal: (goal: string | null) => void;
  onSetFavoriteRoutes: (routes: string[]) => void;
  onSetWeeklySong: (songNo: number) => void;
}

const COURSE_COPY: Record<string, { title: string; desc: string }> = {
  '邦ロック定番': { title: '邦ロック突破コース', desc: 'ライブで使いやすいパワーコードと王道リフから固める。' },
  'J-pop': { title: 'J-pop伴奏コース', desc: '歌を支えるコード、ストローク、曲展開への反応を育てる。' },
  'けいおん': { title: 'けいおんバンドコース', desc: '楽しく曲数を増やしながら、バンド曲の体力を作る。' },
  'アニソン/ボカロ': { title: '高速チェンジコース', desc: '速い展開、歪み、リード気味のフレーズに慣れる。' },
  '洋楽ロック': { title: 'クラシックロックリフコース', desc: 'ギターらしいリフ、休符、ノリを体に入れる。' },
  'カッティング/ファンク': { title: 'グルーヴ強化コース', desc: '左手ミュートと16ビートで右手を育てる。' },
  'ブルース': { title: 'ブルース表現コース', desc: 'ペンタ、チョーキング、ニュアンスをじっくり磨く。' },
  '東京事変/オルタナ': { title: 'オルタナ/歌伴コース', desc: 'コードワーク、キメ、アンサンブルの精度を上げる。' },
  'R&B/フュージョン': { title: 'おしゃれコードコース', desc: 'テンション、セッション感、少し大人な響きへ進む。' },
  'ラウド': { title: 'ラウドリフコース', desc: 'ハイゲイン、ミュート、重いリフの安定感を作る。' },
  '未分類': { title: '自由練習コース', desc: '気になる曲から広く触って、自分の好みを探す。' },
};

const WEEK_TASKS = [
  '曲を聴いて構成をつかむ',
  'イントロかメインリフだけ弾く',
  'Aメロ/主なコード進行をゆっくり確認',
  'サビまたは一番好きな部分を練習',
  '苦手部分だけ短く反復',
  '通しで1回だけ挑戦',
  '録音して本番OK度をチェック',
];

export function QuestTab({
  songs,
  state,
  onToggleComplete,
  onLogSession,
  onSetGoal,
  onSetFavoriteRoutes,
  onSetWeeklySong,
}: QuestTabProps) {
  const completed = new Set(state.completedSongNos);
  const recommended = recommendNextSongs(songs, state, 6);
  const weeklySong = songs.find((song) => song.No === state.weeklySongNo) ?? recommended[0];
  const week = getWeekProgress(state.weekStartedAt);
  const selectedCourse = state.favoriteRoutes[0] ?? state.currentGoal ?? null;
  const courseCopy = selectedCourse ? COURSE_COPY[selectedCourse] : null;

  const routeCounts = ROUTE_OPTIONS.map((route) => {
    const routeSongs = songs.filter((s) => s.推奨ルート === route);
    const done = routeSongs.filter((s) => completed.has(s.No)).length;
    return { route, total: routeSongs.length, done };
  }).filter((r) => r.total > 0);

  if (state.favoriteRoutes.length === 0) {
    return (
      <div className="space-y-5">
        <section className="rounded-2xl bg-gradient-to-br from-emerald-500/30 via-zinc-900 to-black p-5 shadow-2xl shadow-black/40 sm:p-7">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Start your course</p>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">好きなジャンルから、最初のコースを決めよう。</h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-lg">毎日新曲ではなく、1週間に1曲。ライブで使える曲を増やすペースにします。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routeCounts.map(({ route, total }) => {
              const copy = COURSE_COPY[route] ?? { title: route, desc: '気になる曲から始めるコース。' };
              return (
                <button
                  key={route}
                  onClick={() => onSetFavoriteRoutes([route])}
                  className="min-h-36 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/70 hover:bg-emerald-400/10"
                >
                  <Disc3 className="mb-3 h-7 w-7 text-emerald-300" />
                  <p className="text-lg font-black text-white">{copy.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{copy.desc}</p>
                  <p className="mt-3 text-xs font-bold text-zinc-500">{total}曲から開始</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-500/25 via-zinc-900 to-black p-5 shadow-2xl shadow-black/40 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              <Sparkles className="h-4 w-4" /> Weekly quest
            </p>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">今週の1曲</h2>
            {courseCopy && <p className="mt-2 text-base font-bold text-zinc-300">{courseCopy.title}</p>}
          </div>
          <button
            onClick={() => {
              const next = recommended.find((song) => song.No !== weeklySong?.No) ?? recommended[0];
              if (next) onSetWeeklySong(next.No);
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-black text-black hover:bg-white"
          >
            <RefreshCcw className="h-4 w-4" /> 曲を変える
          </button>
        </div>

        {weeklySong && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_18rem]">
            <div className="rounded-xl bg-black/35 p-4">
              <p className="text-sm font-bold text-zinc-400">Day {week.day} / 7</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: String(week.percent) + '%' }} />
              </div>
              <p className="mt-4 text-lg font-black text-white">今日やること</p>
              <p className="mt-1 text-base text-zinc-300">{WEEK_TASKS[week.day - 1]}</p>
            </div>
            <div className="rounded-xl bg-emerald-400 p-4 text-black">
              <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Now practicing</p>
              <h3 className="mt-3 text-3xl font-black leading-tight">{weeklySong.曲名}</h3>
              <p className="mt-2 text-sm font-bold opacity-75">{weeklySong.アーティスト}</p>
              <button onClick={() => onLogSession(weeklySong)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-black text-white">
                <Music2 className="h-4 w-4" /> 練習を記録
              </button>
            </div>
          </div>
        )}
      </section>

      {weeklySong && (
        <SongCard
          song={weeklySong}
          completed={completed.has(weeklySong.No)}
          skillLevels={state.skillLevels}
          onToggleComplete={onToggleComplete}
          onLogSession={onLogSession}
        />
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-black text-white">コースを変える</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {routeCounts.map(({ route, done, total }) => (
            <button
              key={route}
              onClick={() => {
                onSetGoal(route);
                onSetFavoriteRoutes([route]);
              }}
              className={(selectedCourse === route ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-300') + ' shrink-0 rounded-full px-4 py-2 text-sm font-black'}
            >
              {route} {done}/{total}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Compass className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-black text-white">次に候補の曲</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommended.slice(0, 4).map((song) => {
            const { ok } = canPlaySong(song, state.skillLevels);
            return (
              <button key={song.No} onClick={() => onSetWeeklySong(song.No)} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-900">
                <div className={(ok ? 'bg-emerald-500' : 'bg-zinc-800') + ' flex h-12 w-12 items-center justify-center rounded-md text-sm font-black text-black'}>
                  {song.No}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{song.曲名}</p>
                  <p className="truncate text-sm text-zinc-500">{song.アーティスト}</p>
                </div>
                <span className="text-xs font-bold text-zinc-500">選ぶ</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
