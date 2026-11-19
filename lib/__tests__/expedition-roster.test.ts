// Run with:
//   npx tsc --module nodenext --moduleResolution nodenext --target es2022 --outDir <tmp> lib/expedition-roster.ts lib/__tests__/expedition-roster.test.ts
//   node --test <tmp>/__tests__/expedition-roster.test.js
import { test } from "node:test"
import assert from "node:assert/strict"
import { archivedStudentIds, isArchivedOnExpedition, isArchivedStudentAssignment } from "../expedition-roster.js"

test("a student is archived by their own flag or by the expedition's flag", () => {
  assert.equal(isArchivedOnExpedition({ id: 1, isArchived: false, archived_on_expedition: false }), false)
  assert.equal(isArchivedOnExpedition({ id: 1, isArchived: true, archived_on_expedition: false }), true)
  assert.equal(isArchivedOnExpedition({ id: 1, isArchived: false, archived_on_expedition: true }), true)
})

test("missing flags mean active (rows from /students carry no expedition flag)", () => {
  assert.equal(isArchivedOnExpedition({ id: 1 }), false)
  assert.equal(isArchivedOnExpedition({ id: 1, isArchived: null }), false)
  assert.equal(isArchivedOnExpedition(null), false)
  assert.equal(isArchivedOnExpedition(undefined), false)
})

test("archivedStudentIds collects only the archived students of a roster", () => {
  const roster = [
    { id: 1, isArchived: false, archived_on_expedition: false },
    { id: 2, isArchived: true, archived_on_expedition: true },
    { id: "3", isArchived: false, archived_on_expedition: true },
    { id: 4 },
  ]
  assert.deepEqual([...archivedStudentIds(roster)].sort(), [2, 3])
  assert.equal(archivedStudentIds(undefined).size, 0)
  assert.equal(archivedStudentIds(null).size, 0)
})

test("an assignment is archived when switched off or when its student is archived everywhere", () => {
  assert.equal(isArchivedStudentAssignment({ isArchived: false, _students: { isArchived: false } }), false)
  assert.equal(isArchivedStudentAssignment({ isArchived: true, _students: { isArchived: false } }), true)
  assert.equal(isArchivedStudentAssignment({ isArchived: false, _students: { isArchived: true } }), true)
  assert.equal(isArchivedStudentAssignment({ _students: {} }), false)
})
