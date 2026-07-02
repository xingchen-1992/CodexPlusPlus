use codex_plus_core::update::{
    DEFAULT_LATEST_JSON_URL, Release, create_pre_update_backup_from_sources, download_asset_to,
    is_newer_version, is_update_available_for_release, parse_version_tag,
    prepare_installer_for_launch, release_from_github_payload, release_from_latest_json_payload,
    resolve_manifest_asset_url, safe_asset_name, select_update_asset,
    select_update_asset_for_target, validate_asset_sha256,
};
use serde_json::json;
use std::io::Write;
use std::path::PathBuf;

#[test]
fn default_update_source_uses_official_latest_json() {
    assert_eq!(
        DEFAULT_LATEST_JSON_URL,
        "https://www.leishen-ai.cn/tools/codex-plus/latest.json"
    );
    assert!(
        !DEFAULT_LATEST_JSON_URL
            .to_ascii_lowercase()
            .contains("github")
    );
}

#[test]
fn parse_version_tag_accepts_prefix_and_suffix() {
    assert_eq!(parse_version_tag("v1.2.3").unwrap(), vec![1, 2, 3]);
    assert_eq!(parse_version_tag("1.2.3").unwrap(), vec![1, 2, 3]);
    assert_eq!(parse_version_tag("v1.2.3-beta.1").unwrap(), vec![1, 2, 3]);
}

#[test]
fn version_comparison_uses_numeric_segments() {
    assert!(is_newer_version("v1.0.10", "1.0.4").unwrap());
    assert!(!is_newer_version("v1.0.4", "1.0.4").unwrap());
    assert!(!is_newer_version("v1.0.3", "1.0.4").unwrap());
}

#[test]
fn official_version_comparison_uses_numeric_segments_before_suffix() {
    assert!(is_newer_version("v1.0.1-official.1", "v1.0.0-official.1").unwrap());
}

#[test]
fn official_version_comparison_uses_suffix_increment_for_same_base() {
    assert!(is_newer_version("v1.0.0-official.2", "v1.0.0-official.1").unwrap());
}

#[test]
fn official_base_version_updates_old_official_builds() {
    assert!(is_newer_version("v1.0.7-official.2", "v1.0.5-official.7").unwrap());
}

#[test]
fn update_check_requires_a_platform_asset() {
    let release = Release {
        version: "v1.0.15-official.1".to_string(),
        url: "https://www.leishen-ai.cn/tools/codex-plus/latest.json".to_string(),
        body: "Windows-only".to_string(),
        asset_name: None,
        asset_url: None,
        asset_sha256: None,
    };

    assert!(!is_update_available_for_release(&release, "1.0.14-official.2").unwrap());
}

#[test]
fn update_check_accepts_a_newer_release_with_platform_asset() {
    let release = Release {
        version: "v1.0.15-official.1".to_string(),
        url: "https://www.leishen-ai.cn/tools/codex-plus/latest.json".to_string(),
        body: "Windows setup".to_string(),
        asset_name: Some("CodexPlusOfficial-1.0.15-official.1-windows-x64-setup.exe".to_string()),
        asset_url: Some("https://www.leishen-ai.cn/tools/codex-plus/setup.exe".to_string()),
        asset_sha256: None,
    };

    assert!(is_update_available_for_release(&release, "1.0.14-official.2").unwrap());
}

#[test]
fn github_payload_selects_platform_installer() {
    let release = release_from_github_payload(&json!({
        "tag_name": "v1.0.9",
        "html_url": "https://github.com/BigPizzaV3/CodexPlusPlus/releases/tag/v1.0.9",
        "body": "fixes",
        "assets": [
            {"name": "source.zip", "browser_download_url": "https://example.test/source.zip"},
            {"name": "codex-plus-plus-manager.exe", "browser_download_url": "https://example.test/manager.exe"},
            {"name": "CodexPlusPlus_1.0.9_x64-setup.exe", "browser_download_url": "https://example.test/setup.exe"},
            {"name": "CodexPlusPlus_1.0.9_x64.dmg", "browser_download_url": "https://example.test/app.dmg"}
        ]
    }))
    .unwrap();

    assert_eq!(release.version, "v1.0.9");
    if cfg!(windows) {
        assert_eq!(
            release.asset_name.as_deref(),
            Some("CodexPlusPlus_1.0.9_x64-setup.exe")
        );
    } else if cfg!(target_os = "macos") {
        assert_eq!(
            release.asset_name.as_deref(),
            Some("CodexPlusPlus_1.0.9_x64.dmg")
        );
    } else {
        assert_eq!(release.asset_name.as_deref(), None);
    }
}

#[test]
fn github_payload_accepts_sha256_digest_field() {
    let windows_sha = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
    let macos_sha = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    let release = release_from_github_payload(&json!({
        "tag_name": "v1.0.9",
        "html_url": "https://github.com/BigPizzaV3/CodexPlusPlus/releases/tag/v1.0.9",
        "body": "fixes",
        "assets": [
            {
                "name": "CodexPlusPlus_1.0.9_x64-setup.exe",
                "browser_download_url": "https://example.test/setup.exe",
                "digest": format!("sha256:{windows_sha}")
            },
            {
                "name": "CodexPlusPlus_1.0.9_x64.dmg",
                "browser_download_url": "https://example.test/app.dmg",
                "digest": format!("sha256:{macos_sha}")
            }
        ]
    }))
    .unwrap();

    if cfg!(windows) {
        assert_eq!(release.asset_sha256.as_deref(), Some(windows_sha));
    } else if cfg!(target_os = "macos") {
        assert_eq!(release.asset_sha256.as_deref(), Some(macos_sha));
    } else {
        assert_eq!(release.asset_sha256.as_deref(), None);
    }
}

#[test]
fn latest_json_payload_stores_selected_asset_sha256() {
    let windows_sha = "2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824";
    let macos_sha = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    let release = release_from_latest_json_payload(&json!({
        "version": "v1.0.1-official.1",
        "url": "https://www.leishen-ai.cn/tools/codex-plus/releases/v1.0.1-official.1",
        "body": "官方版更新",
        "assets": [
            {
                "name": "CodexPlusOfficial-1.0.1-official.1-windows-x64-setup.exe",
                "url": "https://www.leishen-ai.cn/tools/codex-plus/CodexPlusOfficial-1.0.1-official.1-windows-x64-setup.exe",
                "sha256": windows_sha
            },
            {
                "name": "CodexPlusOfficial-1.0.1-official.1-macos-x64.dmg",
                "url": "https://www.leishen-ai.cn/tools/codex-plus/CodexPlusOfficial-1.0.1-official.1-macos-x64.dmg",
                "sha256": macos_sha
            }
        ]
    }))
    .unwrap();

    if cfg!(windows) {
        assert_eq!(release.asset_sha256.as_deref(), Some(windows_sha));
    } else if cfg!(target_os = "macos") {
        assert_eq!(release.asset_sha256.as_deref(), Some(macos_sha));
    } else {
        assert_eq!(release.asset_sha256.as_deref(), None);
    }
}

#[test]
fn latest_json_payload_selects_platform_installer_without_github_api_shape() {
    let release = release_from_latest_json_payload(&json!({
        "version": "v1.1.6",
        "url": "https://github.com/BigPizzaV3/CodexPlusPlus/releases/tag/v1.1.6",
        "body": "静态更新描述",
        "assets": [
            {"name": "source.zip", "url": "https://example.test/source.zip"},
            {"name": "CodexPlusPlus-1.1.6-windows-x64-setup.exe", "url": "https://example.test/setup.exe"},
            {"name": "CodexPlusPlus-1.1.6-macos-x64.dmg", "url": "https://example.test/app.dmg"}
        ]
    }))
    .unwrap();

    assert_eq!(release.version, "v1.1.6");
    assert_eq!(release.body, "静态更新描述");
    if cfg!(windows) {
        assert_eq!(
            release.asset_name.as_deref(),
            Some("CodexPlusPlus-1.1.6-windows-x64-setup.exe")
        );
    } else if cfg!(target_os = "macos") {
        assert_eq!(
            release.asset_name.as_deref(),
            Some("CodexPlusPlus-1.1.6-macos-x64.dmg")
        );
    } else {
        assert_eq!(release.asset_name.as_deref(), None);
    }
}

#[test]
fn manifest_asset_urls_are_resolved_before_download() {
    let base = "https://www.leishen-ai.cn/tools/codex-plus/latest.json";

    assert_eq!(
        resolve_manifest_asset_url(
            "/tools/codex-plus/releases/v1.0.11-official.1/CodexPlusOfficial-1.0.11-official.1-windows-x64-setup.exe",
            Some(base),
        )
        .unwrap(),
        "https://www.leishen-ai.cn/tools/codex-plus/releases/v1.0.11-official.1/CodexPlusOfficial-1.0.11-official.1-windows-x64-setup.exe"
    );
    assert_eq!(
        resolve_manifest_asset_url("releases/v1.0.11-official.1/pkg.exe", Some(base)).unwrap(),
        "https://www.leishen-ai.cn/tools/codex-plus/releases/v1.0.11-official.1/pkg.exe"
    );
    assert_eq!(
        resolve_manifest_asset_url("https://example.test/pkg.exe", Some(base)).unwrap(),
        "https://example.test/pkg.exe"
    );
}

#[test]
fn asset_selection_accepts_official_style_desktop_artifacts() {
    let assets = vec![
        (
            "CodexPlusOfficial-1.0.1-official.1-windows-x64-setup.exe".to_string(),
            "https://www.leishen-ai.cn/tools/codex-plus/windows-setup.exe".to_string(),
        ),
        (
            "CodexPlusOfficial-1.0.1-official.1-macos-arm64.dmg".to_string(),
            "https://www.leishen-ai.cn/tools/codex-plus/macos-arm64.dmg".to_string(),
        ),
        (
            "CodexPlusOfficial-1.0.1-official.1-macos-x64.dmg".to_string(),
            "https://www.leishen-ai.cn/tools/codex-plus/macos-x64.dmg".to_string(),
        ),
    ];

    if cfg!(windows) {
        let selected = select_update_asset(&assets).unwrap();
        assert_eq!(
            selected.name,
            "CodexPlusOfficial-1.0.1-official.1-windows-x64-setup.exe"
        );
    } else if cfg!(target_os = "macos") {
        let selected = select_update_asset(&assets).unwrap();
        let expected = match std::env::consts::ARCH {
            "x86_64" => "CodexPlusOfficial-1.0.1-official.1-macos-x64.dmg",
            "aarch64" => "CodexPlusOfficial-1.0.1-official.1-macos-arm64.dmg",
            other => panic!("unexpected target arch in test: {other}"),
        };
        assert_eq!(selected.name, expected);
    } else {
        assert!(select_update_asset(&assets).is_none());
    }
}

#[test]
fn asset_selection_prefers_current_platform_artifacts() {
    let assets = vec![
        (
            "CodexPlusPlus.zip".to_string(),
            "https://example.test/source.zip".to_string(),
        ),
        (
            "codex-plus-plus-manager.exe".to_string(),
            "https://example.test/manager.exe".to_string(),
        ),
        (
            "CodexPlusPlus_1.0.9_x64-setup.exe".to_string(),
            "https://example.test/setup.exe".to_string(),
        ),
        (
            "CodexPlusPlus_1.0.9_x64.dmg".to_string(),
            "https://example.test/app.dmg".to_string(),
        ),
    ];

    if cfg!(windows) {
        let selected = select_update_asset(&assets).unwrap();
        assert_eq!(selected.name, "CodexPlusPlus_1.0.9_x64-setup.exe");
    } else if cfg!(target_os = "macos") {
        let selected = select_update_asset(&assets).unwrap();
        assert_eq!(selected.name, "CodexPlusPlus_1.0.9_x64.dmg");
    } else {
        assert!(select_update_asset(&assets).is_none());
    }
}

#[test]
fn windows_update_asset_selection_prefers_full_zip_over_standalone_setup() {
    let assets = vec![
        (
            "CodexPlusOfficial-1.0.17-official.1-windows-x64-setup.exe".to_string(),
            "https://example.test/setup.exe".to_string(),
        ),
        (
            "CodexPlusOfficial-1.0.17-official.1-windows-x64.zip".to_string(),
            "https://example.test/package.zip".to_string(),
        ),
    ];

    let selected = select_update_asset_for_target(&assets, "windows", "x86_64")
        .expect("Windows updater should select the full ZIP package");

    assert_eq!(
        selected.name,
        "CodexPlusOfficial-1.0.17-official.1-windows-x64.zip"
    );
}

#[test]
fn asset_selection_distinguishes_x64_and_arm64_macos_dmgs() {
    // Regression test for the bug where an x86_64 Mac user could be handed
    // the arm64 DMG (or vice versa) because `is_macos_installer_asset` did
    // not check the arch token in the filename.
    let assets = vec![
        (
            "CodexPlusPlus-1.2.17-macos-arm64.dmg".to_string(),
            "https://example.test/app-arm64.dmg".to_string(),
        ),
        (
            "CodexPlusPlus-1.2.17-macos-x64.dmg".to_string(),
            "https://example.test/app-x64.dmg".to_string(),
        ),
    ];

    if cfg!(target_os = "macos") {
        let selected = select_update_asset(&assets)
            .expect("a macOS DMG should be selected for the running arch");
        let expected = match std::env::consts::ARCH {
            "x86_64" => "CodexPlusPlus-1.2.17-macos-x64.dmg",
            "aarch64" => "CodexPlusPlus-1.2.17-macos-arm64.dmg",
            other => panic!("unexpected target arch in test: {other}"),
        };
        assert_eq!(
            selected.name, expected,
            "x86_64 binary must select x64 DMG, aarch64 binary must select arm64 DMG"
        );
    } else {
        // Non-macOS platforms should not pick either macOS DMG.
        assert!(select_update_asset(&assets).is_none());
    }
}

#[test]
fn safe_asset_name_rejects_path_traversal() {
    assert_eq!(safe_asset_name("pkg.zip").unwrap(), "pkg.zip");
    assert!(safe_asset_name("../pkg.zip").is_err());
    assert!(safe_asset_name("").is_err());
}

#[test]
fn download_asset_to_writes_bytes() {
    let dir = tempfile::tempdir().unwrap();
    let release = Release {
        version: "v1.0.9".to_string(),
        url: "https://example.test".to_string(),
        body: "fixes".to_string(),
        asset_name: Some("pkg.zip".to_string()),
        asset_url: Some("https://example.test/pkg.zip".to_string()),
        asset_sha256: None,
    };

    let path = download_asset_to(&release, b"abcdef", dir.path()).unwrap();

    assert_eq!(path, dir.path().join("pkg.zip"));
    assert_eq!(std::fs::read(path).unwrap(), b"abcdef");
}

#[test]
fn update_zip_is_extracted_and_launches_visible_root_setup() {
    let dir = tempfile::tempdir().unwrap();
    let zip_path = dir
        .path()
        .join("CodexPlusOfficial-1.0.13-official.7-windows-x64.zip");
    let file = std::fs::File::create(&zip_path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default();
    zip.start_file("点我双击安装.exe", options).unwrap();
    zip.write_all(b"fake setup").unwrap();
    zip.start_file("RequiredFiles/CodexOfficialApp-x64.msix", options)
        .unwrap();
    zip.write_all(b"fake msix").unwrap();
    zip.start_file("RequiredFiles/manifest.json", options)
        .unwrap();
    zip.write_all(b"{}").unwrap();
    zip.finish().unwrap();

    let launch_path = prepare_installer_for_launch(&zip_path).unwrap();

    assert_eq!(
        launch_path.file_name().and_then(|name| name.to_str()),
        Some("点我双击安装.exe")
    );
    assert!(launch_path.exists());
    assert!(
        launch_path
            .parent()
            .unwrap()
            .join("RequiredFiles")
            .join("CodexOfficialApp-x64.msix")
            .exists()
    );
}

#[test]
fn pre_update_backup_copies_existing_sensitive_config_files() {
    let dir = tempfile::tempdir().unwrap();
    let manager_settings = dir.path().join("settings.json");
    let codex_config = dir.path().join("config.toml");
    let codex_auth = dir.path().join("auth.json");
    std::fs::write(
        &manager_settings,
        r#"{"authContents":"{\"OPENAI_API_KEY\":\"sk-test\"}"}"#,
    )
    .unwrap();
    std::fs::write(&codex_config, r#"model_provider = "crs""#).unwrap();
    std::fs::write(&codex_auth, r#"{"OPENAI_API_KEY":"sk-test"}"#).unwrap();

    let backup = create_pre_update_backup_from_sources(
        &dir.path().join("backups"),
        &[
            (manager_settings, PathBuf::from("manager/settings.json")),
            (codex_config, PathBuf::from("codex/config.toml")),
            (codex_auth, PathBuf::from("codex/auth.json")),
        ],
    )
    .unwrap()
    .expect("existing config files should create a pre-update backup");

    assert!(backup.join("manager/settings.json").exists());
    assert!(backup.join("codex/config.toml").exists());
    assert_eq!(
        std::fs::read_to_string(backup.join("codex/auth.json")).unwrap(),
        r#"{"OPENAI_API_KEY":"sk-test"}"#
    );
}

#[test]
fn pre_update_backup_rejects_path_traversal_targets() {
    let dir = tempfile::tempdir().unwrap();
    let source = dir.path().join("settings.json");
    std::fs::write(&source, "{}").unwrap();

    let error = create_pre_update_backup_from_sources(
        &dir.path().join("backups"),
        &[(source, PathBuf::from("../settings.json"))],
    )
    .unwrap_err()
    .to_string();

    assert!(error.contains("非法更新前备份目标路径"));
}

#[test]
fn validate_asset_sha256_accepts_uppercase_manifest_hash() {
    let release = Release {
        version: "v1.0.1-official.1".to_string(),
        url: "https://www.leishen-ai.cn/tools/codex-plus/releases/v1.0.1-official.1".to_string(),
        body: "官方版更新".to_string(),
        asset_name: Some("pkg.zip".to_string()),
        asset_url: Some("https://www.leishen-ai.cn/tools/codex-plus/pkg.zip".to_string()),
        asset_sha256: Some(
            "2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824".to_string(),
        ),
    };

    validate_asset_sha256(&release, b"hello").unwrap();
}

#[test]
fn validate_asset_sha256_rejects_missing_manifest_hash() {
    let release = Release {
        version: "v1.0.1-official.1".to_string(),
        url: "https://www.leishen-ai.cn/tools/codex-plus/releases/v1.0.1-official.1".to_string(),
        body: "官方版更新".to_string(),
        asset_name: Some("pkg.zip".to_string()),
        asset_url: Some("https://www.leishen-ai.cn/tools/codex-plus/pkg.zip".to_string()),
        asset_sha256: None,
    };

    let error = validate_asset_sha256(&release, b"hello")
        .unwrap_err()
        .to_string();

    assert!(error.contains("更新清单缺少 sha256"));
}

#[test]
fn validate_asset_sha256_rejects_mismatch() {
    let release = Release {
        version: "v1.0.1-official.1".to_string(),
        url: "https://www.leishen-ai.cn/tools/codex-plus/releases/v1.0.1-official.1".to_string(),
        body: "官方版更新".to_string(),
        asset_name: Some("pkg.zip".to_string()),
        asset_url: Some("https://www.leishen-ai.cn/tools/codex-plus/pkg.zip".to_string()),
        asset_sha256: Some(
            "0000000000000000000000000000000000000000000000000000000000000000".to_string(),
        ),
    };

    let error = validate_asset_sha256(&release, b"hello")
        .unwrap_err()
        .to_string();

    assert!(error.contains("更新包校验失败"));
}
