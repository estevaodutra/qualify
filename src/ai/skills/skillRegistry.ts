import { SkillDefinition } from "../schemas";

/**
 * Catálogo de Skills da Central de IA.
 * Zerado para reconstrução individual e modular.
 */
export const PREPARED_SKILLS: SkillDefinition[] = [];

export const SkillRegistry: Record<string, SkillDefinition> = {};

PREPARED_SKILLS.forEach((skill) => {
  SkillRegistry[skill.slug] = skill;
});

export function registerSkill(skill: SkillDefinition): void {
  SkillRegistry[skill.slug] = skill;
}

export function getSkill(slug: string): SkillDefinition | undefined {
  return SkillRegistry[slug];
}

export function listSkills(): SkillDefinition[] {
  return Object.values(SkillRegistry);
}
