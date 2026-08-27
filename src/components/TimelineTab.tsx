import { Clock3, Guitar, RefreshCw, Sparkles, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchTimeline, type TimelinePost } from '@/lib/social';
import { supabase } from '@/lib/supabase';

interface TimelineTabProps {
  currentUserId: string;
  refreshToken: number;
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

function accountInitial(username: string): string {
  return Array.from(username.trim())[0]?.toUpperCase() || 'G';
}

export function TimelineTab({ currentUserId, refreshToken }: TimelineTabProps) {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setPosts(await fetchTimeline());
    } catch {
      setError('タイムラインを読み込めませんでした');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts, refreshToken]);

  useEffect(() => {
    const channel = supabase
      .channel('practice-timeline')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'practice_posts' },
        () => void loadPosts(true)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPosts]);

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

      {loading ? (
        <div className="flex min-h-64 items-center justify-center text-sm font-bold text-zinc-500">
          読み込み中...
        </div>
      ) : error ? (
        <div className="py-14 text-center">
          <p className="font-bold text-zinc-400">{error}</p>
          <button type="button" onClick={() => void loadPosts()} className="mt-4 min-h-11 rounded-full bg-zinc-900 px-5 text-sm font-black text-white">
            もう一度読み込む
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-emerald-400">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-black text-white">最初の練習記録を投稿しよう</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">曲の「練習を記録」から保存すると、ここに表示されます。</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {posts.map((post) => (
            <article key={post.id} className="py-5 sm:py-6">
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
                  {post.artworkUrl ? (
                    <img src={post.artworkUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-zinc-800 text-emerald-400">
                      <Guitar className="h-7 w-7" />
                    </div>
                  )}
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
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
