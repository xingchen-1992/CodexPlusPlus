use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeDownload {
    pub platform: String,
    pub arch: String,
    pub file: String,
    pub official_url: String,
    pub mirror_url: String,
    pub sha256: String,
}

pub fn parse_node_major(version: &str) -> Option<u64> {
    let trimmed = version.trim().trim_start_matches('v');
    trimmed.split('.').next()?.parse::<u64>().ok()
}

pub fn select_node_download(
    manifest: &Value,
    platform: &str,
    arch: &str,
) -> anyhow::Result<NodeDownload> {
    let downloads = manifest
        .get("downloads")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow::anyhow!("node-runtime.json missing downloads"))?;
    for item in downloads {
        let candidate: NodeDownload = serde_json::from_value(item.clone())?;
        if candidate.platform == platform && candidate.arch == arch {
            return Ok(candidate);
        }
    }
    anyhow::bail!("没有匹配当前系统的 Node.js 安装包")
}

pub fn build_codex_config_toml(base_url: &str) -> String {
    let base_url = toml_string(base_url);
    format!(
        r#"cli_auth_credentials_store = "file"
model_provider = "crs"
model = "gpt-5.4"
model_reasoning_effort = "high"
model_auto_compact_token_limit = 188888
preferred_auth_method = "apikey"

[model_providers.crs]
name = "OpenAI"
base_url = "{base_url}"
wire_api = "responses"
requires_openai_auth = true

[features]
apps = false
"#
    )
}

fn toml_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
