import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

test("subscription center opens the public downloads page", () => {
  assert.match(appSource, /https:\/\/www\.leishen-ai\.cn\/tools\/codex-plus\/#downloads/);
  assert.match(appSource, /actions\.openExternalUrl\(SUBSCRIPTION_CENTER_URL\)/);
  assert.match(appSource, /打开下载页/);
  assert.doesNotMatch(appSource, /<iframe/);
  assert.doesNotMatch(appSource, /user-next\/console\/subscription/);
  assert.doesNotMatch(appSource, /official:open-payment-url/);
});
