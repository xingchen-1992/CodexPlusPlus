use codex_plus_core::assets::{force_chinese_locale_config, injection_script_with_settings};
use codex_plus_core::settings::BackendSettings;

#[test]
fn force_chinese_locale_defaults_to_true() {
    let settings = BackendSettings::default();
    assert!(settings.codex_app_force_chinese_locale);
    assert!(settings.codex_app_fast_startup);

    let json = serde_json::to_value(&settings).expect("serialize default settings");
    assert_eq!(
        json.get("codexAppForceChineseLocale")
            .and_then(|v| v.as_bool()),
        Some(true),
        "default BackendSettings JSON should include codexAppForceChineseLocale = true"
    );
    assert_eq!(
        json.get("codexAppFastStartup").and_then(|v| v.as_bool()),
        Some(true),
        "default BackendSettings JSON should include codexAppFastStartup = true"
    );
}

#[test]
fn force_chinese_locale_missing_from_old_json_defaults_to_true() {
    let json = serde_json::json!({
        "codexAppPath": "",
        "enhancementsEnabled": true,
    });

    let parsed: BackendSettings = serde_json::from_value(json)
        .expect("old settings JSON without codexAppForceChineseLocale should still load");
    assert!(parsed.codex_app_force_chinese_locale);
    assert!(parsed.codex_app_fast_startup);
}

#[test]
fn force_chinese_locale_false_round_trips_through_json() {
    let mut settings = BackendSettings::default();
    settings.codex_app_force_chinese_locale = false;

    let json = serde_json::to_value(&settings).expect("serialize");
    assert_eq!(
        json.get("codexAppForceChineseLocale")
            .and_then(|v| v.as_bool()),
        Some(false)
    );

    let parsed: BackendSettings =
        serde_json::from_value(json).expect("deserialize codexAppForceChineseLocale");
    assert!(!parsed.codex_app_force_chinese_locale);
}

#[test]
fn force_chinese_locale_config_reflects_setting() {
    let mut settings = BackendSettings::default();
    assert_eq!(
        force_chinese_locale_config(&settings),
        serde_json::json!({ "enabled": true, "locale": "zh-CN" })
    );

    settings.codex_app_force_chinese_locale = false;
    assert_eq!(
        force_chinese_locale_config(&settings),
        serde_json::json!({ "enabled": false, "locale": "zh-CN" })
    );
}

#[test]
fn injection_script_includes_force_chinese_locale_global_and_patch() {
    let mut settings = BackendSettings::default();
    settings.codex_app_force_chinese_locale = true;
    settings.codex_app_fast_startup = true;
    let script = injection_script_with_settings(0, &settings);
    assert!(script.contains(
        "window.__CODEX_PLUS_FORCE_CHINESE_LOCALE__ = {\"enabled\":true,\"locale\":\"zh-CN\"};"
    ));
    assert!(script.contains(
        "window.__CODEX_PLUS_FAST_STARTUP__ = {\"enabled\":true,\"statsigTimeoutMs\":800};"
    ));
    assert!(script.contains("__codexPlusForceChineseLocaleInstalled"));
    assert!(script.contains("__codexPlusFastStartupInstalled"));
    assert!(script.contains("__codexPlusChineseTextFallbackInstalled"));
    assert!(script.contains("__codexPlusSuppressOfficialAppUpdatesInstalled"));
    assert!(script.contains("data-codex-plus-official-update-hidden"));
    assert!(script.contains("20260702-i18n-targets-v2"));
    assert!(script.contains("20260702-recursive-i18n-assets-v5"));
    assert!(script.contains("72216192"));
    assert!(script.contains("enable_i18n"));
    assert!(script.contains("locale_source"));
    assert!(script.contains("localeOverride"));
    assert!(script.contains("chatgpt.localeOverride"));
    assert!(script.contains("storageCtor.prototype"));
    assert!(script.contains("localeOverrideKeys.forEach((key) => storage.setItem(key, locale))"));
    assert!(script.contains("document.documentElement.lang = locale"));
    assert!(script.contains("forceLocaleFlagsInValue"));
    assert!(script.contains("patchLocaleConfigFetch"));
    assert!(script.contains("return patchI18nConfig(originalGetDynamicConfig(name, options));"));
    assert!(!script.contains("name === \"72216192\" ? patchI18nConfig(result) : result"));
    assert!(script.contains("What should we work on?"));
    assert!(script.contains("选择项目"));
    assert!(script.contains("Extend Codex's capabilities with task-specific skills"));
    assert!(script.contains("通过任务专用技能扩展 Codex 的能力"));
    assert!(script.contains("Back to app"));
    assert!(script.contains("返回应用"));
    assert!(script.contains("Default permissions"));
    assert!(script.contains("默认权限"));
    assert!(script.contains("Default file open destination"));
    assert!(script.contains("默认文件打开目标"));
    assert!(script.contains("Language for the app UI"));
    assert!(script.contains("应用 UI 语言"));
    assert!(script.contains("Integrated terminal shell"));
    assert!(script.contains("集成终端 Shell"));
    assert!(script.contains("Bottom panel"));
    assert!(script.contains("底部面板"));
    assert!(script.contains("Default terminal location"));
    assert!(script.contains("默认终端位置"));
    assert!(script.contains("Learn more"));
    assert!(script.contains("了解更多"));
    assert!(script.contains("Process Manager"));
    assert!(script.contains("进程管理器"));
    assert!(script.contains("Approval policy"));
    assert!(script.contains("审批策略"));
    assert!(script.contains("Command menu"));
    assert!(script.contains("命令菜单"));
    assert!(script.contains("Search shortcuts"));
    assert!(script.contains("搜索快捷键"));
    assert!(script.contains("Keybinding"));
    assert!(script.contains("按键绑定"));
    assert!(script.contains("Archive the current chat"));
    assert!(script.contains("归档当前聊天"));
    assert!(script.contains("Open the current chat in a side chat"));
    assert!(script.contains("在侧边聊天中打开当前聊天"));
    assert!(script.contains("Pin or unpin the current chat"));
    assert!(script.contains("置顶或取消置顶当前聊天"));
    assert!(script.contains("Codex dependencies look healthy"));
    assert!(script.contains("Codex 依赖状态正常"));
    assert!(script.contains("mergeOfficialChineseTranslations"));
    assert!(script.contains("parseOfficialDefaultMessages"));
    assert!(script.contains("officialChineseMessages"));
    assert!(script.contains("__codexPlusOfficialChineseMessageCount"));
    assert!(script.contains("performance.getEntriesByType(\"resource\")"));
    assert!(script.contains("startOfficialTranslationScanner"));
    assert!(script.contains("crawlOfficialDefaultMessageAssets"));
    assert!(script.contains("__codexPlusOfficialAssetCrawlCount"));
    assert!(script.contains("officialAssetCrawlLimit"));
    assert!(script.contains("Open source licenses"));
    assert!(script.contains("打开源许可证"));
    assert!(script.contains("Local URL open destination"));
    assert!(script.contains("本地 URL 打开目标位置"));
    assert!(script.contains("No hooks found"));
    assert!(script.contains("未找到钩子"));
    assert!(!script.contains("isTranslatableOfficialMessageId"));
    assert!(script.contains("zh-CN-"));
    assert!(script.contains("moreSkillsMatch"));
    assert!(script.contains("pendingRoots"));
    assert!(script.contains("shadowRoot"));
    assert!(script.contains("observeMutations(element.shadowRoot)"));
    assert!(script.contains("MutationObserver"));

    settings.codex_app_force_chinese_locale = false;
    let script = injection_script_with_settings(0, &settings);
    assert!(script.contains(
        "window.__CODEX_PLUS_FORCE_CHINESE_LOCALE__ = {\"enabled\":false,\"locale\":\"zh-CN\"};"
    ));
}
