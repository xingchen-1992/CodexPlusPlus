import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflowSource = fs.readFileSync(new URL("../../../../.github/workflows/release-assets.yml", import.meta.url), "utf8");

test("release workflow verifies NSIS before building Windows installer", () => {
  assert.match(workflowSource, /Install NSIS with retry/);
  assert.match(workflowSource, /if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(workflowSource, /Get-Command makensis/);
  assert.match(workflowSource, /NSIS makensis\.exe was not found/);
});

test("release workflow publishes a Windows ZIP with bundled Codex MSIX", () => {
  assert.match(workflowSource, /Download Codex Windows MSIX/);
  assert.match(workflowSource, /CodexOfficialApp-x64\.msix/);
  assert.match(workflowSource, /package-root/);
  assert.match(workflowSource, /Copy-Item \$setup "\$packageRoot\/"/);
  assert.match(workflowSource, /Copy-Item \$msix "\$packageRoot\/"/);
  assert.match(workflowSource, /Compress-Archive/);
  assert.match(workflowSource, /-Path "\$packageRoot\/\*"/);
  assert.match(workflowSource, /CodexPlusOfficial-\$\{version\}-windows-x64\.zip/);
  assert.match(workflowSource, /files: dist\/windows\/\*\.zip/);
});

test("release workflow bundles official Codex app into macOS DMGs", () => {
  assert.match(workflowSource, /Download Codex macOS app bundle/);
  assert.match(workflowSource, /CODEX_DARWIN_ARCH: \$\{\{ matrix\.arch \}\}/);
  assert.match(workflowSource, /CODEX_MACOS_ARM64_ZIP_URL/);
  assert.match(workflowSource, /Codex-darwin-arm64-26\.623\.70822\.zip/);
  assert.match(workflowSource, /Codex-darwin-x64-26\.623\.70822\.zip/);
  assert.match(workflowSource, /case "\$CODEX_DARWIN_ARCH" in/);
  assert.match(workflowSource, /CODEX_APP_SOURCE=%s/);
  assert.match(workflowSource, /Contents\/Resources\/Codex\.app/);
});
