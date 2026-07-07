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
  assert.match(appSource, /taiying:current-api-key/);
  assert.match(appSource, /hasApiKey/);
  assert.match(appSource, /apiKeyStatus: hasApiKey \? "present" : "missing"/);
  assert.match(appSource, /taiying:request-current-api-key/);
  assert.match(appSource, /ls-qihang\.cn/);
  assert.match(appSource, /isSubscriptionConsoleReturnUrl\(url\)/);
  assert.match(appSource, /buildDesktopPaymentUrl\(url\)/);
  assert.match(appSource, /setSubscriptionPaymentUrl\(paymentUrl\)/);
  assert.match(appSource, /taiying:payment-complete/);
  assert.match(appSource, /taiying:request-api-key/);
  assert.match(appSource, /paymentStatus=\{subscriptionPaymentStatus\}/);
  assert.match(appSource, /className="subscription-payment-frame"/);
  assert.match(appSource, /支付成功，购买额度已增加至当前使用中的 API Key/);
  assert.match(appSource, /SUBSCRIPTION_PAYMENT_SUCCESS_VISIBLE_MS = 3000/);
  assert.match(appSource, /scheduleSubscriptionPaymentViewReset/);
  assert.match(appSource, /支付成功，但暂未收到 API Key/);
  assert.match(appSource, /SUBSCRIPTION_KEY_SYNC_TIMEOUT_MS/);
  assert.match(appSource, /已阻止跳转并继续等待 API Key 同步/);
  assert.match(appSource, /onLoad=\{syncApiKeyToFrame\}/);
  assert.match(appSource, /<SubscriptionCenterScreen/);
  assert.match(appSource, /officialApiKey=\{officialApiKey\}/);
  assert.match(appSource, /已阻止覆盖概览页当前 API Key/);
  assert.doesNotMatch(appSource, /<span>支付完成，正在同步 API Key。<\/span>/);
  assert.doesNotMatch(appSource, /API Key 同步完成，账户额度已刷新/);
  assert.doesNotMatch(appSource, /openExternalUrl\(url\)/);
  assert.doesNotMatch(appSource, /allow-popups/);
  assert.doesNotMatch(appSource, /setOfficialApiKey\(apiKey\);\s*saveOfficialApiKeyToStorage\(apiKey\);/);
  assert.doesNotMatch(appSource, /https:\/\/www\.leishen-ai\.cn\/tools\/codex-plus\/#downloads/);
  assert.doesNotMatch(appSource, /打开下载页/);
});
