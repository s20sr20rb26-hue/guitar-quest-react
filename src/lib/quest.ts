import type { Song } from '@/types';

export interface SkillProgress {
  skill: string;
  level: number;
}

export interface PracticeSession {
  id: string;
  date: string;
  songNo: number;
  songName: string;
  durationMin: number;
  memo: string;
  rating: number;
  focus?: string;
  externalSongId?: string;
}

export interface PracticeTarget {
  songNo: number;
  songName: string;
  artist: string;
  externalSongId?: string;
}

export interface ExternalSong {
  id: string;
  title: string;
  artist: string;
  url: string;
  service: 'Spotify' | 'YouTube Music' | 'Apple Music' | 'iTunes' | 'URL';
  artworkUrl?: string;
  album?: string;
}

export interface LivePlan {
  title: string;
  date: string;
  songNos: number[];
  externalSongs: ExternalSong[];
}

export interface QuestState {
  completedSongNos: number[];
  currentGoal: string | null;
  favoriteRoutes: string[];
  weeklySongNo: number | null;
  weekStartedAt: string | null;
  sessions: PracticeSession[];
  skillLevels: Record<string, number>;
  livePlan: LivePlan;
}

export const DEFAULT_SKILL_LEVELS: Record<string, number> = {
  'ピッキング': 1,
  'パワーコード': 0,
  'ローコード': 0,
  'コードチェンジ': 0,
  '単音リフ': 0,
  '8ビート': 1,
  '16ビート': 0,
  'カッティング': 0,
  '左手ミュート': 0,
  'ブリッジミュート': 0,
  'オクターブ奏法': 0,
  'チョーキング': 0,
  'ハンマリング・プリング': 0,
  'レガート': 0,
  'ブルースフレーズ': 0,
  'ペンタ': 0,
  'シャッフル': 0,
  'ギターソロ': 0,
  '高速フレーズ': 0,
  'オルタネイト': 0,
  'コードワーク': 0,
  'コードカッティング': 0,
  '単音カッティング': 0,
  'アンサンブル': 0,
  '歌伴': 0,
  '歪み': 0,
  'ハイゲイン': 0,
  '深い歪み': 0,
  'ディレイ': 0,
  'リバーブ': 0,
  '空間系': 0,
  'ドロップD': 0,
  'テンション': 0,
  'バレーコード': 0,
  'アルペジオ': 0,
  'セッション': 0,
  '即興演奏': 0,
  'フュージョン': 0,
  'ジミヘンコード': 0,
  'オルタナリフ': 0,
  'テンポキープ': 0,
  'ストローク': 0,
  'コードストローク': 0,
};

const STORAGE_KEY = 'guitar-quest-state-v1';

const DEFAULT_LIVE_PLAN: LivePlan = {
  title: '次のライブ',
  date: '',
  songNos: [],
  externalSongs: [],
};

function normalizeLivePlan(plan?: Partial<LivePlan>): LivePlan {
  return {
    title: plan?.title || '次のライブ',
    date: plan?.date || '',
    songNos: Array.isArray(plan?.songNos) ? plan.songNos : [],
    externalSongs: Array.isArray(plan?.externalSongs) ? plan.externalSongs : [],
  };
}

export function loadState(): QuestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<QuestState>;
      return {
        completedSongNos: parsed.completedSongNos ?? [],
        currentGoal: parsed.currentGoal ?? null,
        favoriteRoutes: parsed.favoriteRoutes ?? [],
        weeklySongNo: parsed.weeklySongNo ?? null,
        weekStartedAt: parsed.weekStartedAt ?? null,
        sessions: parsed.sessions ?? [],
        skillLevels: { ...DEFAULT_SKILL_LEVELS, ...parsed.skillLevels },
        livePlan: normalizeLivePlan(parsed.livePlan),
      };
    }
  } catch {
    // ignore
  }
  return {
    completedSongNos: [],
    currentGoal: null,
    favoriteRoutes: [],
    weeklySongNo: null,
    weekStartedAt: null,
    sessions: [],
    skillLevels: { ...DEFAULT_SKILL_LEVELS },
    livePlan: DEFAULT_LIVE_PLAN,
  };
}

export function saveState(state: QuestState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getRequiredSkills(song: Song): string[] {
  const skills: string[] = [];
  if (song.必須スキル) {
    song.必須スキル.split(/[・、,/\s]+/).filter(Boolean).forEach((s) => skills.push(s.trim()));
  }
  return [...new Set(skills)];
}

export function getAcquiredSkills(song: Song): string[] {
  const skills: string[] = [];
  if (song.習得スキル) {
    song.習得スキル.split(/[・、,/\s]+/).filter(Boolean).forEach((s) => skills.push(s.trim()));
  }
  return [...new Set(skills)];
}

export function canPlaySong(song: Song, skillLevels: Record<string, number>): { ok: boolean; missing: string[] } {
  const required = getRequiredSkills(song);
  const missing: string[] = [];
  for (const skill of required) {
    const level = skillLevels[skill] ?? 0;
    if (level < 1) {
      missing.push(skill);
    }
  }
  return { ok: missing.length === 0, missing };
}

export function getServiceFromUrl(url: string): ExternalSong['service'] {
  const lower = url.toLowerCase();
  if (lower.includes('spotify.com')) return 'Spotify';
  if (lower.includes('music.youtube.com') || lower.includes('youtube.com')) return 'YouTube Music';
  if (lower.includes('itunes.apple.com')) return 'iTunes';
  if (lower.includes('music.apple.com')) return 'Apple Music';
  return 'URL';
}

export function getWeekProgress(weekStartedAt: string | null): { day: number; percent: number } {
  if (!weekStartedAt) return { day: 1, percent: 14 };
  const start = new Date(weekStartedAt).getTime();
  const diff = Date.now() - start;
  const day = Math.min(7, Math.max(1, Math.floor(diff / 86400000) + 1));
  return { day, percent: Math.round((day / 7) * 100) };
}

export function recommendNextSongs(
  songs: Song[],
  state: QuestState,
  limit = 8
): Song[] {
  const completed = new Set(state.completedSongNos);
  const candidates = songs.filter((s) => !completed.has(s.No));

  const scored = candidates.map((song) => {
    const { ok, missing } = canPlaySong(song, state.skillLevels);
    let score = 0;
    if (ok) score += 100;
    score -= missing.length * 15;
    score += song.エチュード適性 * 3;
    score += song.ジャンル定番度 * 2;
    score -= song.演奏難易度 * 2;
    if (state.currentGoal && song.推奨ルート === state.currentGoal) score += 20;
    if (state.favoriteRoutes?.includes(song.推奨ルート)) score += 28;
    return { song, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.song);
}
