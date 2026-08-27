import { useState, useMemo } from 'react';
import { Gauge, RotateCcw, Search, Star } from 'lucide-react';
import type { QuestState } from '@/lib/quest';
import { DEFAULT_SKILL_LEVELS } from '@/lib/quest';
import { SKILL_CATEGORIES } from '@/data/songs';

interface SkillsTabProps {
  state: QuestState;
  onUpdateSkill: (skill: string, level: number) => void;
  onResetAll: () => void;
}

const SKILL_GROUPS: { label: string; keywords: string[] }[] = [
  { label: '基礎', keywords: ['ピッキング', 'パワーコード', 'ローコード', 'コードチェンジ', 'バレーコード', '単音リフ', 'テンポキープ'] },
  { label: 'リズム・バッキング', keywords: ['8ビート', '16ビート', 'ストローク', 'コードストローク', 'カッティング', 'コードカッティング', '単音カッティング', '左手ミュート', 'ブリッジミュート'] },
  { label: 'リード・テクニック', keywords: ['オクターブ奏法', 'チョーキング', 'ハンマリング・プリング', 'レガート', 'ギターソロ', '高速フレーズ', 'オルタネイト'] },
  { label: 'ジャンル・語彙', keywords: ['ブルースフレーズ', 'ペンタ', 'シャッフル', 'ジミヘンコード', 'フュージョン', 'オルタナリフ', '即興演奏', 'セッション'] },
  { label: 'アンサンブル・音作り', keywords: ['コードワーク', 'アンサンブル', '歌伴', '歪み', 'ハイゲイン', '深い歪み', 'ディレイ', 'リバーブ', '空間系', 'ドロップD', 'テンション', 'アルペジオ'] },
];

const LEVEL_LABELS = ['未習得', '入門', '初級', '中級', '上級'];

export function SkillsTab({ state, onUpdateSkill, onResetAll }: SkillsTabProps) {
  const [search, setSearch] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const allSkills = Object.keys(DEFAULT_SKILL_LEVELS);

  const filteredSkills = useMemo(() => {
    if (!search.trim()) return allSkills;
    const q = search.trim().toLowerCase();
    return allSkills.filter((s) => s.toLowerCase().includes(q));
  }, [search, allSkills]);

  const grouped = useMemo(() => {
    return SKILL_GROUPS.map((group) => {
      const skills = filteredSkills.filter((s) => group.keywords.includes(s));
      return { ...group, skills };
    }).filter((g) => g.skills.length > 0);
  }, [filteredSkills]);

  const setLevel = (skill: string, level: number) => {
    const current = state.skillLevels[skill] ?? 0;
    if (current === level) {
      onUpdateSkill(skill, 0);
    } else {
      onUpdateSkill(skill, level);
    }
  };

  const totalSkills = allSkills.length;
  const learnedCount = allSkills.filter((s) => (state.skillLevels[s] ?? 0) > 0).length;
  const avgLevel = allSkills.reduce((sum, s) => sum + (state.skillLevels[s] ?? 0), 0) / totalSkills;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-800/30 bg-gradient-to-br from-amber-950/30 to-slate-900/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">スキルレベル登録</h2>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          いまできる技術を自己評価で登録してください。曲を習得すると自動で上がりますが、ここで手動調整もできます。
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900/40 p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{learnedCount}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">習得済み</p>
          </div>
          <div className="rounded-xl bg-slate-900/40 p-3 text-center">
            <p className="text-2xl font-bold text-slate-300">{totalSkills - learnedCount}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">未習得</p>
          </div>
          <div className="rounded-xl bg-slate-900/40 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{avgLevel.toFixed(1)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">平均レベル</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="スキルを検索..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
        />
      </div>

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.label}>
            <h3 className="mb-2 text-sm font-bold text-slate-300">{group.label}</h3>
            <div className="space-y-2">
              {group.skills.map((skill) => {
                const level = state.skillLevels[skill] ?? 0;
                return (
                  <div
                    key={skill}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{skill}</p>
                      <p className="text-[11px] text-slate-500">{LEVEL_LABELS[level] ?? '未習得'}</p>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((lv) => (
                        <button
                          key={lv}
                          onClick={() => setLevel(skill, lv)}
                          className={`flex h-8 w-9 items-center justify-center rounded-md text-xs font-bold transition-all ${
                            level >= lv
                              ? lv === 1
                                ? 'bg-emerald-600/30 text-emerald-400'
                                : lv === 2
                                  ? 'bg-sky-600/30 text-sky-400'
                                  : lv === 3
                                    ? 'bg-amber-600/30 text-amber-400'
                                    : 'bg-orange-600/30 text-orange-400'
                              : 'bg-slate-800 text-slate-600 hover:bg-slate-700'
                          }`}
                        >
                          {lv}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-red-400"
          >
            <RotateCcw className="h-4 w-4" />
            すべてのスキルをリセット
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">本当にすべてのスキルをリセットしますか？</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-700"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  onResetAll();
                  setConfirmReset(false);
                }}
                className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
              >
                リセット
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
