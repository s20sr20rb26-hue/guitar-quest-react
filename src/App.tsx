import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Download, Guitar, History, Library, ListMusic, LogOut, MoreVertical, Share2, Sparkles, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
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
import { AuthScreen } from '@/components/AuthScreen';
import { PasswordResetScreen } from '@/components/PasswordResetScreen';
import { TimelineTab } from '@/components/TimelineTab';
import { ProfileModal } from '@/components/ProfileModal';
import { supabase } from '@/lib/supabase';
import {
  createPracticePost,
  deletePracticePost,
  deleteProfileAvatar,
  getProfile,
  updateProfile,
  uploadProfileAvatar,
  type Profile,
} from '@/lib/social';

const SONGS: Song[] = INITIAL_SONGS;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function App() {
  const [state, setState] = useState<QuestState>(() => loadState());
  const [tab, setTab] = useState<AppTab>('timeline');
  const [logTarget, setLogTarget] = useState<PracticeTarget | null>(null);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [timelineThreadOpen, setTimelineThreadOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [timelineRefreshToken, setTimelineRefreshToken] = useState(0);
  const [shareNotice, setShareNotice] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const activeLivePlan = state.livePlans.find(
    (plan) => plan.id === state.activeLivePlanId && !plan.archivedAt
  ) ?? null;

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthSession(data.session);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setAuthSession(nextSession);
      setAuthLoading(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (!nextSession) setProfile(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authSession) return;
    let mounted = true;
    void getProfile(authSession.user.id)
      .then((nextProfile) => {
        if (mounted) setProfile(nextProfile);
      })
      .catch(() => {
        if (!mounted) return;
        setProfile({
          id: authSession.user.id,
          username: String(authSession.user.user_metadata.username || authSession.user.email?.split('@')[0] || 'ギタリスト'),
        });
      });
    return () => {
      mounted = false;
    };
  }, [authSession]);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = window.setTimeout(() => setShareNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  useEffect(() => {
    if (!authSession) return;
    const navigatorWithStandalone = navigator as NavigatorWithStandalone;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
    const iosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIosDevice(iosDevice);

    if (standalone) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstallPrompt(false);
    };
    const timer = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem('guitar-quest-install-prompt-seen') !== '1') {
          setShowInstallPrompt(true);
        }
      } catch {
        setShowInstallPrompt(true);
      }
    }, 900);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [authSession]);

  const dismissInstallPrompt = useCallback(() => {
    try {
      sessionStorage.setItem('guitar-quest-install-prompt-seen', '1');
    } catch {
      // ignore
    }
    setShowInstallPrompt(false);
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    dismissInstallPrompt();
  }, [dismissInstallPrompt, installPrompt]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setTab('timeline');
  }, []);

  const saveProfile = useCallback(async (username: string, avatarFile?: File, removeAvatar = false) => {
    if (!authSession) return;
    let avatarUrl = removeAvatar ? undefined : profile?.avatarUrl;
    if (avatarFile) {
      avatarUrl = await uploadProfileAvatar(authSession.user.id, avatarFile);
    }
    const nextProfile = await updateProfile(authSession.user.id, username, avatarUrl);
    setProfile(nextProfile);
    setTimelineRefreshToken((current) => current + 1);
    if (removeAvatar) {
      await deleteProfileAvatar(authSession.user.id).catch(() => undefined);
    }
  }, [authSession, profile?.avatarUrl]);

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
      artworkUrl: song.artworkUrl,
    });
  }, []);

  const saveSession = useCallback(
    (durationMin: number, memo: string, rating: number, focus: string, practiceDate: string) => {
      if (!logTarget || !authSession) return;
      const now = new Date();
      const [year, month, day] = practiceDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
      const recordedAt = Number.isNaN(selectedDate.getTime()) ? now : selectedDate;
      const session: PracticeSession = {
        id: crypto.randomUUID(),
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

      void createPracticePost({
        id: session.id,
        userId: authSession.user.id,
        songName: logTarget.songName,
        artist: logTarget.artist,
        artworkUrl: logTarget.artworkUrl,
        durationMin,
        memo,
        focus,
        rating,
        practicedAt: session.date,
      })
        .then(() => {
          setShareNotice('練習記録をタイムラインに共有しました');
          setTimelineRefreshToken((value) => value + 1);
        })
        .catch(() => {
          setShareNotice('記録は保存しましたが、タイムラインへの共有に失敗しました');
        });
    },
    [authSession, logTarget]
  );

  const deleteSession = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
    }));
    if (authSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      void deletePracticePost(id, authSession.user.id).then(() => {
        setTimelineRefreshToken((value) => value + 1);
      }).catch(() => {
        setShareNotice('端末の記録は削除しましたが、共有記録の削除に失敗しました');
      });
    }
  }, [authSession]);

  const updateSkill = useCallback((skill: string, level: number) => {
    setState((prev) => ({
      ...prev,
      skillLevels: { ...prev.skillLevels, [skill]: level },
    }));
  }, []);

  const resetAllSkills = useCallback(() => {
    setState((prev) => ({ ...prev, skillLevels: { ...DEFAULT_SKILL_LEVELS } }));
  }, []);

  const tabs: { key: AppTab; label: string; icon: typeof Sparkles }[] = [
    { key: 'timeline', label: 'タイムライン', icon: ListMusic },
    { key: 'quest', label: 'クエスト', icon: Sparkles },
    { key: 'courses', label: '曲', icon: Library },
    { key: 'live', label: 'ライブ', icon: CalendarDays },
    { key: 'history', label: '記録', icon: History },
  ];

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm font-bold text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (passwordRecovery && authSession) {
    return <PasswordResetScreen onDone={() => setPasswordRecovery(false)} />;
  }

  if (!authSession) return <AuthScreen />;

  const displayName = profile?.username || String(authSession.user.user_metadata.username || authSession.user.email?.split('@')[0] || 'ギタリスト');
  const displayInitial = Array.from(displayName.trim())[0]?.toUpperCase() || 'G';

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="relative">
        {!(tab === 'timeline' && timelineThreadOpen) && <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/90 pt-safe backdrop-blur-xl">
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
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="hidden items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-400 lg:flex">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="font-black text-white">{state.completedSongNos.length}</span>
                  <span>/ {SONGS.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileEditor(true)}
                  className="flex min-w-0 items-center gap-2 rounded-full bg-zinc-900 py-1.5 pl-1.5 pr-2.5 hover:bg-zinc-800"
                  aria-label="プロフィールを編集"
                  title="プロフィールを編集"
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-black">{displayInitial}</span>
                  )}
                  <span className="hidden max-w-28 truncate text-sm font-black text-white sm:block">{displayName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900 hover:text-white"
                  aria-label="ログアウト"
                  title="ログアウト"
                >
                  <LogOut className="h-5 w-5" />
                </button>
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
        </header>}

        <main className="mx-auto max-w-6xl px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-10">
          {tab === 'history' && (
            <div className="mb-4 sm:mb-5">
              <StatsBar songs={SONGS} state={state} />
            </div>
          )}

          {tab === 'timeline' && (
            <TimelineTab
              currentUserId={authSession.user.id}
              refreshToken={timelineRefreshToken}
              onThreadViewChange={setTimelineThreadOpen}
            />
          )}

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

      {shareNotice && (
        <div className={`fixed left-1/2 top-4 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg px-4 py-3 text-center text-sm font-black shadow-xl ${shareNotice.includes('失敗') ? 'bg-red-950 text-red-100' : 'bg-emerald-500 text-black'}`} role="status">
          {shareNotice}
        </div>
      )}

      {showInstallPrompt && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
          <section
            className="w-full rounded-t-xl border border-zinc-800 bg-zinc-950 p-5 pb-safe shadow-2xl shadow-black sm:max-w-md sm:rounded-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-black">
                <Guitar className="h-7 w-7" />
              </div>
              <button
                type="button"
                onClick={dismissInstallPrompt}
                className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900 hover:text-white"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 id="install-app-title" className="mt-5 text-2xl font-black text-white">Guitar Questをアプリに</h2>
            <p className="mt-2 text-base leading-relaxed text-zinc-400">
              ホーム画面からすぐ開けて、ブラウザのバーなしで練習に集中できます。
            </p>

            {!installPrompt && (
              <div className="mt-5 flex items-start gap-3 rounded-lg bg-zinc-900 p-4">
                {isIosDevice ? (
                  <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <MoreVertical className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                )}
                <div>
                  <p className="text-sm font-black text-white">{isIosDevice ? 'iPhone・iPadで追加' : 'ブラウザから追加'}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    {isIosDevice
                      ? 'Safariの共有ボタンを押し、「ホーム画面に追加」を選びます。'
                      : 'ブラウザ右上のメニューから「アプリをインストール」を選びます。'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-2">
              {installPrompt && (
                <button
                  type="button"
                  onClick={installApp}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-black hover:bg-emerald-400"
                >
                  <Download className="h-5 w-5" />
                  アプリをダウンロード
                </button>
              )}
              <button
                type="button"
                onClick={dismissInstallPrompt}
                className="min-h-11 rounded-full px-5 text-sm font-black text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                {installPrompt ? 'あとで' : '閉じる'}
              </button>
            </div>
          </section>
        </div>
      )}

      {showProfileEditor && profile && (
        <ProfileModal
          profile={profile}
          email={authSession.user.email ?? ''}
          onClose={() => setShowProfileEditor(false)}
          onSave={saveProfile}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-black/95 pb-safe backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={(tab === t.key ? 'text-emerald-400' : 'text-zinc-500') + ' flex min-h-16 flex-col items-center justify-center gap-1 transition-colors'}
            >
              <t.icon className="h-6 w-6" />
              <span className="text-[11px] font-black">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {logTarget && <LogSessionModal song={logTarget} onClose={() => setLogTarget(null)} onSave={saveSession} />}
    </div>
  );
}

export default App;
