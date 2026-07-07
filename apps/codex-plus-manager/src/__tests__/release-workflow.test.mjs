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

test("release workflow publishes componentized Windows installer assets", () => {
  assert.match(workflowSource, /Download Codex Windows MSIX/);
  assert.match(workflowSource, /Download Python Windows installer/);
  assert.match(workflowSource, /Download Node Windows runtime/);
  assert.match(workflowSource, /Embed Node Windows runtime into setup/);
  assert.match(workflowSource, /CodexOfficialApp-x64\.msix/);
  assert.match(workflowSource, /python-3\.13\.14-amd64\.exe/);
  assert.match(workflowSource, /node-\$\{env:NODE_RUNTIME_VERSION\}-win-x64\.zip/);
  assert.match(workflowSource, /\/DUPDATE_ONLY=1/);
  assert.match(workflowSource, /\/DONLINE_COMPONENTS=1/);
  assert.match(workflowSource, /package-root/);
  assert.match(workflowSource, /\$resourcesDir = "\$packageRoot\/RequiredFiles"/);
  assert.match(workflowSource, /Copy-Item \$setup "\$packageRoot\/点我双击安装\.exe"/);
  assert.match(workflowSource, /Copy-Item \$msix "\$resourcesDir\/CodexOfficialApp-x64\.msix"/);
  assert.match(workflowSource, /Copy-Item \$python "\$resourcesDir\/python-3\.13\.14-amd64\.exe"/);
  assert.match(workflowSource, /Copy-Item \$node "\$resourcesDir\/node-\$\{env:NODE_RUNTIME_VERSION\}-win-x64\.zip"/);
  assert.match(workflowSource, /\$expectedRootNames = @\("RequiredFiles", "点我双击安装\.exe"\)/);
  assert.match(workflowSource, /Package root must contain exactly one setup executable/);
  assert.match(workflowSource, /Package resources are missing CodexOfficialApp-x64\.msix/);
  assert.match(workflowSource, /Package resources are missing python-3\.13\.14-amd64\.exe/);
  assert.match(workflowSource, /Package resources are missing node-\$\{env:NODE_RUNTIME_VERSION\}-win-x64\.zip/);
  assert.doesNotMatch(workflowSource, /\$packageRoot\/安装资源/);
  assert.doesNotMatch(workflowSource, /\$packageRoot\/双击安装\.exe/);
  assert.equal(workflowSource.includes("请先解压后运行安装程序"), false);
  assert.match(workflowSource, /Compress-Archive/);
  assert.match(workflowSource, /-Path "\$packageRoot\/\*"/);
  assert.match(workflowSource, /CodexPlusOfficial-\$\{version\}-windows-x64\.zip/);
  assert.match(workflowSource, /dist\/windows\/CodexPlusOfficial-\$\{version\}-windows-x64-setup\.exe/);
  assert.match(workflowSource, /dist\/windows\/\*-online\.exe/);
  assert.match(workflowSource, /dist\/windows\/\*-updater\.exe/);
  assert.match(workflowSource, /dist\/windows\/\*\.zip/);
  assert.match(workflowSource, /dist\/windows\/\*-setup\.exe/);
});

test("release manifests separate automatic update from public downloads", () => {
  assert.match(workflowSource, /asset\.name !== "latest\.json"/);
  assert.match(workflowSource, /asset\.name !== "download-latest\.json"/);
  assert.match(workflowSource, /asset\.name !== "components\.json"/);
  assert.match(workflowSource, /latestPayload/);
  assert.match(workflowSource, /asset\.purpose === "updater"/);
  assert.match(workflowSource, /asset\.platform === "macos" && asset\.purpose === "installer"/);
  assert.match(workflowSource, /legacyWindowsUpdaterAliases/);
  assert.match(workflowSource, /-legacy-setup\.exe/);
  assert.match(workflowSource, /browser_download_url: asset\.browser_download_url/);
  assert.match(workflowSource, /downloadPayload/);
  assert.match(workflowSource, /\["installer", "offline"\]\.includes\(asset\.purpose\)/);
  assert.match(workflowSource, /lower\.endsWith\("\.dmg"\)[\s\S]*\? "installer"/);
  assert.match(workflowSource, /download-latest\.json/);
  assert.match(workflowSource, /components\.json/);
});

test("release workflow builds Windows and macOS release assets", () => {
  assert.match(workflowSource, /windows-installer:/);
  assert.match(workflowSource, /^  macos-dmg:/m);
  assert.match(workflowSource, /macos-15-intel/);
  assert.match(workflowSource, /macos-14/);
  assert.match(workflowSource, /Build macOS DMG/);
  assert.match(workflowSource, /package-dmg\.sh "\$version" "\$\{\{ matrix\.arch \}\}"/);
  assert.match(workflowSource, /dist\/macos\/\*\.dmg/);
  assert.match(workflowSource, /needs:\s*\n\s*- windows-installer/);
  assert.match(workflowSource, /needs:\s*\n\s*- windows-installer\s*\n\s*- macos-dmg/);
});

test("release workflow caches heavyweight dependencies and official app downloads", () => {
  assert.match(workflowSource, /cache: npm/);
  assert.match(workflowSource, /actions\/cache@v4/);
  assert.match(workflowSource, /Swatinem\/rust-cache@v2/);
  assert.match(workflowSource, /Cache Rust build artifacts/);
  assert.match(workflowSource, /mozilla-actions\/sccache-action/);
  assert.match(workflowSource, /Cache Codex Windows MSIX/);
  assert.match(workflowSource, /npm ci --prefer-offline --no-audit --no-fund/);
  assert.equal(workflowSource.includes("npm install --package-lock=false"), false);
});

test("release workflow bundles a managed Node runtime for clean computers", () => {
  assert.match(workflowSource, /NODE_WINDOWS_X64_ZIP_URL/);
  assert.match(workflowSource, /Cache Node Windows runtime/);
  assert.match(workflowSource, /Download Node Windows runtime/);
  assert.match(workflowSource, /dist\/windows\/package\/node-\$\{env:NODE_RUNTIME_VERSION\}-win-x64\.zip/);
  assert.match(workflowSource, /dist\/windows\/app\/resources\/node/);
  assert.match(workflowSource, /Embedded Node runtime is missing node\.exe/);
  assert.match(workflowSource, /Cache Node macOS runtime/);
  assert.match(workflowSource, /Download Node macOS runtime/);
  assert.match(workflowSource, /node-\$\{NODE_RUNTIME_VERSION\}-darwin-\$\{\{ matrix\.node_arch \}\}\.tar\.gz/);
  assert.match(workflowSource, /node_extract="\$RUNNER_TEMP\/codex-plus-node-\$\{\{ matrix\.arch \}\}"/);
  assert.match(workflowSource, /NODE_RUNTIME_SOURCE=\$node_root/);
  assert.match(workflowSource, /test -x "\$app\/Contents\/Resources\/node\/bin\/node"/);
});
