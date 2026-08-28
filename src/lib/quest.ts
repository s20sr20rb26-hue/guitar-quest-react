import type { Song } from '@/types';
import { DEFAULT_SKILL_LEVELS as GENERATED_SKILL_LEVELS, parseSkillNames } from '@/data/skills';

export interface SkillProgress {
  skill: string;
  level: number;
}

export interface PracticeSession {
  id: string;
  date: string;
  songNo: number;
  songName: string;
  artist?: string;
  artworkUrl?: string;
  durationMin: number;
  memo: string;
  rating: number;
  focus?: string;
  externalSongId?: string;
  livePlanId?: string;
}

export interface PracticeTarget {
  songNo: number;
  songName: string;
  artist: string;
  externalSongId?: string;
  livePlanId?: string;
  artworkUrl?: string;
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
  id: string;
  title: string;
  date: string;
  songNos: number[];
  externalSongs: ExternalSong[];
  createdAt: string;
  archivedAt?: string;
}

export interface QuestState {
  completedSongNos: number[];
  currentGoal: string | null;
  favoriteRoutes: string[];
  weeklySongNo: number | null;
  weekStartedAt: string | null;
  sessions: PracticeSession[];
  skillLevels: Record<string, number>;
  skillBaselineRemoved: boolean;
  livePlans: LivePlan[];
  activeLivePlanId: string | null;
}

export const DEFAULT_SKILL_LEVELS: Record<string, number> = GENERATED_SKILL_LEVELS;

const STORAGE_KEY = 'guitar-quest-state-v1';

interface LegacyLivePlan {
  title?: string;
  date?: string;
  songNos?: number[];
  externalSongs?: ExternalSong[];
}

type StoredQuestState = Partial<QuestState> & {
  livePlan?: LegacyLivePlan;
  livePlans?: Partial<LivePlan>[];
};

function makeLiveId(): string {
  return `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createLivePlan(title: string, date = ''): LivePlan {
  return {
    id: makeLiveId(),
    title: title.trim() || '無題のライブ',
    date,
    songNos: [],
    externalSongs: [],
    createdAt: new Date().toISOString(),
  };
}

function normalizeLivePlan(plan: Partial<LivePlan> | LegacyLivePlan, fallbackId: string): LivePlan {
  return {
    id: 'id' in plan && plan.id ? plan.id : fallbackId,
    title: plan.title?.trim() || '次のライブ',
    date: plan.date || '',
    songNos: Array.isArray(plan.songNos) ? plan.songNos : [],
    externalSongs: Array.isArray(plan.externalSongs) ? plan.externalSongs : [],
    createdAt: 'createdAt' in plan && plan.createdAt ? plan.createdAt : new Date(0).toISOString(),
    ...('archivedAt' in plan && plan.archivedAt ? { archivedAt: plan.archivedAt } : {}),
  };
}

function makeInitialLivePlan(): LivePlan {
  return createLivePlan('次のライブ');
}

function normalizeSkillLevels(
  storedLevels: Record<string, number> | undefined,
  removeLegacyBaseline: boolean
): Record<string, number> {
  const levels = { ...DEFAULT_SKILL_LEVELS, ...storedLevels };
  if (!removeLegacyBaseline) return levels;

  levels['ピッキング'] = Math.max(0, (levels['ピッキング'] ?? 0) - 1);
  levels['8ビート'] = Math.max(0, (levels['8ビート'] ?? 0) - 1);
  return levels;
}

export function loadState(): QuestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredQuestState;
      const livePlans = Array.isArray(parsed.livePlans) && parsed.livePlans.length > 0
        ? parsed.livePlans.map((plan, index) => normalizeLivePlan(plan, `live-${index}`))
        : parsed.livePlan
          ? [normalizeLivePlan(parsed.livePlan, 'live-migrated')]
          : [makeInitialLivePlan()];
      const availableLive = livePlans.find((plan) => !plan.archivedAt);
      const savedActiveLive = livePlans.find(
        (plan) => plan.id === parsed.activeLivePlanId && !plan.archivedAt
      );

      return {
        completedSongNos: parsed.completedSongNos ?? [],
        currentGoal: parsed.currentGoal ?? null,
        favoriteRoutes: parsed.favoriteRoutes ?? [],
        weeklySongNo: parsed.weeklySongNo ?? null,
        weekStartedAt: parsed.weekStartedAt ?? null,
        sessions: parsed.sessions ?? [],
        skillLevels: normalizeSkillLevels(parsed.skillLevels, parsed.skillBaselineRemoved !== true),
        skillBaselineRemoved: true,
        livePlans,
        activeLivePlanId: savedActiveLive?.id ?? availableLive?.id ?? null,
      };
    }
  } catch {
    // ignore
  }

  const initialLive = makeInitialLivePlan();
  return {
    completedSongNos: [],
    currentGoal: null,
    favoriteRoutes: [],
    weeklySongNo: null,
    weekStartedAt: null,
    sessions: [],
    skillLevels: { ...DEFAULT_SKILL_LEVELS },
    skillBaselineRemoved: true,
    livePlans: [initialLive],
    activeLivePlanId: initialLive.id,
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
  return parseSkillNames(song.必須スキル);
}

export function getAcquiredSkills(song: Song): string[] {
  return parseSkillNames(song.習得スキル);
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
  const selectedCategories = state.favoriteRoutes.length > 0
    ? state.favoriteRoutes
    : state.currentGoal
      ? [state.currentGoal]
      : [];
  const categorySongs = selectedCategories.length > 0
    ? songs.filter((song) => selectedCategories.includes(song.推奨ルート))
    : songs;
  const incompleteCategorySongs = categorySongs.filter((song) => !completed.has(song.No));
  const candidates = incompleteCategorySongs.length > 0 ? incompleteCategorySongs : categorySongs;

  const scored = candidates.map((song) => {
    const { ok, missing } = canPlaySong(song, state.skillLevels);
    let score = 0;
    if (ok) score += 100;
    score -= missing.length * 15;
    score += song.エチュード適性 * 3;
    score += song.ジャンル定番度 * 2;
    score -= song.演奏難易度 * 2;
    return { song, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.song);
}
