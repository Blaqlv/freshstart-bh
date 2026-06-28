// tests/superadmin-script.mjs
import assert from "node:assert";
import { generateTempPassword } from "../scripts/create-super-admin.ts";

const a = generateTempPassword();
const b = generateTempPassword();
assert.ok(a.length >= 20, "temp password is long");
assert.notStrictEqual(a, b, "temp passwords are random");
console.log("superadmin-script test PASSED");
