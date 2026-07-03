use std::path::Path;

use anyhow::Context;

use crate::relay_config::relay_config_status_from_home;
use crate::settings::{BackendSettings, LaunchMode, RelayMode, SettingsStore};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RelaySwitchResult {
    pub settings: BackendSettings,
    pub configured: bool,
    pub backup_path: Option<String>,
}

pub fn switch_relay_profile_in_home(
    store: &SettingsStore,
    home: &Path,
    next_settings: BackendSettings,
    _previous_active_relay_id: &str,
) -> anyhow::Result<RelaySwitchResult> {
    let mut selected_settings = next_settings;
    if !selected_settings.relay_profiles_enabled {
        anyhow::bail!("供应商配置总开关已关闭，未写入 config.toml / auth.json。");
    }

    let original_settings = store.load().unwrap_or_default();
    selected_settings.launch_mode =
        launch_mode_for_relay_profile(&selected_settings.active_relay_profile());
    store
        .save(&selected_settings)
        .context("保存供应商设置失败")?;
    let selected_settings = store.load().context("读取供应商设置失败")?;

    match apply_selected_relay_profile(home, &selected_settings) {
        Ok(result) => Ok(result),
        Err(error) => {
            let _ = store.save(&original_settings);
            Err(error)
        }
    }
}

fn apply_selected_relay_profile(
    home: &Path,
    settings: &BackendSettings,
) -> anyhow::Result<RelaySwitchResult> {
    let relay = settings.active_relay_profile();
    let result =
        crate::relay_config::apply_relay_profile_endpoint_to_home_with_switch_rules_and_computer_use_guard(
            home,
            &relay,
            settings.computer_use_guard_enabled,
        )?;
    let status = relay_config_status_from_home(home);
    if relay.relay_mode == RelayMode::PureApi && !status.configured {
        anyhow::bail!(
            "纯 API 配置写入后未检测到完整 custom provider，请检查 config.toml 和供应商 API Key。"
        );
    }
    Ok(RelaySwitchResult {
        settings: settings.clone(),
        configured: status.configured,
        backup_path: result.backup_path,
    })
}

fn launch_mode_for_relay_profile(profile: &crate::settings::RelayProfile) -> LaunchMode {
    if profile.relay_mode == RelayMode::PureApi {
        LaunchMode::Patch
    } else {
        LaunchMode::Relay
    }
}
