import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMAIL_OTP_RULES,
  emailAddressSchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  maskEmail,
  reportAttachSchema,
} from "../src/index";

describe("email schemas", () => {
  it("trims and lowercases emails", () => {
    assert.equal(emailAddressSchema.parse("  User@Example.COM "), "user@example.com");
  });

  it("rejects invalid or overlong emails", () => {
    assert.equal(emailAddressSchema.safeParse("nope").success, false);
    assert.equal(emailAddressSchema.safeParse("a@b").success, false);
    assert.equal(emailAddressSchema.safeParse("").success, false);
    const long = `${"a".repeat(250)}@b.vn`;
    assert.equal(emailAddressSchema.safeParse(long).success, false);
  });

  it("validates the request payload and locale", () => {
    assert.deepEqual(emailOtpRequestSchema.parse({ email: "A@b.vn", locale: "fr" }), { email: "a@b.vn", locale: "fr" });
    assert.equal(emailOtpRequestSchema.safeParse({ email: "a@b.vn", locale: "de" }).success, false);
    assert.equal(emailOtpRequestSchema.safeParse({ email: "a@b.vn" }).success, false);
  });

  it("only accepts a code made of exactly 6 digits", () => {
    assert.equal(emailOtpVerifySchema.safeParse({ email: "a@b.vn", code: "123456" }).success, true);
    for (const code of ["12345", "1234567", "12345a", " 12345", "١٢٣٤٥٦", ""]) {
      assert.equal(emailOtpVerifySchema.safeParse({ email: "a@b.vn", code }).success, false, code);
    }
    assert.equal(EMAIL_OTP_RULES.codeLength, 6);
  });

  it("validates the attach payload", () => {
    assert.equal(reportAttachSchema.safeParse({ exportId: "RX-20261117-ABCDEF", attachToken: "1700000000000.abcdef" }).success, true);
    assert.equal(reportAttachSchema.safeParse({ exportId: "RX-20261117-abc", attachToken: "1700000000000.abcdef" }).success, false);
    assert.equal(reportAttachSchema.safeParse({ exportId: "RX-20261117-ABCDEF", attachToken: "x" }).success, false);
  });
});

describe("maskEmail", () => {
  it("keeps the first characters and the domain", () => {
    assert.equal(maskEmail("nguyen@gmail.com"), "ng****@gmail.com");
    assert.equal(maskEmail("ab@x.vn"), "a*@x.vn");
    assert.equal(maskEmail("a@x.vn"), "a*@x.vn");
    assert.equal(maskEmail("invalid"), "invalid");
  });
});
