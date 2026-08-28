import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface TimelinePost {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  songName: string;
  artist: string;
  artworkUrl?: string;
  durationMin: number;
  memo: string;
  focus: string;
  rating: number;
  practicedAt: string;
  createdAt: string;
  likesCount: number;
  likedByCurrentUser: boolean;
  comments: TimelineComment[];
}

export interface TimelineComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  body: string;
  createdAt: string;
}

interface ProfileRelation {
  username: string;
  avatar_url: string | null;
}

interface TimelineRow {
  id: string;
  user_id: string;
  song_name: string;
  artist: string;
  artwork_url: string | null;
  duration_min: number;
  memo: string;
  focus: string;
  rating: number;
  practiced_at: string;
  created_at: string;
  profiles: ProfileRelation | ProfileRelation[] | null;
}

interface LikeRow {
  post_id: string;
  user_id: string;
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: ProfileRelation | ProfileRelation[] | null;
}

function relationProfile(value: TimelineRow['profiles']): ProfileRelation | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url ?? undefined,
  };
}

export async function updateProfile(userId: string, username: string, avatarUrl?: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: username.trim(),
      avatar_url: avatarUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, username, avatar_url')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url ?? undefined,
  };
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteProfileAvatar(userId: string): Promise<void> {
  const { error } = await supabase.storage.from('avatars').remove([`${userId}/avatar`]);
  if (error) throw error;
}

export async function fetchTimeline(currentUserId: string): Promise<TimelinePost[]> {
  const { data, error } = await supabase
    .from('practice_posts')
    .select(`
      id,
      user_id,
      song_name,
      artist,
      artwork_url,
      duration_min,
      memo,
      focus,
      rating,
      practiced_at,
      created_at,
      profiles!practice_posts_user_id_fkey(username, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  const rows = (data ?? []) as TimelineRow[];
  const postIds = rows.map((row) => row.id);
  if (postIds.length === 0) return [];

  const [{ data: likesData, error: likesError }, { data: commentsData, error: commentsError }] = await Promise.all([
    supabase
      .from('post_likes')
      .select('post_id, user_id')
      .in('post_id', postIds),
    supabase
      .from('post_comments')
      .select(`
        id,
        post_id,
        user_id,
        body,
        created_at,
        profiles!post_comments_user_id_fkey(username, avatar_url)
      `)
      .in('post_id', postIds)
      .order('created_at', { ascending: true }),
  ]);

  if (likesError) throw likesError;
  if (commentsError) throw commentsError;

  const likes = (likesData ?? []) as LikeRow[];
  const comments = (commentsData ?? []) as CommentRow[];
  const likesByPost = new Map<string, LikeRow[]>();
  const commentsByPost = new Map<string, TimelineComment[]>();

  for (const like of likes) {
    const postLikes = likesByPost.get(like.post_id) ?? [];
    postLikes.push(like);
    likesByPost.set(like.post_id, postLikes);
  }

  for (const comment of comments) {
    const profile = relationProfile(comment.profiles);
    const postComments = commentsByPost.get(comment.post_id) ?? [];
    postComments.push({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      username: profile?.username || 'ギタリスト',
      avatarUrl: profile?.avatar_url ?? undefined,
      body: comment.body,
      createdAt: comment.created_at,
    });
    commentsByPost.set(comment.post_id, postComments);
  }

  return rows.map((row) => {
    const profile = relationProfile(row.profiles);
    const postLikes = likesByPost.get(row.id) ?? [];
    return {
      id: row.id,
      userId: row.user_id,
      username: profile?.username || 'ギタリスト',
      avatarUrl: profile?.avatar_url ?? undefined,
      songName: row.song_name,
      artist: row.artist,
      artworkUrl: row.artwork_url ?? undefined,
      durationMin: row.duration_min,
      memo: row.memo,
      focus: row.focus,
      rating: row.rating,
      practicedAt: row.practiced_at,
      createdAt: row.created_at,
      likesCount: postLikes.length,
      likedByCurrentUser: postLikes.some((like) => like.user_id === currentUserId),
      comments: commentsByPost.get(row.id) ?? [],
    };
  });
}

export async function setPostLike(postId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function createPostComment(postId: string, userId: string, body: string): Promise<void> {
  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    user_id: userId,
    body: body.trim(),
  });
  if (error) throw error;
}

export async function deletePostComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
  if (error) throw error;
}

interface CreatePracticePostInput {
  id: string;
  userId: string;
  songName: string;
  artist: string;
  artworkUrl?: string;
  durationMin: number;
  memo: string;
  focus: string;
  rating: number;
  practicedAt: string;
}

export async function createPracticePost(input: CreatePracticePostInput): Promise<void> {
  const { error } = await supabase.from('practice_posts').insert({
    id: input.id,
    user_id: input.userId,
    song_name: input.songName,
    artist: input.artist,
    artwork_url: input.artworkUrl || null,
    duration_min: input.durationMin,
    memo: input.memo,
    focus: input.focus,
    rating: input.rating,
    practiced_at: input.practicedAt,
  });

  if (error) throw error;
}

export async function deletePracticePost(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('practice_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}
