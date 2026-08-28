import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Music2,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import type { Song } from '@/types';
import type { QuestState } from '@/lib/quest';
import { canPlaySong, getAcquiredSkills } from '@/lib/quest';
import {
  getAppHistoryState,
  pushAppHistoryView,
  returnFromAppHistoryView,
} from '@/lib/appHistory';

interface StatsBarProps {
  songs: Song[];
  state: QuestState;
  onSkillViewChange: (open: boolean) => void;
}

type SongListKey = 'completed' | 'playable';

function getSkillLevelLabel(level: number) {
  if (level >= 4) return '上級';
  if (level === 3) return '中級';
  if (level === 2) return '初級';
  return '入門';
}

export function StatsBar({ songs, state, onSkillViewChange }: StatsBarProps) {
  const [openList, setOpenList] = useState<SongListKey | null>(null);
  const [skillPageOpen, setSkillPageOpen] = useState(
    () => getAppHistoryState().guitarQuestView === 'record-skills',
  );
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const completedNos = new Set(state.completedSongNos);
  const completedSongs = songs.filter((song) => completedNos.has(song.No));
  const playableSongs = songs.filter((song) => canPlaySong(song, state.skillLevels).ok);
  const learnedSkills = Object.entries(state.skillLevels)
    .filter(([, level]) => level > 0)
    .map(([skill, level]) => ({
      skill,
      level,
      relatedSongs: completedSongs.filter((song) => getAcquiredSkills(song).includes(skill)),
    }))
    .sort(
      (a, b) =>
        b.level - a.level ||
        b.relatedSongs.length - a.relatedSongs.length ||
        a.skill.localeCompare(b.skill, 'ja'),
    );
  const selectedSkillData = learnedSkills.find(({ skill }) => skill === selectedSkill);
  const total = songs.length;
  const totalMin = state.sessions.reduce((sum, session) => sum + session.durationMin, 0);
  const totalSessions = state.sessions.length;

  useEffect(() => {
    onSkillViewChange(skillPageOpen);
    return () => onSkillViewChange(false);
  }, [onSkillViewChange, skillPageOpen]);

  useEffect(() => {
    const handlePopState = () => {
      const isSkillPage = getAppHistoryState().guitarQuestView === 'record-skills';
      setSkillPageOpen(isSkillPage);
      if (!isSkillPage) setSelectedSkill(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSkillPage = () => {
    setOpenList(null);
    setSelectedSkill(null);
    pushAppHistoryView('record-skills');
    setSkillPageOpen(true);
  };

  const closeSkillPage = () => {
    setSkillPageOpen(false);
    setSelectedSkill(null);
    returnFromAppHistoryView('record-skills');
  };

  if (skillPageOpen) {
    return (
      <section className="mx-auto max-w-3xl">
        <header className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <button
            type="button"
            onClick={closeSkillPage}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
            aria-label="記録に戻る"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-black text-emerald-400">記録</p>
            <h2 className="truncate text-xl font-black text-white">身についたスキル</h2>
          </div>
        </header>

        <div className="flex items-center justify-between border-b border-zinc-900 py-5">
          <div>
            <p className="text-sm font-bold text-zinc-500">習得・登録済み</p>
            <p className="mt-1 text-2xl font-black text-white">{learnedSkills.length}個</p>
          </div>
          <BadgeCheck className="h-9 w-9 text-emerald-400" />
        </div>

        {learnedSkills.length === 0 ? (
          <div className="py-16 text-center">
            <BadgeCheck className="mx-auto h-9 w-9 text-zinc-800" />
            <p className="mt-4 text-base font-black text-zinc-400">身についたスキルはまだありません</p>
            <p className="mt-2 text-sm text-zinc-600">曲を習得すると、ここに追加されます</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {learnedSkills.map(({ skill, level, relatedSongs }) => {
              const selected = selectedSkill === skill;
              const displayLevel = Math.min(level, 4);

              return (
                <article key={skill}>
                  <button
                    type="button"
                    onClick={() => setSelectedSkill(selected ? null : skill)}
                    className="grid min-h-20 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-left"
                    aria-expanded={selected}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <h3 className="truncate text-base font-black text-zinc-100">{skill}</h3>
                        <span className="shrink-0 text-xs font-bold text-zinc-600">
                          {relatedSongs.length > 0 ? relatedSongs.length + '曲' : '登録スキル'}
                        </span>
                      </div>
                      <div className="mt-2 flex max-w-52 gap-1" aria-label={'レベル' + level}>
                        {[1, 2, 3, 4].map((step) => (
                          <span
                            key={step}
                            className={
                              (step <= displayLevel ? 'bg-emerald-400' : 'bg-zinc-800') +
                              ' h-1.5 flex-1 rounded-full'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">Lv.{level}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-zinc-600">{getSkillLevelLabel(level)}</p>
                      </div>
                      <ChevronRight
                        className={
                          (selected ? 'rotate-90 text-zinc-300' : 'text-zinc-700') +
                          ' h-5 w-5 transition-transform'
                        }
                      />
                    </div>
                  </button>

                  {selected && (
                    <div className="pb-4">
                      {selectedSkillData && selectedSkillData.relatedSongs.length > 0 ? (
                        <div className="divide-y divide-zinc-900 border-l-2 border-emerald-500 pl-3">
                          {selectedSkillData.relatedSongs.map((song) => (
                            <div key={song.No} className="flex items-center gap-3 py-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-xs font-black text-zinc-500">
                                {song.No}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-zinc-100">{song.曲名}</p>
                                <p className="mt-0.5 truncate text-xs text-zinc-500">{song.アーティスト}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="border-l-2 border-zinc-800 py-3 pl-3 text-sm text-zinc-600">
                          初期スキルまたは手動で登録したスキルです
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  const stats = [
    {
      key: 'completed' as const,
      icon: Award,
      label: '習得曲',
      value: String(completedSongs.length),
      sub: '/ ' + total,
      color: 'text-emerald-400',
    },
    {
      key: 'playable' as const,
      icon: Zap,
      label: '演奏可能',
      value: String(playableSongs.length),
      sub: '曲',
      color: 'text-amber-400',
    },
    {
      icon: Target,
      label: '練習回数',
      value: String(totalSessions),
      sub: '回',
      color: 'text-sky-400',
    },
    {
      icon: TrendingUp,
      label: '練習時間',
      value: Math.floor(totalMin / 60) + 'h',
      sub: totalMin % 60 + 'm',
      color: 'text-violet-400',
    },
  ];

  const listSongs = openList === 'completed' ? completedSongs : playableSongs;
  const listTitle = openList === 'completed' ? '習得曲' : '演奏可能曲';
  const listColor = openList === 'completed' ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          const listKey: SongListKey | null = 'key' in stat && stat.key ? stat.key : null;
          const selected = listKey !== null && openList === listKey;
          const content = (
            <>
              <div className="mb-1 flex items-center gap-1.5">
                <stat.icon className={'h-4 w-4 ' + stat.color} />
                <span className="text-[11px] font-medium text-slate-500">{stat.label}</span>
                {listKey && (
                  <ChevronDown
                    className={
                      'ml-auto h-3.5 w-3.5 text-slate-600 transition-transform ' +
                      (selected ? 'rotate-180' : '')
                    }
                  />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={'text-xl font-bold sm:text-2xl ' + stat.color}>{stat.value}</span>
                <span className="text-xs text-slate-600">{stat.sub}</span>
              </div>
            </>
          );

          if (listKey) {
            return (
              <button
                key={stat.label}
                type="button"
                onClick={() => setOpenList(selected ? null : listKey)}
                className={
                  'min-h-20 rounded-xl border p-3 text-left transition sm:p-4 ' +
                  (selected
                    ? 'border-slate-600 bg-slate-800/80'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70')
                }
                aria-expanded={selected}
                aria-controls="record-song-list"
              >
                {content}
              </button>
            );
          }

          return (
            <div key={stat.label} className="min-h-20 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4">
              {content}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openSkillPage}
        className="mt-3 flex min-h-20 w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left transition hover:border-slate-700 hover:bg-slate-900/70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black text-slate-100">身についたスキル</span>
          <span className="mt-0.5 block text-sm text-slate-500">習得した技術と関連曲を確認</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-black text-emerald-400">{learnedSkills.length}</span>
          <span className="block text-[11px] font-bold text-slate-600">スキル</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-600" />
      </button>

      {openList && (
        <section id="record-song-list" className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="min-w-0">
              <h3 className={'text-base font-black ' + listColor}>{listTitle}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{listSongs.length}曲</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenList(null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-800 hover:text-white"
              aria-label="一覧を閉じる"
              title="一覧を閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {listSongs.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Music2 className="mx-auto h-7 w-7 text-slate-700" />
              <p className="mt-3 text-sm font-bold text-slate-400">
                {openList === 'completed' ? '習得済みの曲はまだありません' : '演奏可能な曲はまだありません'}
              </p>
            </div>
          ) : (
            <div className="max-h-[min(55vh,30rem)] divide-y divide-slate-900 overflow-y-auto overscroll-contain">
              {listSongs.map((song) => (
                <div key={song.No} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-3 py-3 sm:px-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-xs font-black text-slate-500">
                    {song.No}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-100 sm:text-base">{song.曲名}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{song.アーティスト}</p>
                  </div>
                  <div className="max-w-28 text-right">
                    <p className="truncate text-[11px] font-bold text-slate-400">{song.推奨ルート}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-600">{song.主スキル}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
