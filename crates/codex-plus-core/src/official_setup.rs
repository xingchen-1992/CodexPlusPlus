use serde::{Deserialize, Serialize};
use serde_json::Value;
use toml_edit::{DocumentMut, value};

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
        let Some(candidate_platform) = item.get("platform").and_then(Value::as_str) else {
            continue;
        };
        let Some(candidate_arch) = item.get("arch").and_then(Value::as_str) else {
            continue;
        };
        if candidate_platform == platform && candidate_arch == arch {
            let candidate: NodeDownload = serde_json::from_value(item.clone())?;
            return Ok(candidate);
        }
    }
    anyhow::bail!("没有匹配当前系统的 Node.js 安装包")
}

pub fn build_codex_config_toml(base_url: &str) -> String {
    let mut document = DocumentMut::new();
    document["cli_auth_credentials_store"] = value("file");
    document["model_provider"] = value("crs");
    document["model"] = value("gpt-5.4");
    document["model_reasoning_effort"] = value("high");
    document["model_auto_compact_token_limit"] = value(188888);
    document["preferred_auth_method"] = value("apikey");
    document["model_providers"]["crs"]["name"] = value("OpenAI");
    document["model_providers"]["crs"]["base_url"] = value(base_url);
    document["model_providers"]["crs"]["wire_api"] = value("responses");
    document["model_providers"]["crs"]["requires_openai_auth"] = value(true);
    document["features"]["apps"] = value(false);
    document.to_string()
}
