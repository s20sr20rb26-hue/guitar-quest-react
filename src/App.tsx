import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Guitar, History, Home, Library, Sparkles } from 'lucide-react';
import type { Song, AppTab } from '@/types';
import { INITIAL_SONGS } from '@/data/songs';
import {
  loadState,
  saveState,
  getAcquiredSkills,
  getServiceFromUrl,
  createLivePlan,
  DEFAULT_SKILL_LEVELS,
  type QuestState,
  type PracticeSession,
  type LivePlan,
  type ExternalSong,
  type PracticeTarget,
} from '@/lib/quest';
import { StatsBar } from '@/components/StatsBar';
import { QuestTab } from '@/components/QuestTab';
import { CoursesTab } from '@/components/CoursesTab';
import { HistoryTab } from '@/components/HistoryTab';
import { LogSessionModal } from '@/components/LogSessionModal';
import { SkillsTab } from '@/components/SkillsTab';
import { LiveTab } from '@/components/LiveTab';

const SONGS: Song[] = INITIAL_SONGS;

function App() {
  const [state, setState] = useState<QuestState>(() => loadState());
  const [tab, setTab] = useState<AppTab>('quest');
  const [logTarget, setLogTarget] = useState<PracticeTarget | null>(null);
  const activeLivePlan = state.livePlans.find(
    (plan) => plan.id === state.activeLivePlanId && !plan.archivedAt
  ) ?? null;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const toggleComplete = useCallback((songNo: number) => {
    setState((prev) => {
      const completed = new Set(prev.completedSongNos);
      if (completed.has(songNo)) {
        completed.delete(songNo);
      } else {
        completed.add(songNo);
        const song = SONGS.find((s) => s.No === songNo);
        if (song) {
          const acquired = getAcquiredSkills(song);
          const skillLevels = { ...prev.skillLevels };
          for (const skill of acquired) {
            skillLevels[skill] = (skillLevels[skill] ?? 0) + 1;
          }
          return { ...prev, completedSongNos: [...completed], skillLevels };
        }
      }
      return { ...prev, completedSongNos: [...completed] };
    });
  }, []);

  const setGoal = useCallback((goal: string | null) => {
    setState((prev) => ({ ...prev, currentGoal: goal }));
  }, []);

  const setFavoriteRoutes = useCallback((routes: string[]) => {
    setState((prev) => ({
      ...prev,
      favoriteRoutes: routes,
      currentGoal: routes[0] ?? prev.currentGoal,
      weeklySongNo: null,
      weekStartedAt: null,
    }));
  }, []);

  const setWeeklySong = useCallback((songNo: number) => {
    setState((prev) => ({ ...prev, weeklySongNo: songNo, weekStartedAt: new Date().toISOString() }));
  }, []);

  const selectLivePlan = useCallback((id: string) => {
    setState((prev) => {
      const plan = prev.livePlans.find((item) => item.id === id && !item.archivedAt);
      return plan ? { ...prev, activeLivePlanId: id } : prev;
    });
  }, []);

  const addLivePlan = useCallback((title: string, date: string) => {
    const livePlan = createLivePlan(title, date);
    setState((prev) => ({
      ...prev,
      livePlans: [livePlan, ...prev.livePlans],
      activeLivePlanId: livePlan.id,
    }));
  }, []);

  const updateLivePlan = useCallback((patch: Partial<LivePlan>) => {
    setState((prev) => {
      if (!prev.activeLivePlanId) return prev;
      return {
        ...prev,
        livePlans: prev.livePlans.map((plan) =>
          plan.id === prev.activeLivePlanId ? { ...plan, ...patch } : plan
        ),
      };
    });
  }, []);

  const archiveLivePlan = useCallback((id: string) => {
    setState((prev) => {
      const archivedAt = new Date().toISOString();
      const livePlans = prev.livePlans.map((plan) =>
        plan.id === id ? { ...plan, archivedAt } : plan
      );
      const nextLive = livePlans.find((plan) => !plan.archivedAt && plan.id !== id);
      return {
        ...prev,
        livePlans,
        activeLivePlanId: prev.activeLivePlanId === id ? nextLive?.id ?? null : prev.activeLivePlanId,
      };
    });
  }, []);

  const restoreLivePlan = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      livePlans: prev.livePlans.map((plan) =>
        plan.id === id ? { ...plan, archivedAt: undefined } : plan
      ),
      activeLivePlanId: id,
    }));
  }, []);

  const deleteLivePlan = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.livePlans.find((plan) => plan.id === id);
      if (!target?.archivedAt) return prev;
      return { ...prev, livePlans: prev.livePlans.filter((plan) => plan.id !== id) };
    });
  }, []);

  const removeLiveSong = useCallback((songNo: number) => {
    setState((prev) => {
      if (!prev.activeLivePlanId) return prev;
      return {
        ...prev,
        livePlans: prev.livePlans.map((plan) =>
          plan.id === prev.activeLivePlanId
            ? { ...plan, songNos: plan.songNos.filter((no) => no !== songNo) }
            : plan
        ),
      };
    });
  }, []);

  const addExternalSong = useCallback((title: string, artist: string, url: string, artworkUrl?: string, album?: string) => {
    setState((prev) => {
      if (!prev.activeLivePlanId) return prev;
      const externalSong: ExternalSong = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
        title,
        artist,
        url,
        service: getServiceFromUrl(url),
        artworkUrl,
        album,
      };
      return {
        ...prev,
        livePlans: prev.livePlans.map((plan) =>
          plan.id === prev.activeLivePlanId
            ? { ...plan, externalSongs: [...plan.externalSongs, externalSong] }
            : plan
        ),
      };
    });
  }, []);

  const removeExternalSong = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.activeLivePlanId) return prev;
      return {
        ...prev,
        livePlans: prev.livePlans.map((plan) =>
          plan.id === prev.activeLivePlanId
            ? { ...plan, externalSongs: plan.externalSongs.filter((song) => song.id !== id) }
            : plan
        ),
      };
    });
  }, []);

  const logSession = useCallback((song: Song) => {
    setLogTarget({ songNo: song.No, songName: song.曲名, artist: song.アーティスト });
  }, []);

  const logExternalSession = useCallback((song: ExternalSong) => {
    setLogTarget({
      songNo: 0,
      songName: song.title,
      artist: song.artist || '未設定',
      externalSongId: song.id,
    });
  }, []);

  const saveSession = useCallback(
    (durationMin: number, memo: string, rating: number, focus: string, practiceDate: string) => {
      if (!logTarget) return;
      const now = new Date();
      const [year, month, day] = practiceDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
      const recordedAt = Number.isNaN(selectedDate.getTime()) ? now : selectedDate;
      const session: PracticeSession = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
        date: recordedAt.toISOString(),
        songNo: logTarget.songNo,
        songName: logTarget.songName,
        externalSongId: logTarget.externalSongId,
        durationMin,
        memo,
        rating,
        focus,
      };
      setState((prev) => ({ ...prev, sessions: [session, ...prev.sessions] }));
      setLogTarget(null);
    },
    [logTarget]
  );

  const deleteSession = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
    }));
  }, []);

  const updateSkill = useCallback((skill: string, level: number) => {
    setState((prev) => ({
      ...prev,
      skillLevels: { ...prev.skillLevels, [skill]: level },
    }));
  }, []);

  const resetAllSkills = useCallback(() => {
    setState((prev) => ({ ...prev, skillLevels: { ...DEFAULT_SKILL_LEVELS } }));
  }, []);

  const tabs: { key: AppTab; label: string; icon: typeof Home }[] = [
    { key: 'quest', label: 'ホーム', icon: Home },
    { key: 'courses', label: '曲', icon: Library },
    { key: 'live', label: 'ライブ', icon: CalendarDays },
    { key: 'history', label: '記録', icon: History },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="relative">
        <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/90 pt-safe backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-black shadow-lg shadow-emerald-950/30">
                  <Guitar className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-black leading-tight text-white">Guitar Quest</h1>
                  <p className="truncate text-sm font-medium text-zinc-500">週1曲でライブに近づく練習アプリ</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="font-black text-white">{state.completedSongNos.length}</span>
                <span>/ {SONGS.length}</span>
              </div>
            </div>
            <nav className="mt-3 hidden gap-2 sm:flex">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={(tab === t.key ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white') + ' flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition-colors'}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-10">
          <div className="mb-4 sm:mb-5">
            <StatsBar songs={SONGS} state={state} />
          </div>

          {tab === 'quest' && (
            <QuestTab
              songs={SONGS}
              state={state}
              onToggleComplete={toggleComplete}
              onLogSession={logSession}
              onSetGoal={setGoal}
              onSetFavoriteRoutes={setFavoriteRoutes}
              onSetWeeklySong={setWeeklySong}
            />
          )}
          {tab === 'courses' && (
            <CoursesTab songs={SONGS} state={state} onToggleComplete={toggleComplete} onLogSession={logSession} />
          )}
          {tab === 'live' && (
            <LiveTab
              songs={SONGS}
              livePlans={state.livePlans}
              activeLivePlan={activeLivePlan}
              sessions={state.sessions}
              onSelectLivePlan={selectLivePlan}
              onCreateLivePlan={addLivePlan}
              onUpdateLivePlan={updateLivePlan}
              onArchiveLivePlan={archiveLivePlan}
              onRestoreLivePlan={restoreLivePlan}
              onDeleteLivePlan={deleteLivePlan}
              onRemoveLiveSong={removeLiveSong}
              onAddExternalSong={addExternalSong}
              onRemoveExternalSong={removeExternalSong}
              onLogSession={logSession}
              onLogExternalSession={logExternalSession}
            />
          )}
          {tab === 'skills' && <SkillsTab state={state} onUpdateSkill={updateSkill} onResetAll={resetAllSkills} />}
          {tab === 'history' && <HistoryTab state={state} onDeleteSession={deleteSession} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-black/95 pb-safe backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={(tab === t.key ? 'text-emerald-400' : 'text-zinc-500') + ' flex min-h-16 flex-col items-center justify-center gap-1 transition-colors'}
            >
              <t.icon className="h-6 w-6" />
              <span className="text-xs font-black">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {logTarget && <LogSessionModal song={logTarget} onClose={() => setLogTarget(null)} onSave={saveSession} />}
    </div>
  );
}

export default App;
