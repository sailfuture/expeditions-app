// Run with:
//   npx tsc --module nodenext --moduleResolution nodenext --target es2022 --outDir <tmp> lib/chromebook-signin.ts lib/__tests__/chromebook-signin.test.ts
//   node --test <tmp>/__tests__/chromebook-signin.test.js
import { test } from "node:test"
import assert from "node:assert/strict"
import { findLaptopOu, normalizeOuPath, signInAllowlist } from "../chromebook-signin.js"

test("allowlist is the student's own email, trimmed and lowercased", () => {
  assert.deepEqual(signInAllowlist(" Jane.Doe25@SailFuture.org "), ["jane.doe25@sailfuture.org"])
  assert.deepEqual(signInAllowlist(""), [])
})

test("allowlist adds always-allowed accounts once", () => {
  assert.deepEqual(signInAllowlist("jane.doe25@sailfuture.org", "admin@sailfuture.org, Jane.Doe25@sailfuture.org,"), ["jane.doe25@sailfuture.org", "admin@sailfuture.org"])
})

const units = [
  { name: "Students", orgUnitPath: "/Students", orgUnitId: "id:stu" },
  { name: "Expeditions", orgUnitPath: "/Students/Expeditions", orgUnitId: "id:exp" },
  { name: "A-07", orgUnitPath: "/Students/Expeditions/A-07", orgUnitId: "id:a07" },
  { name: "a-08", orgUnitPath: "/Students/Expeditions/a-08", orgUnitId: "id:a08" },
  { name: "A-01", orgUnitPath: "/Students/Expeditions/A-01", orgUnitId: "id:a01" },
  { name: "A-01", orgUnitPath: "/Old Laptops/A-01", orgUnitId: "id:old" },
]

test("finds the OU named like the laptop, any case", () => {
  assert.equal(findLaptopOu(units, "A-07").orgUnitId, "id:a07")
  assert.equal(findLaptopOu(units, "A-08").orgUnitId, "id:a08")
})

test("CHROMEBOOK_OU can be a bare OU name found anywhere, or a full path", () => {
  assert.equal(findLaptopOu(units, "A-01", "Expeditions").orgUnitId, "id:a01")
  assert.equal(findLaptopOu(units, "A-01", "expeditions/").orgUnitId, "id:a01")
  assert.equal(findLaptopOu(units, "A-01", "/Students/Expeditions").orgUnitId, "id:a01")
  assert.equal(findLaptopOu(units, "A-01", "/Old Laptops").orgUnitId, "id:old")
  assert.throws(() => findLaptopOu(units, "A-07", "/Expeditions"), /No org unit named A-07 inside \/Expeditions \(there is one at \/Students\/Expeditions\/A-07\)/)
})

test("a name used twice needs the parent OU, and a missing one is an error", () => {
  assert.throws(() => findLaptopOu(units, "A-01"), /More than one org unit is named A-01/)
  assert.throws(() => findLaptopOu(units, "A-12", "Expeditions"), /No org unit named A-12 inside Expeditions$/)
  assert.throws(() => findLaptopOu(units, "Expeditions", "Expeditions"), /No org unit/)
  assert.equal(normalizeOuPath("Expedition/"), "/Expedition")
})
