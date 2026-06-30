import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

test("subscription center embeds the desktop payment page and bridges payment events", () => {
  assert.match(
    appSource,
    /https:\/\/www\.leishen-ai\.cn\/user-next\/console\/subscription\?desktop=codex-plus-taiying/
  );
  assert.match(appSource, /<iframe/);
  assert.match(appSource, /src=\{SUBSCRIPTION_CENTER_URL\}/);
  assert.match(appSource, /taiying:open-payment-url/);
  assert.match(appSource, /taiying:api-key-ready/);
  assert.match(appSource, /openExternalUrl\(url\)/);
  assert.doesNotMatch(appSource, /https:\/\/www\.leishen-ai\.cn\/tools\/codex-plus\/#downloads/);
  assert.doesNotMatch(appSource, /打开下载页/);
});
