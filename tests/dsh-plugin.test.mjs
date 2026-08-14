import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { apply, inject, internals, name } from '../dsh-plugin/index.js'

test('exports a Cordis plugin that registers one lazy Skill provider', async () => {
  const factories = []
  const ctx = {
    skills: {
      registerProvider(factory) {
        factories.push(factory)
      },
    },
  }

  apply(ctx)

  assert.equal(name, 'dsh-spec-driven-development')
  assert.deepEqual(inject, ['skills'])
  assert.equal(factories.length, 1)
  const provider = factories[0]()
  const candidates = await provider.list()
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'spec-driven-development')
  assert.deepEqual(candidates[0].invocation, {
    modelInvocable: true,
    userInvocable: true,
  })
  assert.equal(candidates[0].source, 'bundled')
  assert.equal(candidates[0].rank, 600)
})

test('loads the projected body without frontmatter and exposes resources', async () => {
  const [candidate] = await internals.provider.list()
  const skill = await internals.provider.get(candidate)
  assert.match(skill.content, /^# Spec-Driven Development/m)
  assert.doesNotMatch(skill.content, /^---$/m)
  assert.match(skill.content, /DISCOVER → FRAME → SPECIFY → APPROVE/)
  assert.equal(skill.resourceBase.kind, 'directory')
  await access(new URL('../skills/spec-driven-development/references/workflow.md', import.meta.url))
  await access(new URL('../skills/spec-driven-development/scripts/specctl.py', import.meta.url))
  assert.equal(fileURLToPath(internals.SKILL_URL).endsWith('/skills/spec-driven-development/SKILL.md'), true)
})

test('fails loud when required Skill frontmatter is missing', () => {
  assert.throws(
    () => internals.parseSkill('---\nname: spec-driven-development\n---\nbody'),
    /has no description/,
  )
})

test('projected SKILL.md is byte-identical to the canonical source', async () => {
  const canonical = await readFile(new URL('../.codex/skills/spec-driven-development/SKILL.md', import.meta.url))
  const projected = await readFile(new URL('../skills/spec-driven-development/SKILL.md', import.meta.url))
  assert.deepEqual(projected, canonical)
})
