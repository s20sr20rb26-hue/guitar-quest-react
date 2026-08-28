import { GENERATED_SKILLS } from '@/data/generatedSkills';

export const SKILL_DEFINITIONS = GENERATED_SKILLS;

export const DEFAULT_SKILL_LEVELS: Record<string, number> = Object.fromEntries(
  SKILL_DEFINITIONS.map(({ name }) => [name, 0])
);

export const SKILL_GROUPS = [...new Set(SKILL_DEFINITIONS.map(({ category }) => category))].map(
  (label) => ({
    label,
    skills: SKILL_DEFINITIONS.filter(({ category }) => category === label).map(({ name }) => name),
  })
);
