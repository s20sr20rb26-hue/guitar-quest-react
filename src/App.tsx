import { useState, useEffect, useCallback } from 'react';
import { Guitar, Compass, Library, History, Sparkles, Gauge } from 'lucide-react';
import type { Song, AppTab } from '@/types';
import { INITIAL_SONGS } from '@/data/songs';
import {
  loadState,
  saveState,
  getAcquiredSkills,
  DEFAULT_SKILL_LEVELS,
  type QuestState,
  type PracticeSession,
} from '@/lib/quest';
import { StatsBar } from '@/components/StatsBar';
import { QuestTab } from '@/components/QuestTab';
import { CoursesTab } from '@/components/CoursesTab';
import { HistoryTab } from '@/components/HistoryTab';
import { LogSessionModal } from '@/components/LogSessionModal';
import { SkillsTab } from '@/components/SkillsTab';

const SONGS: Song[] = INITIAL_SONGS;

function App() {
  const [state, setState] = useState<QuestState>(() => loadState());
  const [tab, setTab] = useState<AppTab>('quest');
  const [logTarget, setLogTarget] = useState<Song | null>(null);

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

  const logSession = useCallback(
    (song: Song) => setLogTarget(song),
    []
  );

  const saveSession = useCallback(
    (durationMin: number, memo: string, rating: number) => {
      if (!logTarget) return;
      const session: PracticeSession = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toISOString(),
        songNo: logTarget.No,
        songName: logTarget.曲名,
        durationMin,
        memo,
        rating,
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

  const tabs: { key: AppTab; label: string; icon: typeof Compass }[] = [
    { key: 'quest', label: 'クエスト', icon: Compass },
    { key: 'courses', label: '曲リスト', icon: Library },
    { key: 'skills', label: 'スキル', icon: Gauge },
    { key: 'history', label: '履歴', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 pt-safe backdrop-blur-lg">
          <div className="mx-auto max-w-5xl px-4 py-2.5 sm:px-6 sm:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-900/30">
                  <Guitar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold leading-tight text-slate-100 sm:text-lg">
                    Guitar Quest
                  </h1>
                  <p className="hidden text-[10px] text-slate-500 sm:block sm:text-xs">ギター練習クエスト</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-amber-500/70" />
                <span className="font-semibold text-slate-400">{state.completedSongNos.length}</span>
                <span className="text-slate-600">/ {SONGS.length}</span>
              </div>
            </div>

            <nav className="mt-2 hidden gap-1 sm:flex">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'bg-amber-600/20 text-amber-400'
                      : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-8">
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
            />
          )}
          {tab === 'courses' && (
            <CoursesTab
              songs={SONGS}
              state={state}
              onToggleComplete={toggleComplete}
              onLogSession={logSession}
            />
          )}
          {tab === 'skills' && (
            <SkillsTab state={state} onUpdateSkill={updateSkill} onResetAll={resetAllSkills} />
          )}
          {tab === 'history' && (
            <HistoryTab state={state} onDeleteSession={deleteSession} />
          )}
        </main>

        <footer className="mx-auto hidden max-w-5xl px-6 pb-8 pt-4 sm:block">
          <p className="text-center text-xs text-slate-700">
            Guitar Quest — 練習記録はこの端末に保存されます
          </p>
        </footer>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/90 pb-safe backdrop-blur-lg sm:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
                tab === t.key ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              <t.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {logTarget && (
        <LogSessionModal
          song={logTarget}
          onClose={() => setLogTarget(null)}
          onSave={saveSession}
        />
      )}
    </div>
  );
}

export default App;
