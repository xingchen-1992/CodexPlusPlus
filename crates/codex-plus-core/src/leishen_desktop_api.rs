use serde::{Deserialize, Serialize};
use std::time::Duration;

const DESKTOP_SUMMARY_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopupBalance {
    pub visible: bool,
    pub title: String,
    pub value_text: String,
    pub summary_text: String,
    pub details: Vec<String>,
    pub expiry: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSummary {
    pub api_key_preview: String,
    pub plan_name: String,
    pub plan_expiry_label: String,
    pub plan_remaining_text: String,
    pub runtime_access_mode: String,
    pub package_expired: bool,
    pub today_usd: f64,
    pub total_usd: f64,
    pub today_requests: u64,
    pub total_requests: u64,
    pub topup_balance: TopupBalance,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct DesktopSummaryEnvelope {
    success: bool,
    data: Option<DesktopSummary>,
}

pub fn mask_api_key(api_key: &str) -> String {
    let trimmed = api_key.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if let Some(secret) = trimmed.strip_prefix("cr_") {
        return format!("cr_****{}", mask_tail(secret));
    }
    if let Some(secret) = trimmed.strip_prefix("sk-") {
        return format!("sk-****{}", mask_tail(secret));
    }
    format!("key_****{}", mask_tail(trimmed))
}

pub async fn fetch_desktop_summary(
    base_origin: &str,
    api_key: &str,
) -> anyhow::Result<DesktopSummary> {
    fetch_desktop_summary_with_timeout(base_origin, api_key, DESKTOP_SUMMARY_TIMEOUT).await
}

async fn fetch_desktop_summary_with_timeout(
    base_origin: &str,
    api_key: &str,
    timeout: Duration,
) -> anyhow::Result<DesktopSummary> {
    let url = format!(
        "{}/portal/desktop/summary",
        base_origin.trim_end_matches('/')
    );
    let api_key = api_key.trim().to_string();
    let request = async move {
        let response = crate::http_client::proxied_client("CodexPlusTaiying")?
            .get(url)
            .bearer_auth(api_key)
            .send()
            .await?
            .error_for_status()?;
        let envelope = response.json::<DesktopSummaryEnvelope>().await?;
        if !envelope.success {
            anyhow::bail!("额度摘要请求失败");
        }
        envelope
            .data
            .ok_or_else(|| anyhow::anyhow!("额度摘要缺少 data"))
    };
    match tokio::time::timeout(timeout, request).await {
        Ok(result) => result,
        Err(_) => anyhow::bail!("额度摘要请求超时"),
    }
}

fn mask_tail(value: &str) -> String {
    if value.chars().count() >= 8 {
        value
            .chars()
            .rev()
            .take(4)
            .collect::<String>()
            .chars()
            .rev()
            .collect()
    } else {
        String::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    use std::net::TcpListener;
    use std::thread;

    #[tokio::test]
    async fn desktop_summary_times_out_when_server_hangs() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let thread = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buffer = [0; 1024];
            let _ = stream.read(&mut buffer);
            thread::sleep(Duration::from_millis(200));
        });

        let error = fetch_desktop_summary_with_timeout(
            &format!("http://127.0.0.1:{port}"),
            "cr_live_secret_key",
            Duration::from_millis(50),
        )
        .await
        .unwrap_err();
        thread.join().unwrap();

        assert!(error.to_string().contains("超时"));
    }
}
