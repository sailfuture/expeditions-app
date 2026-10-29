// Run with:
//   npx tsc --module nodenext --moduleResolution nodenext --target es2022 --outDir <tmp> lib/chromebook-signin.ts lib/__tests__/chromebook-signin.test.ts
//   node --test <tmp>/__tests__/chromebook-signin.test.js
import { test } from "node:test"
import assert from "node:assert/strict"
import { findLaptopOu, normalizeOuPath, signInAllowlist } from "../chromebook-signin.js"

test("allowlist names the student on both linked domains", () => {
  assert.deepEqual(signInAllowlist(" Jane.Doe25@SailFuture.org "), ["jane.doe25@witexpeditions.org", "jane.doe25@sailfuture.org"])
  assert.deepEqual(signInAllowlist("jane.doe25@witexpeditions.org"), ["jane.doe25@witexpeditions.org", "jane.doe25@sailfuture.org"])
})

test("allowlist keeps other domains as they are and adds always-allowed accounts once", () => {
  assert.deepEqual(signInAllowlist("kid@gmail.com", "admin@witexpeditions.org, kid@gmail.com,"), ["kid@gmail.com", "admin@witexpeditions.org"])
})

const units = [
  { name: "Expedition", orgUnitPath: "/Expedition", orgUnitId: "id:exp" },
  { name: "A-07", orgUnitPath: "/Expedition/A-07", orgUnitId: "id:a07" },
  { name: "a-08", orgUnitPath: "/Expedition/a-08", orgUnitId: "id:a08" },
  { name: "A-01", orgUnitPath: "/Expedition/A-01", orgUnitId: "id:a01" },
  { name: "A-01", orgUnitPath: "/Old Laptops/A-01", orgUnitId: "id:old" },
]

test("finds the OU named like the laptop, any case", () => {
  assert.equal(findLaptopOu(units, "A-07").orgUnitId, "id:a07")
  assert.equal(findLaptopOu(units, "A-08").orgUnitId, "id:a08")
})

test("a name used twice needs the parent OU, and a missing one is an error", () => {
  assert.throws(() => findLaptopOu(units, "A-01"), /More than one org unit is named A-01/)
  assert.equal(findLaptopOu(units, "A-01", "Expedition/").orgUnitId, "id:a01")
  assert.throws(() => findLaptopOu(units, "A-12", "/Expedition"), /No org unit named A-12 inside \/Expedition/)
  assert.throws(() => findLaptopOu(units, "Expedition", "/Expedition"), /No org unit/)
  assert.equal(normalizeOuPath("Expedition/"), "/Expedition")
})
