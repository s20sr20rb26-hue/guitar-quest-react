import { BarChart3, CalendarDays, Clock3, Guitar, MessageSquare, Star, Trash2 } from 'lucide-react';
import { SongArtwork } from '@/components/SongArtwork';
import { INITIAL_SONGS } from '@/data/songs';
import type { PracticeSession, QuestState } from '@/lib/quest';

interface HistoryTabProps {
  state: QuestState;
  onDeleteSession: (id: string) => void;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
}

function formatGroupDate(key: string, todayKey: string): string {
  if (key === todayKey) return '今日';
  const date = new Date(`${key}T00:00:00`);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

export function HistoryTab({ state, onDeleteSession }: HistoryTabProps) {
  const sessions = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const externalSongsById = new Map(
    state.livePlans.flatMap((plan) => plan.externalSongs).map((song) => [song.id, song])
  );
  const now = new Date();
  const todayKey = dateKey(now);

  const weeklyDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    const minutes = sessions
      .filter((session) => dateKey(new Date(session.date)) === key)
      .reduce((sum, session) => sum + session.durationMin, 0);
    return {
      key,
      day: date.getDate(),
      weekday: ['日', '月', '火', '水', '木', '金', '土'][date.getDay()],
      minutes,
      isToday: key === todayKey,
    };
  });

  const todayMinutes = weeklyDays[weeklyDays.length - 1]?.minutes ?? 0;
  const monthMinutes = sessions
    .filter((session) => {
      const date = new Date(session.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((sum, session) => sum + session.durationMin, 0);
  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMin, 0);
  const weekMinutes = weeklyDays.reduce((sum, day) => sum + day.minutes, 0);
  const maxDayMinutes = Math.max(30, ...weeklyDays.map((day) => day.minutes));

  const groupedSessions = sessions.reduce<Record<string, PracticeSession[]>>((groups, session) => {
    const key = dateKey(new Date(session.date));
    if (!groups[key]) groups[key] = [];
    groups[key].push(session);
    return groups;
  }, {});

  return (
    <div className="min-w-0 space-y-7">
      <section className="border-y border-zinc-900 py-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-400">Practice report</p>
            <h2 className="mt-1 text-2xl font-black text-white">練習レポート</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-500">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            直近7日 {formatDuration(weekMinutes)}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-zinc-800 border-y border-zinc-800 py-4 text-center">
          <div className="min-w-0 px-2">
            <p className="text-xs font-bold text-zinc-500">今日</p>
            <p className="mt-1 truncate text-xl font-black text-emerald-400 sm:text-2xl">{formatDuration(todayMinutes)}</p>
          </div>
          <div className="min-w-0 px-2">
            <p className="text-xs font-bold text-zinc-500">今月</p>
            <p className="mt-1 truncate text-xl font-black text-cyan-400 sm:text-2xl">{formatDuration(monthMinutes)}</p>
          </div>
          <div className="min-w-0 px-2">
            <p className="text-xs font-bold text-zinc-500">累計</p>
            <p className="mt-1 truncate text-xl font-black text-white sm:text-2xl">{formatDuration(totalMinutes)}</p>
          </div>
        </div>

        <div className="mt-5 grid h-36 grid-cols-7 gap-2 sm:gap-4" aria-label="直近7日間の練習時間">
          {weeklyDays.map((day) => {
            const height = day.minutes === 0 ? 4 : Math.max(10, Math.round((day.minutes / maxDayMinutes) * 100));
            return (
              <div key={day.key} className="grid min-w-0 grid-rows-[1fr_auto_auto] items-end justify-items-center gap-1">
                <div className="flex h-full w-full items-end justify-center">
                  <div
                    className={`w-full max-w-8 rounded-t-sm ${day.isToday ? 'bg-emerald-400' : 'bg-cyan-500/70'}`}
                    style={{ height: `${height}%` }}
                    title={`${day.weekday}${day.day}日 ${day.minutes}分`}
                  />
                </div>
                <span className={`text-xs font-bold ${day.isToday ? 'text-emerald-300' : 'text-zinc-500'}`}>{day.weekday}</span>
                <span className="text-xs text-zinc-700">{day.day}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-400">Timeline</p>
            <h2 className="mt-1 text-2xl font-black text-white">練習タイムライン</h2>
          </div>
          <span className="text-sm font-bold text-zinc-500">{sessions.length}件</span>
        </div>

        {sessions.length === 0 ? (
          <div className="border-y border-zinc-900 px-4 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-900 text-emerald-400">
              <Guitar className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-bold text-zinc-300">まだ練習記録がありません</p>
            <p className="mt-1 text-sm text-zinc-600">ホームやライブの「記録」から追加できます</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSessions).map(([key, daySessions]) => {
              const dayTotal = daySessions.reduce((sum, session) => sum + session.durationMin, 0);
              return (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-zinc-300">{formatGroupDate(key, todayKey)}</h3>
                    <span className="text-xs font-bold text-zinc-600">合計 {formatDuration(dayTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {daySessions.map((session) => {
                      const time = new Date(session.date);
                      const timeLabel = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
                      const databaseSong = INITIAL_SONGS.find((song) => song.No === session.songNo);
                      const externalSong = session.externalSongId ? externalSongsById.get(session.externalSongId) : undefined;
                      const isLivePractice = Boolean(session.livePlanId);
                      const artist = isLivePractice ? 'ライブ全体' : databaseSong?.アーティスト || externalSong?.artist || '';
                      return (
                        <article key={session.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-700">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-emerald-950 text-emerald-400">
                              {isLivePractice ? (
                                <CalendarDays className="h-5 w-5" />
                              ) : (
                                <SongArtwork
                                  title={session.songName}
                                  artist={artist}
                                  src={externalSong?.artworkUrl}
                                  fallback={<Guitar className="h-5 w-5" />}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-base font-black text-white">{session.songName}</p>
                                  <p className="mt-0.5 text-xs text-zinc-600">{timeLabel}</p>
                                </div>
                                <p className="shrink-0 text-xl font-black text-emerald-400">{formatDuration(session.durationMin)}</p>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {session.focus && (
                                  <span className="rounded-full bg-cyan-950 px-2.5 py-1 text-xs font-bold text-cyan-300">{session.focus}</span>
                                )}
                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                  <Star className="h-3.5 w-3.5 fill-current" />
                                  {session.rating}/5
                                </span>
                                <span className="flex items-center gap-1 text-xs text-zinc-600">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {isLivePractice ? 'ライブ練習' : '練習記録'}
                                </span>
                              </div>

                              {session.memo && (
                                <div className="mt-3 flex items-start gap-2 border-t border-zinc-900 pt-3">
                                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                                  <p className="text-sm leading-relaxed text-zinc-400">{session.memo}</p>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => onDeleteSession(session.id)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-red-950/50 hover:text-red-300"
                              title="削除"
                              aria-label={`${session.songName}の記録を削除`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
