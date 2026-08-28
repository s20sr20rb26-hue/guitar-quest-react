import { GENERATED_SKILLS } from '@/data/generatedSkills';

export const SKILL_DEFINITIONS = GENERATED_SKILLS;

const SKILL_NAME_SET = new Set(SKILL_DEFINITIONS.map(({ name }) => name));
const SKILL_NAMES_BY_LENGTH = [...SKILL_NAME_SET].sort((a, b) => b.length - a.length);

function segmentSkillSequence(value: string): string[] {
  const memo = new Map<number, string[] | null>();

  const walk = (start: number): string[] | null => {
    if (start === value.length) return [];
    if (memo.has(start)) return memo.get(start) ?? null;

    for (const skill of SKILL_NAMES_BY_LENGTH) {
      if (!value.startsWith(skill, start)) continue;
      const end = start + skill.length;
      if (end === value.length) {
        const result = [skill];
        memo.set(start, result);
        return result;
      }
      if (value[end] !== '・') continue;
      const rest = walk(end + 1);
      if (rest) {
        const result = [skill, ...rest];
        memo.set(start, result);
        return result;
      }
    }

    memo.set(start, null);
    return null;
  };

  return walk(0) ?? value.split('・').filter(Boolean);
}

export function parseSkillNames(value: string): string[] {
  const skills = value
    .split(/[、,/\s]+/)
    .filter(Boolean)
    .flatMap((part) => SKILL_NAME_SET.has(part) ? [part] : segmentSkillSequence(part));
  return [...new Set(skills)];
}

export const DEFAULT_SKILL_LEVELS: Record<string, number> = Object.fromEntries(
  SKILL_DEFINITIONS.map(({ name }) => [name, 0])
);

export const SKILL_GROUPS = [...new Set(SKILL_DEFINITIONS.map(({ category }) => category))].map(
  (label) => ({
    label,
    skills: SKILL_DEFINITIONS.filter(({ category }) => category === label).map(({ name }) => name),
  })
);
