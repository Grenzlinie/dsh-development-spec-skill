/**
 * DeepSeek Harness provider for the packaged spec-driven-development Skill.
 * The body stays on disk until the model or user explicitly loads the Skill.
 *
 * @module dsh-spec-driven-development
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const PROVIDER_NAME = 'dsh-spec-driven-development'
const SKILL_DIRECTORY_URL = new URL('../skills/spec-driven-development/', import.meta.url)
const SKILL_URL = new URL('SKILL.md', SKILL_DIRECTORY_URL)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(SKILL_DIRECTORY_URL),
}
/** DeepSeek Harness standard rank for a Skill shipped by an installed bundle. */
const BUNDLED_SKILL_RANK = 600

/** Parse the required scalar metadata and body from the packaged Skill. */
function parseSkill(source) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/.exec(source)
  if (match === null) {
    throw new Error('spec-driven-development: packaged SKILL.md has no valid YAML frontmatter')
  }
  const frontmatter = source.slice(4, source.indexOf('\n---', 4))
  const scalar = (key) => {
    const line = frontmatter.split(/\r?\n/).find(value => value.startsWith(`${key}:`))
    const value = line?.slice(key.length + 1).trim()
    if (value === undefined || value === '') {
      throw new Error(`spec-driven-development: packaged SKILL.md has no ${key}`)
    }
    return value
  }
  return { name: scalar('name'), description: scalar('description'), content: match[1] }
}

function candidateOf(skill) {
  return {
    name: skill.name,
    description: skill.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase: RESOURCE_BASE,
    rank: BUNDLED_SKILL_RANK,
    locator: SKILL_URL,
  }
}

const provider = {
  name: PROVIDER_NAME,
  async list() {
    const source = await readFile(SKILL_URL, 'utf8')
    return [candidateOf(parseSkill(source))]
  },
  async get(candidate) {
    const source = await readFile(SKILL_URL, 'utf8')
    const skill = parseSkill(source)
    if (skill.name !== candidate.name) {
      throw new Error(`spec-driven-development: packaged Skill changed name to ${skill.name}`)
    }
    return {
      name: candidate.name,
      description: skill.description,
      invocation: candidate.invocation,
      provider: candidate.provider,
      source: candidate.source,
      resourceBase: candidate.resourceBase,
      content: skill.content,
    }
  },
}

/** Stable Cordis plugin name. */
export const name = PROVIDER_NAME

/** The Skill registry must be ready before the provider is registered. */
export const inject = ['skills']

/** Register the lazily loaded Skill provider. */
export function apply(ctx) {
  ctx.skills.registerProvider(() => provider)
}

export const internals = { SKILL_URL, candidateOf, parseSkill, provider }
