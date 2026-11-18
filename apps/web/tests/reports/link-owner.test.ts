import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { linkReportOwner } from "../../src/features/survey/lib/link-owner";

describe("linkReportOwner", () => {
  it("attaches the existing export and does not re-export", async () => {
    let attached = 0;
    let rearchived = 0;
    await linkReportOwner({
      attach: async () => {
        attached += 1;
      },
      rearchive: async () => {
        rearchived += 1;
        return {};
      },
    });
    assert.deepEqual([attached, rearchived], [1, 0]);
  });

  it("creates a new export when the existing one cannot be attached", async () => {
    let rearchived = 0;
    await linkReportOwner({
      attach: async () => {
        throw new Error("conflict");
      },
      rearchive: async () => {
        rearchived += 1;
        return {};
      },
    });
    assert.equal(rearchived, 1);
  });

  it("creates a new export when there is nothing to attach", async () => {
    let rearchived = 0;
    await linkReportOwner({
      attach: null,
      rearchive: async () => {
        rearchived += 1;
        return {};
      },
    });
    assert.equal(rearchived, 1);
  });

  it("fails when the fallback export also fails", async () => {
    await assert.rejects(() =>
      linkReportOwner({
        attach: async () => {
          throw new Error("conflict");
        },
        rearchive: async () => null,
      }),
    );
  });
});
