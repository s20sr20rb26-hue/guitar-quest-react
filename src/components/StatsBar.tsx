import { useState } from 'react';
import { Award, BadgeCheck, ChevronDown, Music2, Target, TrendingUp, X, Zap } from 'lucide-react';
import type { Song } from '@/types';
import type { QuestState } from '@/lib/quest';
import { canPlaySong, getAcquiredSkills } from '@/lib/quest';

interface StatsBarProps {
  songs: Song[];
  state: QuestState;
}

type SongListKey = 'completed' | 'playable';

function getSkillTone(level: number, selected: boolean) {
  if (selected) return 'border-emerald-400 bg-emerald-400 text-slate-950';
  if (level >= 4) return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (level >= 3) return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  if (level >= 2) return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

export function StatsBar({ songs, state }: StatsBarProps) {
  const [openList, setOpenList] = useState<SongListKey | null>(null);
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

  const stats = [
    {
      key: 'completed' as const,
      icon: Award,
      label: '習得曲',
      value: String(completedSongs.length),
      sub: `/ ${total}`,
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
      value: `${Math.floor(totalMin / 60)}h`,
      sub: `${totalMin % 60}m`,
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
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[11px] font-medium text-slate-500">{stat.label}</span>
                {listKey && (
                  <ChevronDown
                    className={`ml-auto h-3.5 w-3.5 text-slate-600 transition-transform ${selected ? 'rotate-180' : ''}`}
                  />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-bold sm:text-2xl ${stat.color}`}>{stat.value}</span>
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
                className={`min-h-20 rounded-xl border p-3 text-left transition sm:p-4 ${
                  selected
                    ? 'border-slate-600 bg-slate-800/80'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
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

      <section className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-100">身についたスキル</h3>
              <p className="mt-0.5 text-xs text-slate-500">スキルを押すと関連する習得曲を表示</p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold text-emerald-400">{learnedSkills.length}個</span>
        </div>

        {learnedSkills.length === 0 ? (
          <div className="mt-4 rounded-lg bg-slate-950/70 px-4 py-6 text-center">
            <p className="text-sm font-bold text-slate-400">曲を習得するとスキルが追加されます</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {learnedSkills.map(({ skill, level }) => {
              const selected = selectedSkill === skill;
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSelectedSkill(selected ? null : skill)}
                  className={'flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-left transition ' + getSkillTone(level, selected)}
                  aria-pressed={selected}
                >
                  <span className="text-sm font-bold">{skill}</span>
                  <span className={'text-[11px] font-black ' + (selected ? 'text-slate-900/70' : 'opacity-70')}>
                    Lv.{level}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selectedSkillData && (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="truncate text-sm font-black text-slate-200">{selectedSkillData.skill}を身につけた曲</h4>
              <span className="shrink-0 text-xs font-bold text-slate-500">{selectedSkillData.relatedSongs.length}曲</span>
            </div>

            {selectedSkillData.relatedSongs.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-950/70 px-3 py-4 text-sm text-slate-500">
                初期スキルまたは手動で登録したスキルです
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-800 overflow-hidden rounded-lg bg-slate-950/70">
                {selectedSkillData.relatedSongs.map((song) => (
                  <div key={song.No} className="flex items-center gap-3 px-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-black text-slate-500">
                      {song.No}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-100">{song.曲名}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{song.アーティスト}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {openList && (
        <section id="record-song-list" className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="min-w-0">
              <h3 className={`text-base font-black ${listColor}`}>{listTitle}</h3>
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
