import { useMemo, useState, type FormEvent } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Guitar,
  Link2,
  ListMusic,
  ListPlus,
  LoaderCircle,
  MoreVertical,
  Music2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Song } from '@/types';
import type { ExternalSong, LivePlan, PracticeSession } from '@/lib/quest';

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

function getPlanMinutes(plan: LivePlan, sessions: PracticeSession[]): number {
  const externalSongIds = new Set(plan.externalSongs.map((song) => song.id));
  return sessions
    .filter(
      (session) =>
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
  onCreateLivePlan: (title: string, date: string) => void;
  onUpdateLivePlan: (patch: Partial<LivePlan>) => void;
  onArchiveLivePlan: (id: string) => void;
  onRestoreLivePlan: (id: string) => void;
  onDeleteLivePlan: (id: string) => void;
  onRemoveLiveSong: (songNo: number) => void;
  onAddExternalSong: (title: string, artist: string, url: string, artworkUrl?: string, album?: string) => void;
  onRemoveExternalSong: (id: string) => void;
  onLogSession: (song: Song) => void;
  onLogExternalSession: (song: ExternalSong) => void;
}

export function LiveTab({
  songs,
  livePlans,
  activeLivePlan,
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
}: LiveTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
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
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
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

  const createNewLive = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newLiveTitle.trim();
    if (!title) return;
    onCreateLivePlan(title, newLiveDate);
    setNewLiveTitle('');
    setNewLiveDate('');
    setShowCreateForm(false);
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

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden sm:space-y-5">
      <section className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-400">Live manager</p>
            <h2 className="mt-1 text-xl font-black text-white">ライブを選ぶ</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-black text-black hover:bg-white"
          >
            {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreateForm ? '閉じる' : '新しいライブ'}
          </button>
        </div>

        {activeLives.length > 0 ? (
          <label className="mt-4 block">
            <span className="sr-only">開催前のライブ</span>
            <select
              value={activeLivePlan?.id ?? ''}
              onChange={(event) => onSelectLivePlan(event.target.value)}
              className="min-h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-base font-bold text-white outline-none focus:border-emerald-500"
            >
              {!activeLivePlan && <option value="">ライブを選択</option>}
              {activeLives.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} ・ {formatLiveDate(plan.date)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mt-4 text-base text-zinc-400">開催前のライブはありません。</p>
        )}

        {showCreateForm && (
          <form onSubmit={createNewLive} className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
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
              className="min-h-12 rounded-full bg-emerald-500 px-5 text-sm font-black text-black hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              作成
            </button>
          </form>
        )}
      </section>

      {activeLivePlan ? (
        <>
          <section className="min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/25 via-zinc-900 to-black p-4 shadow-2xl shadow-black/40 sm:rounded-2xl sm:p-6">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-bold uppercase text-emerald-300">Current live</p>
                <input
                  value={activeLivePlan.title}
                  onChange={(event) => onUpdateLivePlan({ title: event.target.value })}
                  onBlur={(event) => onUpdateLivePlan({ title: event.target.value.trim() || '無題のライブ' })}
                  className="min-w-0 w-full bg-transparent text-3xl font-black leading-tight text-white outline-none placeholder:text-zinc-600 sm:text-5xl"
                  placeholder="〇〇ライブ"
                />
                <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 text-sm text-zinc-300 sm:flex sm:flex-wrap">
                  <label className="col-span-2 flex min-w-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 sm:col-auto sm:rounded-full">
                    <CalendarDays className="h-4 w-4 text-emerald-300" />
                    <input
                      type="date"
                      value={activeLivePlan.date}
                      onChange={(event) => onUpdateLivePlan({ date: event.target.value })}
                      className="min-w-0 w-full bg-transparent text-zinc-100 outline-none sm:w-auto"
                    />
                  </label>
                  <span className="rounded-lg bg-white/10 px-3 py-2 text-center sm:rounded-full">{totalSongs}曲</span>
                  <span className="rounded-lg bg-white/10 px-3 py-2 text-center sm:rounded-full">練習 {totalMinutes}分</span>
                </div>
              </div>
              <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-black shadow-xl shadow-emerald-950/40 sm:flex">
                <ListMusic className="h-14 w-14" />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {daysLeft !== null ? (
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
              <button
                type="button"
                onClick={() => onArchiveLivePlan(activeLivePlan.id)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-700 px-4 text-sm font-black text-zinc-200 hover:border-emerald-500 hover:text-white"
              >
                <Archive className="h-4 w-4" />
                終了してアーカイブ
              </button>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden">
            <div className="mb-2 flex justify-end px-1">
              <button
                type="button"
                onClick={() => setShowPlaylistEditor((current) => !current)}
                aria-expanded={showPlaylistEditor}
                aria-label={showPlaylistEditor ? 'プレイリスト編集を閉じる' : 'プレイリストを編集・追加'}
                className="flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-3 text-xs font-black text-zinc-200 hover:bg-zinc-800 hover:text-white"
              >
                {showPlaylistEditor ? <X className="h-3.5 w-3.5" /> : <ListPlus className="h-3.5 w-3.5" />}
                {showPlaylistEditor ? '閉じる' : '編集・追加'}
              </button>
            </div>

            {totalSongs === 0 && (
              <div className="border-y border-zinc-900 px-4 py-10 text-center text-base text-zinc-500">
                「編集・追加」から曲を登録できます。
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
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-emerald-950 text-emerald-400">
                          <Guitar className="h-6 w-6" />
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
                          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white"
                          aria-label={`${song.曲名}のメニュー`}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </div>
                      {openSongMenu === menuKey && (
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
                          {song.artworkUrl ? (
                            <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <Music2 className="h-6 w-6" />
                          )}
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
                          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white"
                          aria-label={`${song.title}のメニュー`}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </div>
                      {openSongMenu === menuKey && (
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
          </section>

          {showPlaylistEditor && (
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
                        {track.artworkUrl100 ? (
                          <img src={track.artworkUrl100} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <Music2 className="h-5 w-5" />
                        )}
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

      <section className="min-w-0 overflow-hidden pt-2">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-bold uppercase text-zinc-500">Archive</p>
            <h2 className="mt-1 text-2xl font-black text-white">過去のライブ</h2>
          </div>
          <span className="text-sm font-bold text-zinc-500">{archivedLives.length}件</span>
        </div>

        {archivedLives.length === 0 ? (
          <div className="border-y border-zinc-900 px-4 py-10 text-center text-base text-zinc-600">
            終了したライブがここに残ります。
          </div>
        ) : (
          <div className="space-y-3">
            {archivedLives.map((plan) => {
              const archivedSongs = plan.songNos
                .map((no) => songs.find((song) => song.No === no))
                .filter((song): song is Song => Boolean(song));
              const archivedMinutes = getPlanMinutes(plan, sessions);
              const archivedSongCount = archivedSongs.length + plan.externalSongs.length;
              const isExpanded = expandedArchiveId === plan.id;
              const isDeleting = deleteArchiveId === plan.id;

              return (
                <article key={plan.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-zinc-900 text-zinc-400">
                      <Archive className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-white">{plan.title}</h3>
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {formatLiveDate(plan.date)} ・ {archivedSongCount}曲 ・ 練習 {archivedMinutes}分
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedArchiveId(isExpanded ? null : plan.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white"
                      title={isExpanded ? 'セットリストを閉じる' : 'セットリストを見る'}
                      aria-label={isExpanded ? `${plan.title}を閉じる` : `${plan.title}のセットリストを見る`}
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-800">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <p className="text-sm font-bold text-zinc-300">セットリスト</p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onRestoreLivePlan(plan.id);
                              setExpandedArchiveId(null);
                            }}
                            className="flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-black text-emerald-300 hover:bg-emerald-950/50"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            復元
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteArchiveId(plan.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 hover:bg-red-950/50 hover:text-red-300"
                            title="このライブを削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {archivedSongCount === 0 ? (
                        <p className="border-t border-zinc-900 px-4 py-8 text-center text-sm text-zinc-600">曲は登録されていません。</p>
                      ) : (
                        <div className="divide-y divide-zinc-900 border-t border-zinc-900">
                          {archivedSongs.map((song, index) => {
                            const songSessions = sessions.filter((session) => session.songNo === song.No);
                            const minutes = songSessions.reduce((sum, session) => sum + session.durationMin, 0);
                            return (
                              <div key={song.No} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
                                <span className="text-sm text-zinc-600">{index + 1}</span>
                                <div className="min-w-0">
                                  <p className="truncate text-base font-bold text-white">{song.曲名}</p>
                                  <p className="truncate text-sm text-zinc-500">{song.アーティスト}</p>
                                </div>
                                <p className="text-right text-sm font-bold text-zinc-400">{songSessions.length}回<br /><span className="text-xs text-zinc-600">{minutes}分</span></p>
                              </div>
                            );
                          })}
                          {plan.externalSongs.map((song, index) => {
                            const songSessions = sessions.filter((session) => session.externalSongId === song.id);
                            const minutes = songSessions.reduce((sum, session) => sum + session.durationMin, 0);
                            return (
                              <div key={song.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
                                <span className="text-sm text-zinc-600">{archivedSongs.length + index + 1}</span>
                                <div className="min-w-0">
                                  <p className="truncate text-base font-bold text-white">{song.title}</p>
                                  <p className="truncate text-sm text-zinc-500">{song.artist || '未設定'}</p>
                                </div>
                                <p className="text-right text-sm font-bold text-zinc-400">{songSessions.length}回<br /><span className="text-xs text-zinc-600">{minutes}分</span></p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {isDeleting && (
                        <div className="border-t border-red-950 bg-red-950/20 px-4 py-3">
                          <p className="text-sm font-bold text-red-200">このライブを削除しますか？</p>
                          <p className="mt-1 text-xs text-zinc-500">練習記録は「記録」タブに残ります。</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteLivePlan(plan.id);
                                setDeleteArchiveId(null);
                                setExpandedArchiveId(null);
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
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
