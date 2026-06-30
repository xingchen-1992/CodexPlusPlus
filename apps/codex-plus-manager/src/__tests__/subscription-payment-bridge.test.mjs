import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

test("subscription iframe payment links open in the system browser", () => {
  assert.match(appSource, /official:open-payment-url/);
  assert.match(appSource, /actions\.openExternalUrl\(payload\.url\)/);
  assert.match(appSource, /正在打开支付页面/);
});
