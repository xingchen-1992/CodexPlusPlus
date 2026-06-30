use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

pub const DEFAULT_LATEST_JSON_URL: &str = "https://www.leishen-ai.cn/tools/codex-plus/latest.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Release {
    pub version: String,
    pub url: String,
    pub body: String,
    pub asset_name: Option<String>,
    pub asset_url: Option<String>,
    pub asset_sha256: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct UpdateCheck {
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_summary: String,
    pub asset_name: Option<String>,
    pub asset_url: Option<String>,
    pub asset_sha256: Option<String>,
    pub update_available: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct UpdateInstall {
    pub release: Release,
    pub installer_path: PathBuf,
    pub backup_path: Option<PathBuf>,
    pub launched: bool,
}

pub fn parse_version_tag(value: &str) -> anyhow::Result<Vec<u64>> {
    let normalized = value.trim().trim_start_matches(['v', 'V']);
    let mut digits = String::new();
    for ch in normalized.chars() {
        if ch.is_ascii_digit() || ch == '.' {
            digits.push(ch);
        } else {
            break;
        }
    }
    if digits.is_empty() {
        anyhow::bail!("Invalid version tag: {value}");
    }
    let mut segments = digits
        .split('.')
        .map(|part| part.parse::<u64>().map_err(Into::into))
        .collect::<anyhow::Result<Vec<_>>>()?;
    if let Some(suffix) = normalized.get(digits.len()..) {
        for prefix in ["-official.", "-official.", "-official."] {
            if let Some(edition_suffix) = suffix.strip_prefix(prefix) {
                let suffix_digits = edition_suffix
                    .chars()
                    .take_while(|ch| ch.is_ascii_digit())
                    .collect::<String>();
                if !suffix_digits.is_empty() {
                    segments.push(suffix_digits.parse()?);
                }
                break;
            }
        }
    }
    Ok(segments)
}

pub fn is_newer_version(candidate: &str, current: &str) -> anyhow::Result<bool> {
    let mut left = parse_version_tag(candidate)?;
    let mut right = parse_version_tag(current)?;
    let len = left.len().max(right.len());
    left.resize(len, 0);
    right.resize(len, 0);
    Ok(left > right)
}

pub fn release_from_github_payload(payload: &Value) -> anyhow::Result<Release> {
    let version = payload
        .get("tag_name")
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow::anyhow!("release payload missing tag_name"))?
        .to_string();
    let assets = payload
        .get("assets")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|asset| {
            Some((
                asset.get("name")?.as_str()?.to_string(),
                asset.get("browser_download_url")?.as_str()?.to_string(),
                asset_sha256(asset),
            ))
        })
        .collect::<Vec<_>>();
    let (selected, asset_sha256) = select_update_asset_with_sha256(&assets);
    Ok(Release {
        version,
        url: payload
            .get("html_url")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        body: payload
            .get("body")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        asset_name: selected.as_ref().map(|asset| asset.name.clone()),
        asset_url: selected.map(|asset| asset.browser_download_url),
        asset_sha256,
    })
}

pub fn release_from_latest_json_payload(payload: &Value) -> anyhow::Result<Release> {
    let base_url = payload
        .get("url")
        .or_else(|| payload.get("html_url"))
        .and_then(Value::as_str);
    release_from_latest_json_payload_with_base(payload, base_url)
}

pub fn release_from_latest_json_payload_with_base(
    payload: &Value,
    base_url: Option<&str>,
) -> anyhow::Result<Release> {
    let version = payload
        .get("version")
        .or_else(|| payload.get("tag_name"))
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow::anyhow!("latest.json missing version"))?
        .to_string();
    let mut assets = Vec::new();
    for asset in payload
        .get("assets")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let Some(name) = asset.get("name").and_then(Value::as_str) else {
            continue;
        };
        let Some(url) = asset
            .get("url")
            .or_else(|| asset.get("browser_download_url"))
            .and_then(Value::as_str)
        else {
            continue;
        };
        assets.push((
            name.to_string(),
            resolve_manifest_asset_url(url, base_url)?,
            asset_sha256(asset),
        ));
    }
    let (selected, asset_sha256) = select_update_asset_with_sha256(&assets);
    Ok(Release {
        version,
        url: payload
            .get("url")
            .or_else(|| payload.get("html_url"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        body: payload
            .get("body")
            .or_else(|| payload.get("release_summary"))
            .or_else(|| payload.get("notes"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        asset_name: selected.as_ref().map(|asset| asset.name.clone()),
        asset_url: selected.map(|asset| asset.browser_download_url),
        asset_sha256,
    })
}

pub fn resolve_manifest_asset_url(raw_url: &str, base_url: Option<&str>) -> anyhow::Result<String> {
    let raw_url = raw_url.trim();
    if raw_url.is_empty() {
        anyhow::bail!("更新清单中的下载地址为空");
    }
    if let Ok(url) = reqwest::Url::parse(raw_url) {
        validate_download_url(&url)?;
        return Ok(url.to_string());
    }

    let base_url = base_url
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| anyhow::anyhow!("更新清单中的下载地址不是完整 URL: {raw_url}"))?;
    let base = reqwest::Url::parse(base_url)
        .map_err(|error| anyhow::anyhow!("更新清单基础 URL 无效：{error}"))?;
    let url = base
        .join(raw_url)
        .map_err(|error| anyhow::anyhow!("更新清单下载地址无效：{error}"))?;
    validate_download_url(&url)?;
    Ok(url.to_string())
}

fn validate_download_url(url: &reqwest::Url) -> anyhow::Result<()> {
    match url.scheme() {
        "http" | "https" => Ok(()),
        scheme => anyhow::bail!("更新清单下载地址协议不支持：{scheme}"),
    }
}

fn asset_sha256(asset: &Value) -> Option<String> {
    if let Some(sha256) = asset
        .get("sha256")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
    {
        return Some(sha256);
    }
    asset
        .get("digest")
        .and_then(Value::as_str)
        .map(str::trim)
        .and_then(|digest| {
            let (algorithm, value) = digest.split_once(':')?;
            if algorithm.eq_ignore_ascii_case("sha256") {
                let value = value.trim();
                if !value.is_empty() {
                    return Some(value.to_string());
                }
            }
            None
        })
}

fn select_update_asset_with_sha256(
    assets: &[(String, String, Option<String>)],
) -> (Option<ReleaseAsset>, Option<String>) {
    let selectable = assets
        .iter()
        .map(|(name, url, _)| (name.clone(), url.clone()))
        .collect::<Vec<_>>();
    let selected = select_update_asset(&selectable);
    let asset_sha256 = selected.as_ref().and_then(|selected| {
        assets
            .iter()
            .find(|(name, url, _)| name == &selected.name && url == &selected.browser_download_url)
            .and_then(|(_, _, sha256)| sha256.clone())
    });
    (selected, asset_sha256)
}

pub fn select_update_asset(assets: &[(String, String)]) -> Option<ReleaseAsset> {
    let named = assets
        .iter()
        .filter(|(name, url)| !name.trim().is_empty() && !url.trim().is_empty());
    let mut best: Option<(u8, &str, &str)> = None;
    for (name, url) in named {
        let rank = platform_asset_rank(&name.to_ascii_lowercase());
        if rank >= 2 {
            continue;
        }
        if best.map_or(true, |(r, _, _)| rank < r) {
            best = Some((rank, name.as_str(), url.as_str()));
        }
    }
    best.map(|(_, name, url)| ReleaseAsset {
        name: name.to_string(),
        browser_download_url: url.to_string(),
    })
}

pub async fn fetch_latest_release(latest_json_url: &str) -> anyhow::Result<Release> {
    let client = crate::http_client::proxied_client(&format!("Codex/{}", crate::version::VERSION))?;
    let payload = client
        .get(latest_json_url)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await?
        .error_for_status()?
        .json::<Value>()
        .await?;
    release_from_latest_json_payload_with_base(&payload, Some(latest_json_url))
}

pub async fn check_for_update(current_version: &str) -> anyhow::Result<UpdateCheck> {
    let release = fetch_latest_release(DEFAULT_LATEST_JSON_URL).await?;
    let update_available = is_newer_version(&release.version, current_version)?;
    Ok(UpdateCheck {
        current_version: current_version.to_string(),
        latest_version: Some(release.version),
        release_summary: release.body,
        asset_name: release.asset_name,
        asset_url: release.asset_url,
        asset_sha256: release.asset_sha256,
        update_available,
    })
}

pub async fn perform_update(
    release: &Release,
    download_dir: &Path,
) -> anyhow::Result<UpdateInstall> {
    let url = release
        .asset_url
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("没有可下载的 Release asset"))?;
    let url = resolve_manifest_asset_url(url, Some(&release.url))?;
    expected_asset_sha256(release)?;
    let backup_path = create_pre_update_backup()?;
    let bytes = crate::http_client::proxied_client(&format!("Codex/{}", crate::version::VERSION))?
        .get(&url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?;
    validate_asset_sha256(release, &bytes)?;
    let installer_path = download_asset_to(release, &bytes, download_dir)?;
    launch_installer(&installer_path)?;
    Ok(UpdateInstall {
        release: release.clone(),
        installer_path,
        backup_path,
        launched: true,
    })
}

pub fn create_pre_update_backup() -> anyhow::Result<Option<PathBuf>> {
    let app_state = crate::paths::default_app_state_dir();
    let codex_home = crate::codex_home::default_codex_home_dir();
    create_pre_update_backup_from_sources(
        &app_state.join("backups"),
        &[
            (
                crate::paths::default_settings_path(),
                PathBuf::from("manager/settings.json"),
            ),
            (
                codex_home.join("config.toml"),
                PathBuf::from("codex/config.toml"),
            ),
            (
                codex_home.join("auth.json"),
                PathBuf::from("codex/auth.json"),
            ),
        ],
    )
}

pub fn create_pre_update_backup_from_sources(
    backup_root: &Path,
    sources: &[(PathBuf, PathBuf)],
) -> anyhow::Result<Option<PathBuf>> {
    let mut existing = Vec::new();
    for (source, relative) in sources {
        validate_backup_relative_path(relative)?;
        match fs::metadata(source) {
            Ok(metadata) if metadata.is_file() => existing.push((source.clone(), relative.clone())),
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => {
                anyhow::bail!("读取更新前备份源失败：{error}");
            }
        }
    }
    if existing.is_empty() {
        return Ok(None);
    }

    let backup_dir = backup_root.join(format!("pre-update-{}", timestamp_millis()));
    for (source, relative) in existing {
        let target = backup_dir.join(relative);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&source, &target)?;
    }
    Ok(Some(backup_dir))
}

fn validate_backup_relative_path(path: &Path) -> anyhow::Result<()> {
    if path.is_absolute() {
        anyhow::bail!("非法更新前备份目标路径");
    }
    if !path
        .components()
        .all(|component| matches!(component, Component::Normal(_)))
    {
        anyhow::bail!("非法更新前备份目标路径");
    }
    Ok(())
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

pub fn validate_asset_sha256(release: &Release, bytes: &[u8]) -> anyhow::Result<()> {
    let expected = expected_asset_sha256(release)?;
    let actual = format!("{:x}", Sha256::digest(bytes));
    if !expected.eq_ignore_ascii_case(&actual) {
        anyhow::bail!("更新包校验失败");
    }
    Ok(())
}

fn expected_asset_sha256(release: &Release) -> anyhow::Result<&str> {
    release
        .asset_sha256
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| anyhow::anyhow!("更新清单缺少 sha256"))
}

pub fn download_asset_to(
    release: &Release,
    bytes: &[u8],
    download_dir: &Path,
) -> anyhow::Result<PathBuf> {
    let name = release
        .asset_name
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("没有可下载的 Release asset"))?;
    let safe = safe_asset_name(name)?;
    std::fs::create_dir_all(download_dir)?;
    let path = download_dir.join(safe);
    std::fs::write(&path, bytes)?;
    Ok(path)
}

pub fn safe_asset_name(name: &str) -> anyhow::Result<String> {
    if name.trim().is_empty() {
        anyhow::bail!("非法 Release asset 文件名: {name}");
    }
    let path = Path::new(name);
    if path.components().count() != 1 {
        anyhow::bail!("非法 Release asset 文件名: {name}");
    }
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| anyhow::anyhow!("非法 Release asset 文件名: {name}"))?;
    if file_name == "." || file_name == ".." {
        anyhow::bail!("非法 Release asset 文件名: {name}");
    }
    Ok(file_name.to_string())
}

fn platform_asset_rank(name: &str) -> u8 {
    // 0 = exact match (current OS + native arch)
    // 1 = same OS, other arch (acceptable fallback, e.g. x86_64 on arm64 or vice versa)
    // 2 = wrong platform
    if cfg!(target_os = "macos") {
        if !is_macos_installer_asset(name) {
            return 2;
        }
        if is_macos_native_arch_asset(name) {
            return 0;
        }
        return 1;
    }
    if cfg!(windows) && is_windows_installer_asset(name) {
        return 0;
    }
    2
}

fn is_macos_native_arch_asset(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    let native_arch_token = match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        _ => return true, // unknown arch — accept anything
    };
    // Modern filename shape: `...-macos-x64.dmg` or `...-macos-arm64.dmg`
    if lower.contains(&format!("-{native_arch_token}.")) {
        return true;
    }
    // Old filename shape: `CodexPlusPlus_1.0.9_x64.dmg`
    if lower.contains(&format!("_{native_arch_token}.")) {
        return true;
    }
    // Newer but alternative shape: `..._x64.dmg` (no `macos-` token)
    let other_token = if native_arch_token == "x64" {
        "arm64"
    } else {
        "x64"
    };
    if lower.contains(&format!("_{other_token}.")) || lower.contains(&format!("-{other_token}.")) {
        return false;
    }
    // No arch token at all — assume it matches the current arch.
    true
}

fn is_windows_installer_asset(name: &str) -> bool {
    name.contains("codex")
        && name.contains("plus")
        && (name.ends_with(".msi")
            || name.ends_with("-setup.exe")
            || name.ends_with("_setup.exe")
            || name.ends_with("setup.exe")
            || name.ends_with("installer.exe"))
}

fn is_macos_installer_asset(name: &str) -> bool {
    // Loose shape check; arch preference is handled by platform_asset_rank
    // via is_macos_native_arch_asset.
    name.contains("codex") && name.contains("plus") && name.ends_with(".dmg")
}

pub fn launch_installer(path: &Path) -> anyhow::Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new(path)
            .creation_flags(crate::windows_integration::CREATE_NO_WINDOW)
            .spawn()
            .map(|_| ())
            .map_err(|error| anyhow::anyhow!("启动安装包失败：{error}"))
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| anyhow::anyhow!("打开 DMG 失败：{error}"))
    }

    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        let _ = path;
        anyhow::bail!("当前平台不支持启动安装包")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn asset_sha256_accepts_github_digest_prefix() {
        assert_eq!(
            asset_sha256(&json!({
                "digest": "sha256: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824 "
            }))
            .as_deref(),
            Some("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
        );
    }
}
