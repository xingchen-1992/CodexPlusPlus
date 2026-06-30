import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const panelSource = fs.readFileSync(new URL("../components/OfficialBalancePanel.tsx", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("official balance panel reminds users to keep their api key", () => {
  assert.match(panelSource, /请务必保存好 API Key/);
  assert.match(panelSource, /API Key 丢失后无法在本工具中找回/);
  assert.match(panelSource, /official-panel-key-warning/);
  assert.match(stylesSource, /\.official-panel-key-warning/);
});

test("refresh balance success message includes the api key backup reminder", () => {
  assert.match(appSource, /const API_KEY_BACKUP_REMINDER = "请务必保存好 API Key，丢失后无法在本工具中找回。"/);
  assert.match(appSource, /额度刷新完成[^`]+API_KEY_BACKUP_REMINDER/);
});
