import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  Clock3,
  ChevronRight,
  ExternalLink,
  Guitar,
  Link2,
  LoaderCircle,
  MoreVertical,
  Music2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Song } from '@/types';
import type { ExternalSong, LivePlan, PracticeSession } from '@/lib/quest';
import { SongArtwork } from '@/components/SongArtwork';
import {
  getAppHistoryState,
  pushAppHistoryView,
  returnFromAppHistoryView,
} from '@/lib/appHistory';

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  trackViewUrl: string;
  kind: string;
  artworkUrl100?: string;
}

interface ItunesSearchResponse {
  results: ItunesTrack[];
}

function searchItunesSongs(term: string): Promise<ItunesTrack[]> {
  return new Promise((resolve, reject) => {
    const callbackName = `guitarQuestItunes_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const callbackHost = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let timeoutId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      delete callbackHost[callbackName];
    };

    callbackHost[callbackName] = (response: ItunesSearchResponse) => {
      cleanup();
      resolve(
        response.results.filter(
          (track) =>
            track.kind === 'song' &&
            Boolean(track.trackId && track.trackName && track.artistName && track.trackViewUrl)
        )
      );
    };

    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('iTunesに接続できませんでした。'));
    };
    script.src = `https://itunes.apple.com/search?${new URLSearchParams({
      term,
      country: 'JP',
      media: 'music',
      entity: 'song',
      limit: '12',
      lang: 'ja_jp',
      callback: callbackName,
    }).toString()}`;

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('検索に時間がかかっています。もう一度試してください。'));
    }, 10000);

    document.body.appendChild(script);
  });
}

function formatLiveDate(value: string): string {
  if (!value) return '日付未定';
  const [year, month, day] = value.split('-');
  return `${year}.${month}.${day}`;
}

function formatPracticeDuration(minutes: number): string {
  if (minutes < 60) return minutes + '分';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + '時間' + rest + '分' : hours + '時間';
}

function getPlanMinutes(plan: LivePlan, sessions: PracticeSession[]): number {
  const externalSongIds = new Set(plan.externalSongs.map((song) => song.id));
  return sessions
    .filter(
      (session) =>
        session.livePlanId === plan.id ||
        plan.songNos.includes(session.songNo) ||
        Boolean(session.externalSongId && externalSongIds.has(session.externalSongId))
    )
    .reduce((sum, session) => sum + session.durationMin, 0);
}

interface LiveTabProps {
  songs: Song[];
  livePlans: LivePlan[];
  activeLivePlan: LivePlan | null;
  sessions: PracticeSession[];
  onSelectLivePlan: (id: string) => void;
  onCreateLivePlan: (title: string, date: string) => string;
  onUpdateLivePlan: (patch: Partial<LivePlan>) => void;
  onArchiveLivePlan: (id: string) => void;
  onRestoreLivePlan: (id: string) => void;
  onDeleteLivePlan: (id: string) => void;
  onRemoveLiveSong: (songNo: number) => void;
  onAddExternalSong: (title: string, artist: string, url: string, artworkUrl?: string, album?: string) => void;
  onRemoveExternalSong: (id: string) => void;
  onLogSession: (song: Song) => void;
  onLogExternalSession: (song: ExternalSong) => void;
  onLogLiveSession: (plan: LivePlan) => void;
  onDetailViewChange: (open: boolean) => void;
}

export function LiveTab({
  songs,
  livePlans,
  activeLivePlan: appActiveLivePlan,
  sessions,
  onSelectLivePlan,
  onCreateLivePlan,
  onUpdateLivePlan,
  onArchiveLivePlan,
  onRestoreLivePlan,
  onDeleteLivePlan,
  onRemoveLiveSong,
  onAddExternalSong,
  onRemoveExternalSong,
  onLogSession,
  onLogExternalSession,
  onLogLiveSession,
  onDetailViewChange,
}: LiveTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [detailPlanId, setDetailPlanId] = useState<string | null>(() => {
    const historyState = getAppHistoryState();
    return historyState.guitarQuestView === 'live-detail' && typeof historyState.livePlanId === 'string'
      ? historyState.livePlanId
      : null;
  });
  const [showPlaylistEditor, setShowPlaylistEditor] = useState(false);
  const [openSongMenu, setOpenSongMenu] = useState<string | null>(null);
  const [newLiveTitle, setNewLiveTitle] = useState('');
  const [newLiveDate, setNewLiveDate] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [externalArtist, setExternalArtist] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [itunesQuery, setItunesQuery] = useState('');
  const [itunesResults, setItunesResults] = useState<ItunesTrack[]>([]);
  const [itunesLoading, setItunesLoading] = useState(false);
  const [itunesError, setItunesError] = useState('');
  const [deleteArchiveId, setDeleteArchiveId] = useState<string | null>(null);

  const activeLives = useMemo(
    () => livePlans.filter((plan) => !plan.archivedAt),
    [livePlans]
  );
  const archivedLives = useMemo(
    () => livePlans
      .filter((plan) => Boolean(plan.archivedAt))
      .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')),
    [livePlans]
  );
  const activeLivePlan = detailPlanId
    ? livePlans.find((plan) => plan.id === detailPlanId) ?? appActiveLivePlan
    : null;
  const isArchived = Boolean(activeLivePlan?.archivedAt);
  const liveSongs = activeLivePlan
    ? activeLivePlan.songNos
        .map((no) => songs.find((song) => song.No === no))
        .filter((song): song is Song => Boolean(song))
    : [];
  const daysLeft = useMemo(() => {
    if (!activeLivePlan?.date) return null;
    const today = new Date();
    const liveDate = new Date(activeLivePlan.date + 'T00:00:00');
    return Math.ceil((liveDate.getTime() - today.getTime()) / 86400000);
  }, [activeLivePlan?.date]);
  const totalSongs = activeLivePlan ? liveSongs.length + activeLivePlan.externalSongs.length : 0;
  const totalMinutes = activeLivePlan ? getPlanMinutes(activeLivePlan, sessions) : 0;

  useEffect(() => {
    onDetailViewChange(Boolean(detailPlanId));
    return () => onDetailViewChange(false);
  }, [detailPlanId, onDetailViewChange]);

  useEffect(() => {
    const handlePopState = () => {
      const historyState = getAppHistoryState();
      const historyPlanId = historyState.livePlanId;
      if (historyState.guitarQuestView === 'live-detail' && typeof historyPlanId === 'string') {
        setDetailPlanId(historyPlanId);
      } else {
        setDetailPlanId(null);
        setShowPlaylistEditor(false);
        setOpenSongMenu(null);
        setDeleteArchiveId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openLiveDetail = (plan: LivePlan) => {
    if (!plan.archivedAt) onSelectLivePlan(plan.id);
    setShowPlaylistEditor(false);
    setOpenSongMenu(null);
    setDeleteArchiveId(null);
    pushAppHistoryView('live-detail', { livePlanId: plan.id });
    setDetailPlanId(plan.id);
  };

  const closeLiveDetail = () => {
    setDetailPlanId(null);
    setShowPlaylistEditor(false);
    setOpenSongMenu(null);
    setDeleteArchiveId(null);
    returnFromAppHistoryView('live-detail');
  };

  const createNewLive = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newLiveTitle.trim();
    if (!title) return;
    const newPlanId = onCreateLivePlan(title, newLiveDate);
    setNewLiveTitle('');
    setNewLiveDate('');
    setShowCreateForm(false);
    pushAppHistoryView('live-detail', { livePlanId: newPlanId });
    setDetailPlanId(newPlanId);
  };

  const addExternal = () => {
    if (!activeLivePlan || !externalTitle.trim() || !externalUrl.trim()) return;
    onAddExternalSong(externalTitle.trim(), externalArtist.trim(), externalUrl.trim());
    setExternalTitle('');
    setExternalArtist('');
    setExternalUrl('');
  };

  const searchItunes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = itunesQuery.trim();
    if (!query || itunesLoading || !activeLivePlan) return;

    setItunesLoading(true);
    setItunesError('');
    try {
      const results = await searchItunesSongs(query);
      setItunesResults(results);
      if (results.length === 0) setItunesError('曲が見つかりませんでした。');
    } catch (error) {
      setItunesResults([]);
      setItunesError(error instanceof Error ? error.message : '検索できませんでした。');
    } finally {
      setItunesLoading(false);
    }
  };

  const addItunesTrack = (track: ItunesTrack) => {
    onAddExternalSong(track.trackName, track.artistName, track.trackViewUrl, track.artworkUrl100, track.collectionName);
  };

  if (!activeLivePlan) {
    return (
      <div className="min-w-0 space-y-7 overflow-x-hidden">
        <section>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-emerald-400">ライブ</p>
              <h2 className="mt-1 text-2xl font-black text-white">ライブリスト</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-emerald-500 px-4 text-sm font-black text-black hover:bg-emerald-400"
            >
              {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCreateForm ? '閉じる' : 'プレイリスト作成'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={createNewLive} className="mt-5 grid gap-3 border-y border-zinc-800 py-5 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
              <input
                value={newLiveTitle}
                onChange={(event) => setNewLiveTitle(event.target.value)}
                placeholder="例：夏フェスライブ"
                autoFocus
                className="min-h-12 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-base text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
              />
              <input
                type="date"
                value={newLiveDate}
                onChange={(event) => setNewLiveDate(event.target.value)}
                className="min-h-12 min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-base text-white outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newLiveTitle.trim()}
                className="min-h-12 rounded-full bg-zinc-100 px-5 text-sm font-black text-black hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                作成して開く
              </button>
            </form>
          )}
        </section>

        <section aria-labelledby="upcoming-lives-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-emerald-400">UPCOMING</p>
              <h2 id="upcoming-lives-title" className="mt-1 text-xl font-black text-white">開催前のライブ</h2>
            </div>
            <span className="text-sm font-bold text-zinc-500">{activeLives.length}件</span>
          </div>

          {activeLives.length === 0 ? (
            <div className="border-y border-zinc-900 px-4 py-10 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-zinc-800" />
              <p className="mt-3 text-sm font-bold text-zinc-500">開催前のライブはありません</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 border-y border-zinc-900">
              {activeLives.map((plan) => {
                const songCount = plan.songNos.length + plan.externalSongs.length;
                const practiceMinutes = getPlanMinutes(plan, sessions);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => openLiveDetail(plan)}
                    className="grid min-h-20 w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left hover:bg-zinc-950"
                    aria-label={plan.title + 'を開く'}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400">
                      <CalendarDays className="h-6 w-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black text-white">{plan.title}</span>
                      <span className="mt-1 block truncate text-sm text-zinc-500">
                        {formatLiveDate(plan.date)} ・ {songCount}曲 ・ 練習 {formatPracticeDuration(practiceMinutes)}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-zinc-700" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="past-lives-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-zinc-600">ARCHIVE</p>
              <h2 id="past-lives-title" className="mt-1 text-xl font-black text-white">過去のライブ</h2>
            </div>
            <span className="text-sm font-bold text-zinc-500">{archivedLives.length}件</span>
          </div>

          {archivedLives.length === 0 ? (
            <div className="border-y border-zinc-900 px-4 py-10 text-center">
              <Archive className="mx-auto h-8 w-8 text-zinc-800" />
              <p className="mt-3 text-sm font-bold text-zinc-600">終了したライブがここに残ります</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900 border-y border-zinc-900">
              {archivedLives.map((plan) => {
                const songCount = plan.songNos.length + plan.externalSongs.length;
                const practiceMinutes = getPlanMinutes(plan, sessions);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => openLiveDetail(plan)}
                    className="grid min-h-20 w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left hover:bg-zinc-950"
                    aria-label={plan.title + 'を振り返る'}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
                      <Archive className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black text-zinc-200">{plan.title}</span>
                      <span className="mt-1 block truncate text-sm text-zinc-600">
                        {formatLiveDate(plan.date)} ・ {songCount}曲 ・ 練習 {formatPracticeDuration(practiceMinutes)}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-zinc-700" />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden sm:space-y-5">
      <header className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <button
          type="button"
          onClick={closeLiveDetail}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
          aria-label="ライブリストに戻る"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-black text-emerald-400">ライブリスト</p>
          <h2 className="truncate text-xl font-black text-white">{isArchived ? '過去のライブ' : 'ライブ詳細'}</h2>
        </div>
      </header>

      {activeLivePlan ? (
        <>
          <section className="min-w-0 overflow-hidden rounded-xl bg-gradient-to-b from-emerald-500/25 via-emerald-950/30 to-zinc-950 shadow-2xl shadow-black/40 sm:rounded-2xl">
            <div className="p-4 sm:p-6">
            <div className="min-w-0">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase text-emerald-300">{isArchived ? 'Past live' : 'Current live'}</p>
                  {!isArchived && (
                    <button
                      type="button"
                      onClick={() => setShowPlaylistEditor((current) => !current)}
                      aria-expanded={showPlaylistEditor}
                      aria-label={showPlaylistEditor ? 'ライブ編集を閉じる' : 'ライブを編集'}
                      className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-3 text-xs font-black text-zinc-200 hover:bg-zinc-800 hover:text-white"
                    >
                      {showPlaylistEditor ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      {showPlaylistEditor ? '閉じる' : '編集'}
                    </button>
                  )}
                </div>
                {!isArchived && showPlaylistEditor ? (
                  <input
                    value={activeLivePlan.title}
                    onChange={(event) => onUpdateLivePlan({ title: event.target.value })}
                    onBlur={(event) => onUpdateLivePlan({ title: event.target.value.trim() || '無題のライブ' })}
                    className="min-h-12 min-w-0 w-full rounded-lg border border-white/15 bg-black/20 px-3 text-2xl font-black leading-tight text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400 sm:text-4xl"
                    placeholder="〇〇ライブ"
                  />
                ) : (
                  <h2 className="min-w-0 break-words text-3xl font-black leading-tight text-white sm:text-5xl">
                    {activeLivePlan.title}
                  </h2>
                )}
                <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 text-sm text-zinc-300 sm:flex sm:flex-wrap">
                  {!isArchived && showPlaylistEditor ? (
                    <label className="col-span-2 flex min-w-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 sm:col-auto sm:rounded-full">
                      <CalendarDays className="h-4 w-4 text-emerald-300" />
                      <input
                        type="date"
                        value={activeLivePlan.date}
                        onChange={(event) => onUpdateLivePlan({ date: event.target.value })}
                        className="min-w-0 w-full bg-transparent text-zinc-100 outline-none sm:w-auto"
                      />
                    </label>
                  ) : (
                    <span className="col-span-2 flex min-w-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 sm:col-auto sm:rounded-full">
                      <CalendarDays className="h-4 w-4 text-emerald-300" />
                      {formatLiveDate(activeLivePlan.date)}
                    </span>
                  )}
                  <span className="rounded-lg bg-white/10 px-3 py-2 text-center sm:rounded-full">{totalSongs}曲</span>
                  <span className="rounded-lg bg-white/10 px-3 py-2 text-center sm:rounded-full">練習 {formatPracticeDuration(totalMinutes)}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {isArchived ? (
                <div className="rounded-xl bg-black/35 p-4 sm:min-w-48">
                  <p className="text-sm text-zinc-400">開催日</p>
                  <p className="mt-1 text-xl font-black text-white">{formatLiveDate(activeLivePlan.date)}</p>
                </div>
              ) : daysLeft !== null ? (
                <div className="rounded-xl bg-black/35 p-4 sm:min-w-48">
                  <p className="text-sm text-zinc-400">本番まで</p>
                  {daysLeft >= 0 ? (
                    <p className="text-4xl font-black text-white">{daysLeft}<span className="ml-1 text-base font-bold text-zinc-400">日</span></p>
                  ) : (
                    <p className="mt-1 text-base font-bold text-zinc-300">本番日を過ぎています</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">日付を入れると本番までの日数が表示されます。</p>
              )}

              {isArchived ? (
                <div className="grid gap-2 sm:flex sm:items-center">
                  <button
                    type="button"
                    onClick={() => onRestoreLivePlan(activeLivePlan.id)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-black text-black hover:bg-white"
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    このライブを復元
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteArchiveId(activeLivePlan.id)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-950 px-4 text-sm font-black text-red-300 hover:bg-red-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                    削除
                  </button>
                </div>
              ) : (
                <div className="grid gap-2 sm:flex sm:items-center">
                  <button
                    type="button"
                    onClick={() => onLogLiveSession(activeLivePlan)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-black hover:bg-emerald-400"
                  >
                    <Clock3 className="h-5 w-5" />
                    ライブ練習を記録
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlaylistEditor(false);
                      onArchiveLivePlan(activeLivePlan.id);
                    }}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-700 px-4 text-sm font-black text-zinc-200 hover:border-emerald-500 hover:text-white"
                  >
                    <Archive className="h-4 w-4" />
                    終了してアーカイブ
                  </button>
                </div>
              )}
            </div>

            {isArchived && deleteArchiveId === activeLivePlan.id && (
              <div className="mt-4 border-t border-red-950 bg-red-950/20 p-4">
                <p className="text-sm font-black text-red-200">このライブを削除しますか？</p>
                <p className="mt-1 text-xs text-zinc-500">練習記録は「記録」タブに残ります。</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteLivePlan(activeLivePlan.id);
                      closeLiveDetail();
                    }}
                    className="min-h-10 rounded-full bg-red-500 px-4 text-xs font-black text-white hover:bg-red-400"
                  >
                    削除する
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteArchiveId(null)}
                    className="min-h-10 rounded-full bg-zinc-800 px-4 text-xs font-black text-zinc-200 hover:bg-zinc-700"
                  >
                    やめる
                  </button>
                </div>
              </div>
            )}
            </div>

            <div className="min-w-0 overflow-hidden border-t border-white/5 px-3 pb-4 pt-3 sm:px-5 sm:pb-6 sm:pt-4">
            {totalSongs === 0 && (
              <div className="border-y border-zinc-900 px-4 py-10 text-center text-base text-zinc-500">
                {isArchived ? '曲は登録されていません。' : '「編集」から曲を登録できます。'}
              </div>
            )}

            {totalSongs > 0 && (
              <div className="divide-y divide-zinc-900">
                {liveSongs.map((song) => {
                  const menuKey = `database-${song.No}`;
                  const songSessions = sessions.filter((session) => session.songNo === song.No);
                  const minutes = songSessions.reduce((sum, session) => sum + session.durationMin, 0);
                  return (
                    <div key={song.No} className="relative">
                      <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 px-1 py-2.5 hover:bg-zinc-900/70 sm:px-2">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-emerald-950 text-emerald-400">
                          <SongArtwork
                            title={song.曲名}
                            artist={song.アーティスト}
                            fallback={<Guitar className="h-6 w-6" />}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-white">{song.曲名}</p>
                          <p className="truncate text-sm text-zinc-500">
                            {song.アーティスト} ・ {songSessions.length}回 ・ {minutes}分
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenSongMenu(openSongMenu === menuKey ? null : menuKey)}
                          className={(isArchived ? 'invisible pointer-events-none ' : '') + 'flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white'}
                          aria-label={`${song.曲名}のメニュー`}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </div>
                      {!isArchived && openSongMenu === menuKey && (
                        <div className="mb-2 ml-auto mr-1 w-52 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl shadow-black">
                          <button
                            type="button"
                            onClick={() => {
                              onLogSession(song);
                              setOpenSongMenu(null);
                            }}
                            className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-bold text-zinc-100 hover:bg-zinc-800"
                          >
                            <Guitar className="h-4 w-4 text-emerald-400" />
                            練習を記録
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveLiveSong(song.No);
                              setOpenSongMenu(null);
                            }}
                            className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-bold text-red-300 hover:bg-red-950/50"
                          >
                            <Trash2 className="h-4 w-4" />
                            リストから削除
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {activeLivePlan.externalSongs.map((song: ExternalSong) => {
                  const menuKey = `external-${song.id}`;
                  const songSessions = sessions.filter((session) => session.externalSongId === song.id);
                  const minutes = songSessions.reduce((sum, session) => sum + session.durationMin, 0);
                  return (
                    <div key={song.id} className="relative">
                      <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 px-1 py-2.5 hover:bg-zinc-900/70 sm:px-2">
                        <a href={song.url} target="_blank" rel="noopener noreferrer" className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-800 text-emerald-400" title="曲を開く">
                          <SongArtwork title={song.title} artist={song.artist} src={song.artworkUrl} />
                        </a>
                        <div className="min-w-0">
                          <a href={song.url} target="_blank" rel="noopener noreferrer" className="block truncate text-base font-bold text-white hover:text-emerald-300">
                            {song.title}
                          </a>
                          <p className="truncate text-sm text-zinc-500" title={song.album}>
                            {song.artist || '未設定'} ・ {songSessions.length}回 ・ {minutes}分
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenSongMenu(openSongMenu === menuKey ? null : menuKey)}
                          className={(isArchived ? 'invisible pointer-events-none ' : '') + 'flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white'}
                          aria-label={`${song.title}のメニュー`}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </div>
                      {!isArchived && openSongMenu === menuKey && (
                        <div className="mb-2 ml-auto mr-1 w-52 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl shadow-black">
                          <button
                            type="button"
                            onClick={() => {
                              onLogExternalSession(song);
                              setOpenSongMenu(null);
                            }}
                            className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-bold text-zinc-100 hover:bg-zinc-800"
                          >
                            <Guitar className="h-4 w-4 text-emerald-400" />
                            練習を記録
                          </button>
                          <a
                            href={song.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpenSongMenu(null)}
                            className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-zinc-100 hover:bg-zinc-800"
                          >
                            <ExternalLink className="h-4 w-4 text-zinc-400" />
                            曲を開く
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveExternalSong(song.id);
                              setOpenSongMenu(null);
                            }}
                            className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm font-bold text-red-300 hover:bg-red-950/50"
                          >
                            <Trash2 className="h-4 w-4" />
                            リストから削除
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </section>

          {!isArchived && showPlaylistEditor && (
            <>
              <section className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:rounded-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">iTunesで曲を検索</h2>
            </div>
            <form onSubmit={searchItunes} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={itunesQuery}
                onChange={(event) => setItunesQuery(event.target.value)}
                placeholder="曲名・アーティスト"
                autoComplete="off"
                className="min-h-12 w-full min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!itunesQuery.trim() || itunesLoading}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-black text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {itunesLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                検索
              </button>
            </form>

            {itunesError && <p className="mt-3 text-sm text-amber-300" role="status">{itunesError}</p>}

            {itunesResults.length > 0 && (
              <div className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
                {itunesResults.map((track) => {
                  const isAdded = activeLivePlan.externalSongs.some((song) => song.url === track.trackViewUrl);
                  return (
                    <div key={track.trackId} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 bg-zinc-950 px-3 py-3">
                      <a href={track.trackViewUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-800 text-emerald-400" title="Apple Musicで開く">
                        <SongArtwork
                          title={track.trackName}
                          artist={track.artistName}
                          src={track.artworkUrl100}
                          fallback={<Music2 className="h-5 w-5" />}
                        />
                      </a>
                      <div className="min-w-0">
                        <a href={track.trackViewUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-base font-bold text-white hover:text-emerald-300">
                          {track.trackName}
                        </a>
                        <p className="truncate text-sm text-zinc-500">{track.artistName} ・ {track.collectionName}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => addItunesTrack(track)}
                        className="flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-full bg-zinc-100 px-3 text-xs font-black text-black hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
                        aria-label={`${track.trackName}を追加`}
                      >
                        {isAdded ? '追加済み' : <><Plus className="h-4 w-4" /><span className="hidden sm:inline">追加</span></>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
              </section>

              <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:rounded-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">URLから追加</h2>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-3">
              <input value={externalTitle} onChange={(event) => setExternalTitle(event.target.value)} placeholder="曲名" className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-emerald-500" />
              <input value={externalArtist} onChange={(event) => setExternalArtist(event.target.value)} placeholder="アーティスト" className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-emerald-500" />
              <input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="Spotify / YouTube Music / Apple Music URL" className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-emerald-500" />
            </div>
            <button
              type="button"
              onClick={addExternal}
              disabled={!externalTitle.trim() || !externalUrl.trim()}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-black text-black hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              セットリストに追加
            </button>
              </section>
            </>
          )}
        </>
      ) : (
        <section className="border-y border-zinc-900 px-4 py-12 text-center">
          <Archive className="mx-auto h-9 w-9 text-zinc-700" />
          <h2 className="mt-3 text-xl font-black text-white">開催前のライブはありません</h2>
          <p className="mt-2 text-base text-zinc-500">新しいライブを作るか、過去のライブを復元できます。</p>
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-black hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
              ライブを作る
            </button>
          )}
        </section>
      )}

    </div>
  );
}
