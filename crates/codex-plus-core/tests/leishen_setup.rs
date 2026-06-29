use codex_plus_core::leishen_setup::{
    build_codex_config_toml, parse_node_major, select_node_download,
};
use serde_json::json;

#[test]
fn parse_node_major_accepts_v_prefixed_and_plain_versions() {
    assert_eq!(parse_node_major("v24.18.0"), Some(24));
    assert_eq!(parse_node_major("20.11.1"), Some(20));
}

#[test]
fn parse_node_major_rejects_invalid_versions() {
    assert_eq!(parse_node_major("bad"), None);
}

#[test]
fn select_node_download_returns_matching_platform_and_arch() {
    let manifest = json!({
        "downloads": [
            {
                "platform": "darwin",
                "arch": "arm64",
                "file": "node-v24.18.0-darwin-arm64.tar.gz",
                "officialUrl": "https://nodejs.org/dist/v24.18.0/node-v24.18.0-darwin-arm64.tar.gz",
                "mirrorUrl": "https://ls-qihang.cn/node/node-v24.18.0-darwin-arm64.tar.gz",
                "sha256": "darwin-sha"
            },
            {
                "platform": "windows",
                "arch": "x64",
                "file": "node-v24.18.0-win-x64.zip",
                "officialUrl": "https://nodejs.org/dist/v24.18.0/node-v24.18.0-win-x64.zip",
                "mirrorUrl": "https://ls-qihang.cn/node/node-v24.18.0-win-x64.zip",
                "sha256": "windows-sha"
            }
        ]
    });

    let download = select_node_download(&manifest, "windows", "x64").unwrap();

    assert_eq!(download.platform, "windows");
    assert_eq!(download.arch, "x64");
    assert_eq!(download.file, "node-v24.18.0-win-x64.zip");
    assert!(download.mirror_url.starts_with("https://ls-qihang.cn/"));
}

#[test]
fn select_node_download_ignores_broken_non_matching_entries() {
    let manifest = json!({
        "downloads": [
            {
                "platform": "darwin",
                "arch": "arm64",
                "file": "node-v24.18.0-darwin-arm64.tar.gz"
            },
            {
                "platform": "windows",
                "arch": "x64",
                "file": "node-v24.18.0-win-x64.zip",
                "officialUrl": "https://nodejs.org/dist/v24.18.0/node-v24.18.0-win-x64.zip",
                "mirrorUrl": "https://ls-qihang.cn/node/node-v24.18.0-win-x64.zip",
                "sha256": "windows-sha"
            }
        ]
    });

    let download = select_node_download(&manifest, "windows", "x64").unwrap();

    assert_eq!(download.file, "node-v24.18.0-win-x64.zip");
}

#[test]
fn build_codex_config_toml_contains_leishen_crs_defaults() {
    let config = build_codex_config_toml("https://ls-qihang.cn/openai");

    assert!(config.contains("model_provider = \"crs\""));
    assert!(config.contains("base_url = \"https://ls-qihang.cn/openai\""));
    assert!(config.contains("wire_api = \"responses\""));
    assert!(config.contains("model_auto_compact_token_limit = 188888"));
}

#[test]
fn build_codex_config_toml_escapes_control_characters() {
    let config = build_codex_config_toml("https://ls-qihang.cn/openai?note=line1\nline2");
    let parsed: toml::Value = toml::from_str(&config).unwrap();

    assert_eq!(
        parsed["model_providers"]["crs"]["base_url"].as_str(),
        Some("https://ls-qihang.cn/openai?note=line1\nline2")
    );
}
