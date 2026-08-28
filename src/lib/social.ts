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

export async function fetchTimeline(): Promise<TimelinePost[]> {
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
  return ((data ?? []) as TimelineRow[]).map((row) => {
    const profile = relationProfile(row.profiles);
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
    };
  });
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
