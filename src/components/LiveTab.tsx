import { useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Link2, ListMusic, LoaderCircle, Music2, Plus, Search, Trash2 } from 'lucide-react';
import type { Song } from '@/types';
import type { ExternalSong, LivePlan, PracticeSession } from '@/lib/quest';

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  trackViewUrl: string;
  kind: string;
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
interface LiveTabProps {
  songs: Song[];
  livePlan: LivePlan;
  sessions: PracticeSession[];
  onUpdateLivePlan: (patch: Partial<LivePlan>) => void;
  onAddLiveSong: (songNo: number) => void;
  onRemoveLiveSong: (songNo: number) => void;
  onAddExternalSong: (title: string, artist: string, url: string) => void;
  onRemoveExternalSong: (id: string) => void;
  onLogSession: (song: Song) => void;
}

export function LiveTab({
  songs,
  livePlan,
  sessions,
  onUpdateLivePlan,
  onAddLiveSong,
  onRemoveLiveSong,
  onAddExternalSong,
  onRemoveExternalSong,
  onLogSession,
}: LiveTabProps) {
  const [songNo, setSongNo] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [externalArtist, setExternalArtist] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [itunesQuery, setItunesQuery] = useState('');
  const [itunesResults, setItunesResults] = useState<ItunesTrack[]>([]);
  const [itunesLoading, setItunesLoading] = useState(false);
  const [itunesError, setItunesError] = useState('');

  const liveSongs = livePlan.songNos
    .map((no) => songs.find((song) => song.No === no))
    .filter((song): song is Song => Boolean(song));

  const daysLeft = useMemo(() => {
    if (!livePlan.date) return null;
    const today = new Date();
    const liveDate = new Date(livePlan.date + 'T00:00:00');
    return Math.ceil((liveDate.getTime() - today.getTime()) / 86400000);
  }, [livePlan.date]);

  const totalSongs = liveSongs.length + livePlan.externalSongs.length;
  const totalMinutes = sessions
    .filter((session) => livePlan.songNos.includes(session.songNo))
    .reduce((sum, session) => sum + session.durationMin, 0);

  const addSelectedSong = () => {
    const no = Number(songNo);
    if (!no) return;
    onAddLiveSong(no);
    setSongNo('');
  };

  const addExternal = () => {
    if (!externalTitle.trim() || !externalUrl.trim()) return;
    onAddExternalSong(externalTitle.trim(), externalArtist.trim(), externalUrl.trim());
    setExternalTitle('');
    setExternalArtist('');
    setExternalUrl('');
  };

  const searchItunes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = itunesQuery.trim();
    if (!query || itunesLoading) return;

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
    onAddExternalSong(track.trackName, track.artistName, track.trackViewUrl);
  };
  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden sm:space-y-5">
      <section className="min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/25 via-zinc-900 to-black p-4 shadow-2xl shadow-black/40 sm:rounded-2xl sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Live playlist</p>
            <input
              value={livePlan.title}
              onChange={(event) => onUpdateLivePlan({ title: event.target.value })}
              className="min-w-0 w-full bg-transparent text-3xl font-black leading-tight text-white outline-none placeholder:text-zinc-600 sm:text-5xl"
              placeholder="次のライブ"
            />
            <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 text-sm text-zinc-300 sm:flex sm:flex-wrap">
              <label className="col-span-2 flex min-w-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 sm:col-auto sm:rounded-full">
                <CalendarDays className="h-4 w-4 text-emerald-300" />
                <input
                  type="date"
                  value={livePlan.date}
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
        {daysLeft !== null && (
          <div className="mt-5 rounded-xl bg-black/35 p-4">
            <p className="text-sm text-zinc-400">本番まで</p>
            <p className="text-4xl font-black text-white">{daysLeft >= 0 ? daysLeft : 0}<span className="ml-1 text-base font-bold text-zinc-400">日</span></p>
          </div>
        )}
      </section>

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
              const isAdded = livePlan.externalSongs.some((song) => song.url === track.trackViewUrl);
              return (
                <div key={track.trackId} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 bg-zinc-950 px-3 py-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-emerald-400">
                    <Music2 className="h-5 w-5" />
                  </div>
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
          <Plus className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">セットリストに追加</h2>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <select
            value={songNo}
            onChange={(event) => setSongNo(event.target.value)}
            className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-emerald-500"
          >
            <option value="">曲データベースから選ぶ</option>
            {songs.map((song) => (
              <option key={song.No} value={song.No}>{song.曲名} - {song.アーティスト}</option>
            ))}
          </select>
          <button onClick={addSelectedSong} className="min-h-11 rounded-full bg-emerald-500 px-5 text-sm font-black text-black hover:bg-emerald-400">
            追加
          </button>
        </div>
        <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-3">
          <input value={externalTitle} onChange={(event) => setExternalTitle(event.target.value)} placeholder="外部曲名" className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-emerald-500" />
          <input value={externalArtist} onChange={(event) => setExternalArtist(event.target.value)} placeholder="アーティスト" className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-emerald-500" />
          <input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="Spotify / YouTube Music / Apple Music URL" className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 outline-none focus:border-emerald-500" />
        </div>
        <button onClick={addExternal} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-black text-black hover:bg-white sm:w-auto">
          <Link2 className="h-4 w-4" />
          外部URLから追加
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Music2 className="h-5 w-5 text-emerald-400" />
          練習プレイリスト
        </h2>
        {totalSongs === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-8 text-center text-sm text-zinc-500">
            ライブで弾く曲を追加すると、曲ごとの練習記録をここで追えます。
          </div>
        )}
        {liveSongs.map((song, index) => {
          const songSessions = sessions.filter((session) => session.songNo === song.No);
          const minutes = songSessions.reduce((sum, session) => sum + session.durationMin, 0);
          return (
            <div key={song.No} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-3 hover:bg-zinc-900 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-2">
              <span className="text-sm text-zinc-500">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">{song.曲名}</p>
                <p className="truncate text-sm text-zinc-500">{song.アーティスト} ・ {songSessions.length}回 ・ {minutes}分</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => onLogSession(song)} className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-black text-black hover:bg-emerald-400">
                  記録
                </button>
                <button onClick={() => onRemoveLiveSong(song.No)} className="rounded-full p-2 text-zinc-500 hover:bg-red-950/50 hover:text-red-300" title="削除">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {livePlan.externalSongs.map((song: ExternalSong, index) => (
          <div key={song.id} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-3 hover:bg-zinc-900 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-2">
            <span className="text-sm text-zinc-500">{liveSongs.length + index + 1}</span>
            <div className="min-w-0">
              <a href={song.url} target="_blank" rel="noopener noreferrer" className="block truncate text-base font-bold text-white hover:text-emerald-300">
                {song.title}
              </a>
              <p className="truncate text-sm text-zinc-500">{song.artist || '未設定'} ・ {song.service}</p>
            </div>
            <button onClick={() => onRemoveExternalSong(song.id)} className="rounded-full p-2 text-zinc-500 hover:bg-red-950/50 hover:text-red-300" title="削除">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
