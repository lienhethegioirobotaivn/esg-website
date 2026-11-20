import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ATTACH_MAX_AGE_MS,
  createAttachToken,
  createSessionToken,
  parseSessionToken,
  verifyAttachToken,
} from "../../src/server/auth/session-token";

const SECRET = "0123456789abcdef0123456789abcdef";
const OTHER = "ffffffffffffffffffffffffffffffff";
const NOW = 1_800_000_000_000;

describe("session token", () => {
  it("round trips the email until it expires", () => {
    const token = createSessionToken("a@b.vn", NOW + 1000, SECRET);
    assert.equal(parseSessionToken(token, SECRET, NOW), "a@b.vn");
    assert.equal(parseSessionToken(token, SECRET, NOW + 1000), null);
    assert.equal(parseSessionToken(token, SECRET, NOW + 5000), null);
  });

  it("rejects a different secret, tampered payload and malformed tokens", () => {
    const token = createSessionToken("a@b.vn", NOW + 1000, SECRET);
    assert.equal(parseSessionToken(token, OTHER, NOW), null);
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "evil@b.vn", x: NOW + 1000 })).toString("base64url");
    assert.equal(parseSessionToken(`${forged}.${signature}`, SECRET, NOW), null);
    assert.equal(parseSessionToken(`${payload}.`, SECRET, NOW), null);
    assert.equal(parseSessionToken("", SECRET, NOW), null);
    assert.equal(parseSessionToken("a.b.c", SECRET, NOW), null);
    assert.equal(parseSessionToken(`${token}.x`, SECRET, NOW), null);
  });

  it("does not accept an attach token as a session token", () => {
    const attach = createAttachToken("RX-20261117-ABCDEF", NOW, SECRET);
    assert.equal(parseSessionToken(attach, SECRET, NOW), null);
  });
});

describe("attach token", () => {
  const exportId = "RX-20261117-ABCDEF";

  it("is bound to the export id and secret", () => {
    const token = createAttachToken(exportId, NOW, SECRET);
    assert.equal(verifyAttachToken(token, exportId, SECRET, NOW + 1000), true);
    assert.equal(verifyAttachToken(token, "RX-20261117-ZZZZZZ", SECRET, NOW + 1000), false);
    assert.equal(verifyAttachToken(token, exportId, OTHER, NOW + 1000), false);
  });

  it("expires after six hours and rejects future or malformed values", () => {
    const token = createAttachToken(exportId, NOW, SECRET);
    assert.equal(verifyAttachToken(token, exportId, SECRET, NOW + ATTACH_MAX_AGE_MS), true);
    assert.equal(verifyAttachToken(token, exportId, SECRET, NOW + ATTACH_MAX_AGE_MS + 1), false);
    assert.equal(verifyAttachToken(token, exportId, SECRET, NOW - 120_000), false);
    assert.equal(verifyAttachToken("abc", exportId, SECRET, NOW), false);
    assert.equal(verifyAttachToken(`${NOW}.`, exportId, SECRET, NOW), false);
    assert.equal(verifyAttachToken(`x.y`, exportId, SECRET, NOW), false);
  });
});
