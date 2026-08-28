import { useState } from 'react';
import { Check, Disc3, Music2, RefreshCcw, Sparkles, Target } from 'lucide-react';
import type { Song } from '@/types';
import type { QuestState } from '@/lib/quest';
import { canPlaySong, getWeekProgress, recommendNextSongs } from '@/lib/quest';
import { ROUTE_OPTIONS, SKILL_CATEGORIES } from '@/data/songs';
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

type TechniqueOption = (typeof SKILL_CATEGORIES)[number];

const WEEK_TASKS = [
  '曲を聴いて構成をつかむ',
  'イントロかメインリフだけ弾く',
  'Aメロ/主なコード進行をゆっくり確認',
  'サビまたは一番好きな部分を練習',
  '苦手部分だけ短く反復',
  '通しで1回だけ挑戦',
  '録音して本番OK度をチェック',
];

function matchesTechnique(song: Song, option: TechniqueOption): boolean {
  const skillText = [song.主スキル, song.習得スキル, song.必須スキル].filter(Boolean).join('・');
  return option.key !== 'all' && option.keywords.some((keyword) => skillText.includes(keyword));
}

export function QuestTab({
  songs,
  state,
  onToggleComplete,
  onLogSession,
  onSetGoal,
  onSetFavoriteRoutes,
  onSetWeeklySong,
}: QuestTabProps) {
  const availableGenres = new Set(songs.map((song) => song.推奨ルート));
  const savedGenre = state.favoriteRoutes.find((genre) => availableGenres.has(genre))
    ?? (state.currentGoal && availableGenres.has(state.currentGoal) ? state.currentGoal : '');
  const weeklySong = songs.find((song) => song.No === state.weeklySongNo) ?? null;
  const [selectedTechnique, setSelectedTechnique] = useState(() => {
    if (!weeklySong) return '';
    return SKILL_CATEGORIES.find((option) => matchesTechnique(weeklySong, option))?.key ?? '';
  });
  const [selectedGenre, setSelectedGenre] = useState(weeklySong?.推奨ルート ?? savedGenre);
  const [choosingSong, setChoosingSong] = useState(() => !weeklySong);
  const [matchNotice, setMatchNotice] = useState('');
  const completed = new Set(state.completedSongNos);
  const techniqueOptions = SKILL_CATEGORIES.filter((option) => option.key !== 'all');
  const week = getWeekProgress(state.weekStartedAt);
  const showChooser = choosingSong || !weeklySong;

  const genreOptions = ROUTE_OPTIONS.map((genre) => ({
    genre,
    count: songs.filter((song) => song.推奨ルート === genre).length,
  })).filter(({ count }) => count > 0);

  const chooseWeeklySong = () => {
    const technique = techniqueOptions.find((option) => option.key === selectedTechnique);
    if (!technique || !selectedGenre) return;

    const genreSongs = songs.filter((song) => song.推奨ルート === selectedGenre);
    const exactMatches = genreSongs.filter((song) => matchesTechnique(song, technique));
    const candidates = exactMatches.length > 0 ? exactMatches : genreSongs;
    const recommendationState: QuestState = {
      ...state,
      currentGoal: selectedGenre,
      favoriteRoutes: [selectedGenre],
    };
    const ranked = recommendNextSongs(candidates, recommendationState, candidates.length);
    const playableFirst = [
      ...ranked.filter((song) => canPlaySong(song, state.skillLevels).ok),
      ...ranked.filter((song) => !canPlaySong(song, state.skillLevels).ok),
    ];
    const nextSong = playableFirst.find((song) => song.No !== weeklySong?.No) ?? playableFirst[0];

    if (!nextSong) {
      setMatchNotice('この条件に合う曲がまだ登録されていません');
      return;
    }

    onSetGoal(selectedGenre);
    onSetFavoriteRoutes([selectedGenre]);
    onSetWeeklySong(nextSong.No);
    setMatchNotice(
      exactMatches.length > 0
        ? selectedGenre + ' × ' + technique.label + 'から選びました'
        : technique.label + 'の候補が少ないため、' + selectedGenre + 'から選びました',
    );
    setChoosingSong(false);
  };

  if (showChooser) {
    return (
      <div className="mx-auto max-w-4xl">
        <header className="mb-7">
          <p className="flex items-center gap-2 text-xs font-black text-emerald-400">
            <Sparkles className="h-4 w-4" />
            WEEKLY QUEST
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-5xl">今週の1曲を選ぶ</h2>
        </header>

        <section aria-labelledby="technique-question">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" />
            <h3 id="technique-question" className="text-xl font-black text-white">身につけたい奏法は？</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {techniqueOptions.map((option) => {
              const selected = selectedTechnique === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedTechnique(option.key)}
                  className={
                    (selected
                      ? 'border-emerald-400 bg-emerald-500 text-black'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600') +
                    ' flex min-h-14 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm font-black transition-colors'
                  }
                  aria-pressed={selected}
                >
                  <span>{option.label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 border-t border-zinc-900 pt-7" aria-labelledby="genre-question">
          <div className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-emerald-400" />
            <h3 id="genre-question" className="text-xl font-black text-white">やりたいジャンルは？</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {genreOptions.map(({ genre, count }) => {
              const selected = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={
                    (selected
                      ? 'border-emerald-400 bg-emerald-500 text-black'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600') +
                    ' flex min-h-16 items-center justify-between gap-2 rounded-lg border px-3 text-left transition-colors'
                  }
                  aria-pressed={selected}
                >
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-black">{genre}</span>
                    <span className={'mt-1 block text-xs font-bold ' + (selected ? 'text-black/60' : 'text-zinc-600')}>
                      {count}曲
                    </span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        {matchNotice && (
          <p className="mt-5 rounded-lg bg-amber-950/50 px-4 py-3 text-sm font-bold text-amber-200" role="status">
            {matchNotice}
          </p>
        )}

        <button
          type="button"
          onClick={chooseWeeklySong}
          disabled={!selectedTechnique || !selectedGenre}
          className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-base font-black text-black hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          <Sparkles className="h-5 w-5" />
          この条件で曲を提案
        </button>

        {weeklySong && (
          <button
            type="button"
            onClick={() => setChoosingSong(false)}
            className="mx-auto mt-3 block min-h-11 px-4 text-sm font-black text-zinc-500 hover:text-white"
          >
            今週の曲に戻る
          </button>
        )}
      </div>
    );
  }

  const weeklyPlayable = weeklySong ? canPlaySong(weeklySong, state.skillLevels).ok : false;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-500/25 via-zinc-900 to-black p-5 shadow-2xl shadow-black/40 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-xs font-black text-emerald-300">
              <Sparkles className="h-4 w-4" />
              WEEKLY QUEST
            </p>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">今週の1曲</h2>
            <p className="mt-2 text-sm font-bold text-zinc-400">
              {weeklySong.推奨ルート} ・ {weeklySong.主スキル}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMatchNotice('');
              setChoosingSong(true);
            }}
            className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-black text-black hover:bg-white"
          >
            <RefreshCcw className="h-4 w-4" />
            条件を選び直す
          </button>
        </div>

        {matchNotice && (
          <p className="mt-5 text-sm font-bold text-emerald-200">{matchNotice}</p>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="rounded-xl bg-black/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-zinc-400">Day {week.day} / 7</p>
              <span className={'text-xs font-black ' + (weeklyPlayable ? 'text-emerald-300' : 'text-amber-300')}>
                {weeklyPlayable ? 'いまのスキルで挑戦可能' : '今週のチャレンジ曲'}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: String(week.percent) + '%' }} />
            </div>
            <p className="mt-4 text-lg font-black text-white">今日やること</p>
            <p className="mt-1 text-base text-zinc-300">{WEEK_TASKS[week.day - 1]}</p>
          </div>
          <div className="rounded-xl bg-emerald-400 p-4 text-black">
            <p className="text-xs font-black opacity-70">NOW PRACTICING</p>
            <h3 className="mt-3 text-3xl font-black leading-tight">{weeklySong.曲名}</h3>
            <p className="mt-2 text-sm font-bold opacity-75">{weeklySong.アーティスト}</p>
            <button
              type="button"
              onClick={() => onLogSession(weeklySong)}
              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-black text-white"
            >
              <Music2 className="h-4 w-4" />
              練習を記録
            </button>
          </div>
        </div>
      </section>

      <SongCard
        song={weeklySong}
        completed={completed.has(weeklySong.No)}
        skillLevels={state.skillLevels}
        onToggleComplete={onToggleComplete}
        onLogSession={onLogSession}
      />

      <button
        type="button"
        onClick={chooseWeeklySong}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-zinc-800 text-sm font-black text-zinc-300 hover:border-emerald-500 hover:text-white"
      >
        <RefreshCcw className="h-4 w-4" />
        同じ条件で別の曲を提案
      </button>
    </div>
  );
}
