use codex_plus_core::update::{
    DEFAULT_LATEST_JSON_URL, DEFAULT_REPOSITORY, Release, download_asset_to, is_newer_version,
    parse_version_tag, release_from_github_payload, release_from_latest_json_payload,
    safe_asset_name, select_update_asset, validate_asset_sha256,
};
use serde_json::json;

#[test]
fn default_update_source_uses_leishen_latest_json() {
    assert_eq!(
        DEFAULT_LATEST_JSON_URL,
        "https://ls-qihang.cn/tools/codex-plus/latest.json"
    );
    assert!(
        !DEFAULT_LATEST_JSON_URL
            .to_ascii_lowercase()
            .contains("github")
    );
    assert_eq!(DEFAULT_REPOSITORY, "Leishen/CodexPlusLeishen");
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
fn leishen_version_comparison_uses_numeric_segments_before_suffix() {
    assert!(is_newer_version("v1.0.1-leishen.1", "v1.0.0-leishen.1").unwrap());
}

#[test]
fn leishen_version_comparison_uses_suffix_increment_for_same_base() {
    assert!(is_newer_version("v1.0.0-leishen.2", "v1.0.0-leishen.1").unwrap());
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
        "version": "v1.0.1-leishen.1",
        "url": "https://ls-qihang.cn/tools/codex-plus/releases/v1.0.1-leishen.1",
        "body": "雷神版更新",
        "assets": [
            {
                "name": "CodexPlusLeishen-1.0.1-leishen.1-windows-x64-setup.exe",
                "url": "https://ls-qihang.cn/tools/codex-plus/CodexPlusLeishen-1.0.1-leishen.1-windows-x64-setup.exe",
                "sha256": windows_sha
            },
            {
                "name": "CodexPlusLeishen-1.0.1-leishen.1-macos-x64.dmg",
                "url": "https://ls-qihang.cn/tools/codex-plus/CodexPlusLeishen-1.0.1-leishen.1-macos-x64.dmg",
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
fn asset_selection_accepts_leishen_style_desktop_artifacts() {
    let assets = vec![
        (
            "CodexPlusLeishen-1.0.1-leishen.1-windows-x64-setup.exe".to_string(),
            "https://ls-qihang.cn/tools/codex-plus/windows-setup.exe".to_string(),
        ),
        (
            "CodexPlusLeishen-1.0.1-leishen.1-macos-arm64.dmg".to_string(),
            "https://ls-qihang.cn/tools/codex-plus/macos-arm64.dmg".to_string(),
        ),
        (
            "CodexPlusLeishen-1.0.1-leishen.1-macos-x64.dmg".to_string(),
            "https://ls-qihang.cn/tools/codex-plus/macos-x64.dmg".to_string(),
        ),
    ];

    if cfg!(windows) {
        let selected = select_update_asset(&assets).unwrap();
        assert_eq!(
            selected.name,
            "CodexPlusLeishen-1.0.1-leishen.1-windows-x64-setup.exe"
        );
    } else if cfg!(target_os = "macos") {
        let selected = select_update_asset(&assets).unwrap();
        let expected = match std::env::consts::ARCH {
            "x86_64" => "CodexPlusLeishen-1.0.1-leishen.1-macos-x64.dmg",
            "aarch64" => "CodexPlusLeishen-1.0.1-leishen.1-macos-arm64.dmg",
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
fn validate_asset_sha256_accepts_uppercase_manifest_hash() {
    let release = Release {
        version: "v1.0.1-leishen.1".to_string(),
        url: "https://ls-qihang.cn/tools/codex-plus/releases/v1.0.1-leishen.1".to_string(),
        body: "雷神版更新".to_string(),
        asset_name: Some("pkg.zip".to_string()),
        asset_url: Some("https://ls-qihang.cn/tools/codex-plus/pkg.zip".to_string()),
        asset_sha256: Some(
            "2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824".to_string(),
        ),
    };

    validate_asset_sha256(&release, b"hello").unwrap();
}

#[test]
fn validate_asset_sha256_rejects_missing_manifest_hash() {
    let release = Release {
        version: "v1.0.1-leishen.1".to_string(),
        url: "https://ls-qihang.cn/tools/codex-plus/releases/v1.0.1-leishen.1".to_string(),
        body: "雷神版更新".to_string(),
        asset_name: Some("pkg.zip".to_string()),
        asset_url: Some("https://ls-qihang.cn/tools/codex-plus/pkg.zip".to_string()),
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
        version: "v1.0.1-leishen.1".to_string(),
        url: "https://ls-qihang.cn/tools/codex-plus/releases/v1.0.1-leishen.1".to_string(),
        body: "雷神版更新".to_string(),
        asset_name: Some("pkg.zip".to_string()),
        asset_url: Some("https://ls-qihang.cn/tools/codex-plus/pkg.zip".to_string()),
        asset_sha256: Some(
            "0000000000000000000000000000000000000000000000000000000000000000".to_string(),
        ),
    };

    let error = validate_asset_sha256(&release, b"hello")
        .unwrap_err()
        .to_string();

    assert!(error.contains("更新包校验失败"));
}
