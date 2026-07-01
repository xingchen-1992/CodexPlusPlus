pub mod app_paths;
pub mod assets;
pub mod bridge;
pub mod ccs_import;
pub mod cdp;
pub mod cli_wrapper;
pub mod codex_home;
pub mod codex_local_storage;
pub mod codex_sqlite;
mod computer_use_guard;
pub mod diagnostic_log;
pub mod env_conflicts;
pub mod http_client;
pub mod install;
pub mod launcher;
pub mod model_catalog;
pub mod model_suffix;
pub mod models;
pub mod native_menu;
pub mod official_desktop_api;
pub mod official_setup;
pub mod paths;
pub mod plugin_marketplace;
pub mod ports;
pub mod protocol_proxy;
pub mod provider_import;
pub mod proxy;
pub mod relay_config;
pub mod relay_rotation;
pub mod relay_switch;
pub mod routes;
pub mod script_market;
pub mod settings;
pub mod status;
pub mod update;
pub mod upstream_worktree;
pub mod user_scripts;
pub mod version;
pub mod watcher;
#[cfg(windows)]
mod windows_integration;
pub mod zed_remote;

#[cfg(windows)]
pub fn windows_create_no_window() -> u32 {
    windows_integration::CREATE_NO_WINDOW
}

#[cfg(windows)]
pub fn windows_open_url(url: &str) -> anyhow::Result<()> {
    windows_integration::open_url(url)
}

#[cfg(windows)]
pub fn windows_activate_process_window(process_id: u32) -> bool {
    windows_integration::activate_process_window(process_id)
}

#[cfg(windows)]
pub fn windows_enumerate_processes() -> Vec<windows_integration::WindowsProcessInfo> {
    windows_integration::enumerate_processes()
}

#[cfg(windows)]
pub fn windows_read_current_user_string_values(
    subkey: &str,
) -> anyhow::Result<Vec<(String, Option<String>)>> {
    windows_integration::read_current_user_string_values(subkey)
}

#[cfg(windows)]
pub fn windows_set_current_user_string_value(
    subkey: &str,
    name: &str,
    value: &str,
) -> anyhow::Result<()> {
    windows_integration::set_current_user_string_value(subkey, name, value)
}
