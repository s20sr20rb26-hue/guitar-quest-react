import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Guitar,
  Heart,
  LoaderCircle,
  MessageCircle,
  Music2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { SongArtwork } from '@/components/SongArtwork';
import type { PracticeTarget } from '@/lib/quest';
import { searchItunesSongs, type ItunesTrack } from '@/lib/itunes';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createPostComment,
  deletePostComment,
  fetchTimeline,
  setPostLike,
  type TimelinePost,
} from '@/lib/social';
import { supabase } from '@/lib/supabase';
import {
  getAppHistoryState,
  pushAppHistoryView,
  returnFromAppHistoryView,
} from '@/lib/appHistory';

interface TimelineTabProps {
  currentUserId: string;
  refreshToken: number;
  onThreadViewChange: (open: boolean) => void;
  onLogSong: (target: PracticeTarget) => void;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間 ${rest}分`;
}

function formatPostDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatCommentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function accountInitial(username: string): string {
  return Array.from(username.trim())[0]?.toUpperCase() || 'G';
}

export function TimelineTab({ currentUserId, refreshToken, onThreadViewChange, onLogSong }: TimelineTabProps) {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [threadPostId, setThreadPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likePendingPostId, setLikePendingPostId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [songSearchOpen, setSongSearchOpen] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [songSearchResults, setSongSearchResults] = useState<ItunesTrack[]>([]);
  const [songSearchLoading, setSongSearchLoading] = useState(false);
  const [songSearchError, setSongSearchError] = useState('');

  const loadPosts = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setPosts(await fetchTimeline(currentUserId));
    } catch {
      setError('タイムラインを読み込めませんでした');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts, refreshToken]);

  useEffect(() => {
    onThreadViewChange(Boolean(threadPostId));
    return () => onThreadViewChange(false);
  }, [onThreadViewChange, threadPostId]);

  useEffect(() => {
    const handlePopState = () => {
      const historyState = getAppHistoryState();
      const historyPostId = historyState.timelinePostId;
      const isSongSearch = historyState.guitarQuestView === 'timeline-song-search';
      setSongSearchOpen(isSongSearch);
      if (!isSongSearch) {
        setSongSearchQuery('');
        setSongSearchResults([]);
        setSongSearchError('');
      }
      if (historyState.guitarQuestView === 'timeline-thread' && typeof historyPostId === 'string') {
        setThreadPostId(historyPostId);
      } else {
        setThreadPostId(null);
        setCommentDraft('');
        setDeleteCommentId(null);
        setActionError('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('practice-timeline')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'practice_posts' },
        () => void loadPosts(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        () => void loadPosts(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        () => void loadPosts(true)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPosts]);


  const openSongSearch = () => {
    if (getAppHistoryState().guitarQuestView !== 'timeline-song-search') {
      pushAppHistoryView('timeline-song-search');
    }
    setSongSearchOpen(true);
  };

  const closeSongSearch = () => {
    setSongSearchOpen(false);
    setSongSearchQuery('');
    setSongSearchResults([]);
    setSongSearchError('');
    returnFromAppHistoryView('timeline-song-search');
  };

  const submitSongSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = songSearchQuery.trim();
    if (!query || songSearchLoading) return;

    setSongSearchLoading(true);
    setSongSearchError('');
    try {
      const results = await searchItunesSongs(query);
      setSongSearchResults(results);
      if (results.length === 0) setSongSearchError('曲が見つかりませんでした');
    } catch (searchError) {
      setSongSearchResults([]);
      setSongSearchError(searchError instanceof Error ? searchError.message : '検索できませんでした');
    } finally {
      setSongSearchLoading(false);
    }
  };

  const chooseSearchedSong = (track: ItunesTrack) => {
    setSongSearchOpen(false);
    setSongSearchQuery('');
    setSongSearchResults([]);
    setSongSearchError('');
    onLogSong({
      songNo: 0,
      songName: track.trackName,
      artist: track.artistName,
      externalSongId: `itunes-${track.trackId}`,
      artworkUrl: track.artworkUrl100,
    });
  };

  const toggleLike = async (post: TimelinePost) => {
    if (likePendingPostId) return;
    const nextLiked = !post.likedByCurrentUser;
    setLikePendingPostId(post.id);
    setActionError('');
    setPosts((current) => current.map((item) => item.id === post.id
      ? {
          ...item,
          likedByCurrentUser: nextLiked,
          likesCount: Math.max(0, item.likesCount + (nextLiked ? 1 : -1)),
        }
      : item));

    try {
      await setPostLike(post.id, currentUserId, nextLiked);
    } catch {
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, likedByCurrentUser: post.likedByCurrentUser, likesCount: post.likesCount }
        : item));
      setActionError('いいねを更新できませんでした');
    } finally {
      setLikePendingPostId(null);
    }
  };

  const openThread = (postId: string) => {
    pushAppHistoryView('timeline-thread', { timelinePostId: postId });
    setThreadPostId(postId);
    setCommentDraft('');
    setDeleteCommentId(null);
    setActionError('');
  };

  const closeThread = () => {
    setThreadPostId(null);
    setCommentDraft('');
    setDeleteCommentId(null);
    setActionError('');
    returnFromAppHistoryView('timeline-thread');
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (!body || commentSubmitting) return;

    setCommentSubmitting(true);
    setActionError('');
    try {
      await createPostComment(postId, currentUserId, body);
      setCommentDraft('');
      await loadPosts(true);
    } catch {
      setActionError('コメントを送信できませんでした');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const removeComment = async (commentId: string) => {
    setActionError('');
    try {
      await deletePostComment(commentId, currentUserId);
      setDeleteCommentId(null);
      await loadPosts(true);
    } catch {
      setActionError('コメントを削除できませんでした');
    }
  };

  const renderPost = (post: TimelinePost) => {
    const inThread = threadPostId === post.id;
    return (
      <>
        <div className="flex items-center gap-3">
          {post.avatarUrl ? (
            <img src={post.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          ) : (
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black ${post.userId === currentUserId ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-200'}`}>
              {accountInitial(post.username)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">
              {post.username}
              {post.userId === currentUserId && <span className="ml-2 text-xs text-emerald-400">あなた</span>}
            </p>
            <time className="text-xs font-bold text-zinc-600" dateTime={post.practicedAt}>{formatPostDate(post.practicedAt)}</time>
          </div>
        </div>

        <div className="ml-0 mt-3 rounded-lg bg-zinc-900 p-4 sm:ml-14">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-800 text-emerald-400">
              <SongArtwork
                title={post.songName}
                artist={post.artist}
                src={post.artworkUrl}
                fallback={<Guitar className="h-7 w-7" />}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black text-white">{post.songName}</p>
              {post.artist && <p className="truncate text-sm font-bold text-zinc-500">{post.artist}</p>}
              <p className="mt-2 flex items-center gap-2 text-xl font-black text-white">
                <Clock3 className="h-5 w-5 text-emerald-400" />
                {formatDuration(post.durationMin)}
              </p>
            </div>
          </div>
        </div>

        {(post.memo || post.focus) && (
          <div className="ml-0 mt-3 sm:ml-14">
            {post.memo && <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-200">{post.memo}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
              {post.focus && <span className="rounded-full bg-zinc-900 px-3 py-1.5">{post.focus}</span>}
              <span className="flex items-center gap-1 text-amber-400" aria-label={`自己評価 ${post.rating}`}>
                <Star className="h-4 w-4 fill-current" />
                {post.rating}
              </span>
            </div>
          </div>
        )}

        <div className="ml-0 mt-4 flex items-center gap-2 border-t border-zinc-900 pt-2 sm:ml-14">
          <button
            type="button"
            onClick={() => void toggleLike(post)}
            disabled={likePendingPostId === post.id}
            aria-pressed={post.likedByCurrentUser}
            aria-label={post.likedByCurrentUser ? 'いいねを取り消す' : 'いいね'}
            className={`flex min-h-10 min-w-16 items-center justify-center gap-2 rounded-full px-3 text-sm font-black transition-colors ${post.likedByCurrentUser ? 'bg-rose-950/60 text-rose-400' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <Heart className={`h-5 w-5 ${post.likedByCurrentUser ? 'fill-current' : ''}`} />
            {post.likesCount}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!inThread) openThread(post.id);
            }}
            aria-expanded={inThread}
            aria-label={`コメント ${post.comments.length}件`}
            className={`flex min-h-10 min-w-16 items-center justify-center gap-2 rounded-full px-3 text-sm font-black transition-colors ${inThread ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <MessageCircle className="h-5 w-5" />
            {post.comments.length}
          </button>
        </div>
      </>
    );
  };

  const actionErrorToast = actionError && (
    <div className="fixed left-1/2 top-20 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-lg bg-red-950 px-4 py-3 text-sm font-bold text-red-100 shadow-xl" role="alert">
      <span>{actionError}</span>
      <button type="button" onClick={() => setActionError('')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-red-900" aria-label="閉じる">
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const threadPost = threadPostId ? posts.find((post) => post.id === threadPostId) : null;
  if (threadPost) {
    return (
      <section className="mx-auto max-w-3xl">
        <header className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <button
            type="button"
            onClick={closeThread}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
            aria-label="タイムラインに戻る"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <p className="text-xs font-black uppercase text-emerald-400">Thread</p>
            <h2 className="text-xl font-black text-white">練習記録</h2>
          </div>
        </header>

        {actionErrorToast}

        <article className="py-5 sm:py-6">
          {renderPost(threadPost)}

          <section className="mt-5 border-t border-zinc-800 pt-5" aria-labelledby="thread-comments-title">
            <h3 id="thread-comments-title" className="text-base font-black text-white">コメント {threadPost.comments.length}件</h3>

            {threadPost.comments.length === 0 ? (
              <p className="py-8 text-center text-sm font-bold text-zinc-600">まだコメントはありません</p>
            ) : (
              <div className="mt-5 space-y-5">
                {threadPost.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    {comment.avatarUrl ? (
                      <img src={comment.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${comment.userId === currentUserId ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-200'}`}>
                        {accountInitial(comment.username)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <p className="truncate text-sm font-black text-white">{comment.username}</p>
                        <time className="shrink-0 text-[11px] font-bold text-zinc-600" dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-base leading-relaxed text-zinc-300">{comment.body}</p>
                    </div>
                    {comment.userId === currentUserId && (
                      deleteCommentId === comment.id ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => void removeComment(comment.id)} className="min-h-9 rounded-full bg-red-950 px-3 text-xs font-black text-red-200 hover:bg-red-900">削除</button>
                          <button type="button" onClick={() => setDeleteCommentId(null)} className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900 hover:text-white" aria-label="削除をやめる"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteCommentId(comment.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-red-950/50 hover:text-red-300" aria-label="コメントを削除"><Trash2 className="h-4 w-4" /></button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={(event) => void submitComment(event, threadPost.id)} className="mt-6 grid grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2 border-t border-zinc-900 pt-4">
              <label className="min-w-0">
                <span className="sr-only">コメントを入力</span>
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  maxLength={500}
                  rows={2}
                  autoFocus
                  placeholder="コメントを書く"
                  className="block min-h-12 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-base text-white outline-none placeholder:text-zinc-700 focus:border-emerald-500"
                />
              </label>
              <button
                type="submit"
                disabled={!commentDraft.trim() || commentSubmitting}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600"
                aria-label="コメントを送信"
              >
                {commentSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </section>
        </article>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-1 pb-4">
        <div>
          <p className="text-xs font-black uppercase text-emerald-400">Community</p>
          <h2 className="mt-1 text-2xl font-black text-white">タイムライン</h2>
        </div>
        <button
          type="button"
          onClick={() => void loadPosts(true)}
          disabled={refreshing}
          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900 hover:text-white disabled:opacity-50"
          aria-label="タイムラインを更新"
          title="更新"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {actionErrorToast}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-sm font-bold text-zinc-500">読み込み中...</div>
      ) : error ? (
        <div className="py-14 text-center">
          <p className="font-bold text-zinc-400">{error}</p>
          <button type="button" onClick={() => void loadPosts()} className="mt-4 min-h-11 rounded-full bg-zinc-900 px-5 text-sm font-black text-white">もう一度読み込む</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-emerald-400"><Sparkles className="h-7 w-7" /></div>
          <h3 className="mt-4 text-lg font-black text-white">最初の練習記録を投稿しよう</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">曲の「練習を記録」から保存すると、ここに表示されます。</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {posts.map((post) => (
            <article key={post.id} className="py-5 sm:py-6">
              {renderPost(post)}
            </article>
          ))}
        </div>
      )}

      {songSearchOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
          role="presentation"
          onClick={closeSongSearch}
        >
          <section
            className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:max-w-lg sm:rounded-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-song-search-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4">
              <div>
                <p className="text-xs font-black uppercase text-emerald-400">iTunes Search</p>
                <h3 id="timeline-song-search-title" className="mt-1 text-xl font-black text-white">好きな曲を練習記録</h3>
              </div>
              <button
                type="button"
                onClick={closeSongSearch}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={(event) => void submitSongSearch(event)} className="border-b border-zinc-900 p-4">
              <label className="grid min-h-12 grid-cols-[1.25rem_minmax(0,1fr)_2.75rem] items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 focus-within:border-emerald-500">
                <Search className="h-5 w-5 text-zinc-500" />
                <span className="sr-only">曲名またはアーティスト名</span>
                <input
                  value={songSearchQuery}
                  onChange={(event) => setSongSearchQuery(event.target.value)}
                  placeholder="曲名・アーティストで検索"
                  autoFocus
                  className="min-w-0 bg-transparent py-3 text-base font-bold text-white outline-none placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!songSearchQuery.trim() || songSearchLoading}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600"
                  aria-label="iTunesで検索"
                >
                  {songSearchLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </button>
              </label>
            </form>

            <div className="min-h-48 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
              {songSearchError ? (
                <p className="px-5 py-10 text-center text-sm font-bold text-zinc-500">{songSearchError}</p>
              ) : songSearchResults.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
                  <Music2 className="h-9 w-9 text-zinc-700" />
                  <p className="mt-4 text-sm font-bold leading-relaxed text-zinc-500">
                    エチュード一覧にない曲も<br />ここから記録できます
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {songSearchResults.map((track) => (
                    <button
                      key={track.trackId}
                      type="button"
                      onClick={() => chooseSearchedSong(track)}
                      className="grid w-full grid-cols-[4rem_minmax(0,1fr)_2.5rem] items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900"
                    >
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-zinc-900 text-zinc-600">
                        <SongArtwork
                          title={track.trackName}
                          artist={track.artistName}
                          src={track.artworkUrl100}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-white">{track.trackName}</p>
                        <p className="mt-1 truncate text-sm font-bold text-zinc-400">{track.artistName}</p>
                        {track.collectionName && (
                          <p className="mt-0.5 truncate text-xs text-zinc-600">{track.collectionName}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 justify-self-end text-zinc-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={openSongSearch}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black shadow-xl shadow-black/50 transition-transform hover:bg-emerald-400 active:scale-95 sm:bottom-6 sm:right-6"
        aria-label="エチュード一覧にない曲を練習記録"
        title="好きな曲を練習記録"
      >
        <Plus className="h-7 w-7" strokeWidth={3} />
      </button>
    </section>
  );
}
