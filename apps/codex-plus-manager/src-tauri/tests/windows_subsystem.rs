#[cfg(windows)]
#[test]
fn manager_binary_uses_windows_gui_subsystem_in_debug_and_release() {
    let main_rs = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/src/main.rs"))
        .expect("read manager main.rs");

    assert!(
        main_rs.contains("#![cfg_attr(windows, windows_subsystem = \"windows\")]"),
        "manager binary should not allocate a console window on Windows"
    );
}

#[test]
fn manager_release_binary_uses_embedded_frontend_assets() {
    let cargo_toml = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/Cargo.toml"))
        .expect("read manager Cargo.toml");

    assert!(
        cargo_toml.contains("custom-protocol"),
        "release manager binary should use Tauri custom protocol instead of devUrl localhost"
    );
}

#[test]
fn manager_uses_single_instance_guard_before_starting_tauri() {
    let lib_rs = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/src/lib.rs"))
        .expect("read manager lib.rs");

    assert!(lib_rs.contains("acquire_single_instance_guard()"));
    assert!(lib_rs.contains("manager_guard_port"));
    assert!(lib_rs.contains("manager.already_running"));
}

#[test]
fn manager_queues_codexplustaiying_provider_urls_for_confirmation_on_startup() {
    let main_rs = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/src/main.rs"))
        .expect("read manager main.rs");

    assert!(main_rs.contains("codexplustaiying://"));
    assert!(main_rs.contains("provider_import::save_pending_provider_import_from_url"));
    assert!(!main_rs.contains("provider_import::import_provider_from_url"));
    assert!(main_rs.contains("manager.provider_import_url.pending"));
}

#[test]
fn launcher_binary_embeds_codex_icon_resource() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let launcher_build = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .unwrap()
        .join("codex-plus-launcher/build.rs");
    let build_rs = std::fs::read_to_string(&launcher_build).expect("read launcher build.rs");

    assert!(build_rs.contains("WindowsResource"));
    assert!(build_rs.contains("icons/icon.ico"));
}

#[test]
fn windows_binaries_request_administrator_privileges() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let manager_build =
        std::fs::read_to_string(manifest_dir.join("build.rs")).expect("read manager build.rs");
    let windows_manifest = std::fs::read_to_string(manifest_dir.join("windows-app-manifest.xml"))
        .expect("read windows app manifest");
    let launcher_build = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .unwrap()
        .join("codex-plus-launcher/build.rs");
    let launcher_build = std::fs::read_to_string(&launcher_build).expect("read launcher build.rs");
    let windows_installer = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .and_then(std::path::Path::parent)
        .unwrap()
        .join("scripts/installer/windows/CodexPlusPlus.nsi");
    let windows_installer =
        std::fs::read_to_string(&windows_installer).expect("read windows installer");

    assert!(manager_build.contains("windows-app-manifest.xml"));
    assert!(launcher_build.contains("windows-app-manifest.xml"));
    assert!(windows_manifest.contains("requireAdministrator"));
    assert!(windows_manifest.contains("Microsoft.Windows.Common-Controls"));
    assert!(windows_installer.contains("RequestExecutionLevel admin"));
}

#[test]
fn windows_installer_uses_taiying_setup_filename() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let windows_installer = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .and_then(std::path::Path::parent)
        .unwrap()
        .join("scripts/installer/windows/CodexPlusPlus.nsi");
    let windows_installer =
        std::fs::read_to_string(&windows_installer).expect("read windows installer");

    assert!(windows_installer.contains("CodexPlusTaiying-${VERSION}-windows-x64-setup.exe"));
    assert!(windows_installer.contains("Name \"Codex 泰盈定制版\""));
    assert!(windows_installer.contains("InstallDir \"$LOCALAPPDATA\\Programs\\Codex 泰盈定制版\""));
    assert!(windows_installer.contains("SetOutPath \"$INSTDIR\\app\""));
    assert!(
        windows_installer
            .contains("InstallDirRegKey HKCU \"Software\\CodexPlusTaiying\" \"InstallDir\"")
    );
    assert!(windows_installer.contains(
        "CreateShortcut \"$INSTDIR\\Codex 泰盈定制版管理工具.lnk\" \"$INSTDIR\\app\\codex-plus-plus-manager.exe\""
    ));
    assert!(windows_installer.contains("Section \"创建桌面快捷方式\""));
    assert!(windows_installer.contains("CreateShortcut \"$DESKTOP\\Codex 泰盈定制版.lnk\""));
    assert!(
        windows_installer.contains("CreateShortcut \"$DESKTOP\\Codex 泰盈定制版管理工具.lnk\"")
    );
    assert!(windows_installer.contains("!define MUI_FINISHPAGE_RUN_FUNCTION LaunchInstalledApps"));
    assert!(
        windows_installer
            .contains("ExecShell \"open\" \"$INSTDIR\\app\\codex-plus-plus-manager.exe\"")
    );
    assert!(
        windows_installer.contains("ExecShell \"open\" \"$INSTDIR\\app\\codex-plus-plus.exe\"")
    );
    assert!(
        windows_installer.contains(
            "WriteRegStr HKCU \"Software\\CodexPlusTaiying\" \"InstallDir\" \"$INSTDIR\""
        )
    );
    assert!(windows_installer.contains(
        "WriteRegStr HKCU \"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CodexPlusTaiying\" \"DisplayName\" \"Codex 泰盈定制版\""
    ));
    assert!(windows_installer.contains(
        "WriteRegStr HKCU \"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CodexPlusTaiying\" \"Publisher\" \"泰盈\""
    ));
}

#[test]
fn windows_entrypoints_register_codexplustaiying_url_protocol() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let windows_install = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .and_then(std::path::Path::parent)
        .unwrap()
        .join("crates/codex-plus-core/src/install/windows.rs");
    let windows_install =
        std::fs::read_to_string(&windows_install).expect("read windows install source");

    assert!(windows_install.contains("Software\\Classes\\codexplustaiying"));
    assert!(windows_install.contains("URL Protocol"));
    assert!(windows_install.contains("%1"));
}

#[test]
fn manager_launch_button_spawns_silent_launcher_binary() {
    let commands_rs =
        std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/src/commands.rs"))
            .expect("read manager commands.rs");

    assert!(commands_rs.contains("SILENT_BINARY"));
    assert!(commands_rs.contains("std::process::Command::new"));
    assert!(!commands_rs.contains("launch_and_inject_with_hooks(options"));
}

#[test]
fn taiying_macos_packager_hides_silent_launcher_but_not_manager_and_uses_dmg_filename() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let packager = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .and_then(std::path::Path::parent)
        .unwrap()
        .join("scripts/installer/macos/package-dmg.sh");
    let script = std::fs::read_to_string(&packager).expect("read macOS packager");

    assert!(script.contains("<key>LSUIElement</key>"));
    assert!(script.contains("ARCH=\"${2:-$(uname -m)}\""));
    assert!(script.contains("BINARY_DIR=\"${BINARY_DIR:-$ROOT/target/release}\""));
    assert!(script.contains("CodexPlusTaiying-${VERSION}-macos-${ARCH}.dmg"));
    assert!(script.contains(
        "create_app \"Codex 泰盈定制版\" \"CodexPlusPlus\" \"$BINARY_DIR/codex-plus-plus\" \"cn.ls-qihang.codexplusplus\" \"true\""
    ));
    assert!(script.contains(
        "create_app \"Codex 泰盈定制版管理工具\" \"CodexPlusPlusManager\" \"$BINARY_DIR/codex-plus-plus-manager\" \"cn.ls-qihang.codexplusplus.manager\" \"false\""
    ));
    assert!(script.contains("hdiutil create -volname \"Codex 泰盈定制版\""));
}

#[test]
fn github_release_workflow_builds_separate_taiying_macos_x64_and_arm64_dmgs() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let workflow = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .and_then(std::path::Path::parent)
        .unwrap()
        .join(".github/workflows/release-assets.yml");
    let workflow = std::fs::read_to_string(&workflow).expect("read release assets workflow");

    assert!(workflow.contains("macos-15-intel"));
    assert!(workflow.contains("x86_64-apple-darwin"));
    assert!(workflow.contains("macos-14"));
    assert!(workflow.contains("aarch64-apple-darwin"));
    assert!(workflow.contains("package-dmg.sh \"$VERSION\" \"${{ matrix.arch }}\""));
    assert!(workflow.contains("target/${{ matrix.target }}/release"));
    assert!(workflow.contains("files: dist/macos/*.dmg"));
    assert!(workflow.contains("dist/macos/stage/Codex 泰盈定制版.app"));
    assert!(workflow.contains("dist/macos/stage/Codex 泰盈定制版管理工具.app"));
    assert!(!workflow.contains("CodexPlusPlus-${VERSION}-macos-${ARCH}.dmg"));
}

#[test]
fn github_release_workflow_uploads_static_latest_json() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let workflow = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .and_then(std::path::Path::parent)
        .unwrap()
        .join(".github/workflows/release-assets.yml");
    let workflow = std::fs::read_to_string(&workflow).expect("read release assets workflow");

    assert!(workflow.contains("latest-json:"));
    assert!(workflow.contains("latest.json"));
    assert!(workflow.contains("gh release upload \"$TAG\" latest.json --clobber"));
}

#[test]
fn github_pr_build_artifacts_use_taiying_names() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let workflow = manifest_dir
        .parent()
        .and_then(std::path::Path::parent)
        .and_then(std::path::Path::parent)
        .unwrap()
        .join(".github/workflows/pr-build.yml");
    let workflow = std::fs::read_to_string(&workflow).expect("read PR build workflow");

    assert!(workflow.contains("codex-plus-taiying-windows-binaries"));
    assert!(workflow.contains("codex-plus-taiying-windows-installer"));
    assert!(workflow.contains("codex-plus-taiying-macos-${{ matrix.arch }}-dmg"));
    assert!(workflow.contains("dist/macos/stage/Codex 泰盈定制版.app"));
    assert!(workflow.contains("dist/macos/stage/Codex 泰盈定制版管理工具.app"));
    assert!(!workflow.contains("codex-plus-plus-windows-installer"));
    assert!(!workflow.contains("codex-plus-plus-macos-${{ matrix.arch }}-dmg"));
}

#[test]
fn relay_settings_keeps_profile_config_and_auth_files_isolated() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let app_tsx = manifest_dir.parent().unwrap().join("src/App.tsx");
    let app_tsx = std::fs::read_to_string(&app_tsx).expect("read manager App.tsx");
    let commands_rs = manifest_dir.join("src/commands.rs");
    let commands_rs = std::fs::read_to_string(&commands_rs).expect("read manager commands.rs");

    assert!(app_tsx.contains("snapshotActiveRelayFilesBeforeSwitch"));
    assert!(app_tsx.contains("backfill_relay_profile_from_live"));
    assert!(app_tsx.contains("relayProfileSwitchValidation(selectedBeforeSave)"));
    assert!(app_tsx.contains("缺少独立 config.toml"));
    assert!(app_tsx.contains("const command = relayProfileSwitchCommand(selectedAfterSave)"));
    assert!(app_tsx.contains("function relayProfileSwitchCommand"));
    assert!(app_tsx.contains("return \"apply_pure_api_injection\""));
    assert!(app_tsx.contains("return \"apply_relay_injection\""));
    assert!(app_tsx.contains("const createNewAggregateProfile = () =>"));
    assert!(app_tsx.contains("onClick={createNewAggregateProfile}"));
    assert!(app_tsx.contains("已打开聚合供应商详情"));
    assert!(!commands_rs.contains("缺少独立 auth.json"));
    assert!(commands_rs.contains("backfill_relay_profile_from_live"));
    assert!(commands_rs.contains("apply_relay_profile_to_home_with_switch_rules"));
}

#[test]
fn relay_context_management_is_global_not_supplier_scoped() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let app_tsx = manifest_dir.parent().unwrap().join("src/App.tsx");
    let app_tsx = std::fs::read_to_string(&app_tsx).expect("read manager App.tsx");
    let styles = manifest_dir.parent().unwrap().join("src/styles.css");
    let styles = std::fs::read_to_string(&styles).expect("read manager styles.css");

    assert!(app_tsx.contains("作为全局配置独立管理"));
    assert!(app_tsx.contains("label: \"工具与插件\""));
    assert!(app_tsx.contains("title=\"Codex 工具与插件\""));
    assert!(!app_tsx.contains("label: \"上下文配置\""));
    assert!(!app_tsx.contains("title=\"上下文配置\""));
    assert!(!app_tsx.contains("<strong>Codex 上下文</strong>"));
    assert!(app_tsx.contains("id: \"context\""));
    assert!(app_tsx.contains("function ContextScreen"));
    assert!(app_tsx.contains("route === \"context\""));
    assert!(app_tsx.contains("if (next === \"context\")"));
    assert!(app_tsx.contains("selectedContextConfigToml(entries)"));
    assert!(app_tsx.contains("toggleContextEntryEnabled"));
    assert!(app_tsx.contains("relayFiles={relayFiles}"));
    assert!(app_tsx.contains("read_live_context_entries"));
    assert!(app_tsx.contains("sync_live_context_entries"));
    assert!(app_tsx.contains("refreshLiveContextEntries"));
    assert!(app_tsx.contains("syncLiveContextEntries(next, true)"));
    assert!(app_tsx.contains("function contextEntriesWithLiveEntries"));
    assert!(app_tsx.contains("liveByKind"));
    assert!(app_tsx.contains("mergeLiveContextEntries"));
    assert!(app_tsx.contains("withLiveEntryState"));
    assert!(app_tsx.contains("contextEnabledSwitch"));
    assert!(!app_tsx.contains("entry.enabled ? \"已启用\" : \"已禁用\""));
    assert!(!app_tsx.contains("空配置体"));
    assert!(app_tsx.contains("relay-context-delete"));
    assert!(!app_tsx.contains("切换供应商时只合并勾选项"));
    assert!(!app_tsx.contains("未勾选的条目不会写入"));
    assert!(!app_tsx.contains("className=\"context-switch\""));
    assert!(!styles.contains(".context-switch {"));
    assert!(styles.contains(".context-enabled-switch"));
    assert!(styles.contains(".context-switch-track"));
    assert!(styles.contains(".context-switch-thumb"));
    assert!(!styles.contains(".relay-context-row code"));
    assert!(styles.contains(".relay-context-delete"));
}

#[test]
fn manager_window_and_relay_detail_header_stay_usable_with_taiying_title() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let app_tsx = manifest_dir.parent().unwrap().join("src/App.tsx");
    let app_tsx = std::fs::read_to_string(&app_tsx).expect("read manager App.tsx");
    let main_tsx = manifest_dir.parent().unwrap().join("src/main.tsx");
    let main_tsx = std::fs::read_to_string(&main_tsx).expect("read manager main.tsx");
    let styles = manifest_dir.parent().unwrap().join("src/styles.css");
    let styles = std::fs::read_to_string(&styles).expect("read manager styles.css");
    let lib_rs =
        std::fs::read_to_string(manifest_dir.join("src/lib.rs")).expect("read manager lib.rs");
    let tauri_conf =
        std::fs::read_to_string(manifest_dir.join("tauri.conf.json")).expect("read tauri config");

    assert!(app_tsx.contains("relay-detail-sticky"));
    assert!(!app_tsx.contains("CardHead title=\"供应商详情\""));
    assert!(styles.contains(".relay-detail-sticky"));
    assert!(styles.contains("position: sticky"));
    assert!(styles.contains("top: 0"));
    assert!(styles.contains("margin: 0"));
    assert!(lib_rs.contains(".inner_size(1180.0, 820.0)"));
    assert!(lib_rs.contains(".min_inner_size(960.0, 720.0)"));
    assert!(lib_rs.contains(".visible(true)"));
    assert!(!lib_rs.contains("is_minimized()"));
    assert!(lib_rs.contains(".background_color(tauri::window::Color(24, 24, 24, 255))"));
    assert!(lib_rs.contains(".title(\"Codex 泰盈定制版管理工具\")"));
    assert!(main_tsx.contains("currentWindow.show()"));
    assert!(tauri_conf.contains("\"productName\": \"Codex 泰盈定制版管理工具\""));
    assert!(tauri_conf.contains("\"title\": \"Codex 泰盈定制版管理工具\""));
    assert!(tauri_conf.contains("\"width\": 1180"));
    assert!(tauri_conf.contains("\"height\": 820"));
    assert!(tauri_conf.contains("\"minWidth\": 960"));
    assert!(tauri_conf.contains("\"minHeight\": 720"));
}

#[test]
fn overview_moves_subscription_and_codex_actions_into_balance_card() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let app_tsx = manifest_dir.parent().unwrap().join("src/App.tsx");
    let app_tsx = std::fs::read_to_string(&app_tsx).expect("read manager App.tsx");
    let balance_panel = manifest_dir
        .parent()
        .unwrap()
        .join("src/components/LeishenBalancePanel.tsx");
    let balance_panel = std::fs::read_to_string(&balance_panel).expect("read balance panel");

    assert!(!app_tsx.contains("Leishen 中转服务"));
    assert!(!app_tsx.contains("打开订阅中心"));
    assert!(app_tsx.contains(
        "codexReady={Boolean(overview?.codex_version || overview?.codex_app.status === \"found\")}"
    ));
    assert!(app_tsx.contains("id: \"subscription\", label: \"订阅中心\""));
    assert!(app_tsx.contains("onOpenSubscription={() => void actions.goSubscriptionCenter()}"));
    assert!(app_tsx.contains("function SubscriptionCenterScreen"));
    assert!(app_tsx.contains("src={SUBSCRIPTION_CENTER_EMBED_URL}"));
    assert!(app_tsx.contains("subscription-center-route"));
    assert!(app_tsx.contains("route === \"subscription\" ? \"contents\" : \"none\""));
    assert!(app_tsx.contains("const [frameLoaded, setFrameLoaded] = useState(false);"));
    assert!(app_tsx.contains("onLoad={() => setFrameLoaded(true)}"));
    assert!(!app_tsx.contains("浏览器打开"));
    assert!(!app_tsx.contains("只使用泰盈订阅入口，不展示其它第三方平台。"));
    assert!(app_tsx.contains("onInstallCodex={() => void actions.installEntrypoints()}"));
    assert!(app_tsx.contains("onOpenCodex={() => void actions.launch()}"));
    assert!(balance_panel.contains("购买额度"));
    assert!(balance_panel.contains("打开 Codex"));
    assert!(balance_panel.contains("安装 Codex"));
    assert!(!balance_panel.contains("泰盈订阅"));
    assert!(balance_panel.contains("className=\"leishen-balance-action-open\""));
    assert!(balance_panel.contains("className=\"leishen-balance-action-refresh\""));
    let setup_panel_index = app_tsx.find("<LeishenSetupPanel />").expect("setup panel");
    let balance_panel_index = app_tsx.find("<LeishenBalancePanel").expect("balance panel");
    assert!(balance_panel_index < setup_panel_index);
    assert!(!app_tsx.contains("key={`topbar-${route}`}"));
    assert!(!app_tsx.contains("<section className=\"screen\" key={route}>"));
}

#[test]
fn relay_preview_deduplicates_root_keys_when_merging_common_config() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let app_tsx = manifest_dir.parent().unwrap().join("src/App.tsx");
    let app_tsx = std::fs::read_to_string(&app_tsx).expect("read manager App.tsx");

    assert!(app_tsx.contains("dedupeTomlRootLines"));
    assert!(app_tsx.contains("rootSeen.add(key)"));
    assert!(app_tsx.contains("joinTomlSectionsRootFirst"));
}

#[test]
fn provider_presets_only_include_taiying_and_openai() {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let presets = manifest_dir.parent().unwrap().join("src/presets.ts");
    let presets = std::fs::read_to_string(&presets).expect("read manager presets.ts");

    assert!(presets.contains("id: \"leishen\""));
    assert!(presets.contains("name: \"泰盈 AI\""));
    assert!(presets.contains("category: \"aggregator\""));
    assert!(presets.contains("baseUrl: \"https://ls-qihang.cn/openai\""));
    assert!(presets.contains("id: \"openai\""));
    assert!(presets.contains("name: \"OpenAI Official\""));
    assert!(!presets.contains("id: \"runapi\""));
}
