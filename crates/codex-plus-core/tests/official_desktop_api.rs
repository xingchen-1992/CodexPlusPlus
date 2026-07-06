use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;

use codex_plus_core::official_desktop_api::{DesktopSummary, fetch_desktop_summary, mask_api_key};
use serde_json::json;

#[test]
fn masks_api_key_for_display() {
    assert_eq!(
        mask_api_key("cr_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
        "cr_****cdef"
    );
    assert_eq!(mask_api_key("sk-12345678"), "sk-****5678");
    assert_eq!(mask_api_key("钥匙密钥甲乙丙丁戊己庚"), "key_****丁戊己庚");
    assert_eq!(mask_api_key("short"), "key_****");
    assert_eq!(mask_api_key(""), "");
}

#[test]
fn parses_desktop_summary_payload() {
    let parsed: serde_json::Value = serde_json::from_value(json!({
        "apiKeyPreview": "cr_****cdef",
        "planName": "Desktop Plan",
        "planExpiryLabel": "到期日期",
        "planRemainingText": "剩余 11 天",
        "runtimeAccessMode": "package_active",
        "packageExpired": false,
        "todayUsd": 1.5,
        "totalUsd": 20.0,
        "todayRequests": 3,
        "totalRequests": 30,
        "topupBalance": {
            "visible": true,
            "title": "总量包剩余额度",
            "valueText": "$8.00",
            "summaryText": "全部总量包合计剩余",
            "details": ["积分合计：100.00 积分"],
            "expiry": "2026-07-20"
        }
    }))
    .unwrap();

    let summary: DesktopSummary = serde_json::from_value(parsed).unwrap();

    assert_eq!(summary.plan_name, "Desktop Plan");
    assert_eq!(summary.plan_expiry_label, "到期日期");
    assert_eq!(summary.plan_remaining_text, "剩余 11 天");
    assert_eq!(summary.today_usd, 1.5);
    assert_eq!(summary.total_requests, 30);
    assert_eq!(summary.topup_balance.value_text, "$8.00");
}

#[tokio::test]
async fn fetches_desktop_summary_from_portal_endpoint() {
    let server = spawn_summary_server(json!({
        "success": true,
        "data": {
            "apiKeyPreview": "cr_****cdef",
            "planName": "Desktop Plan",
            "planExpiryLabel": "到期日期",
            "planRemainingText": "剩余 11 天",
            "runtimeAccessMode": "package_active",
            "packageExpired": false,
            "todayUsd": 1.5,
            "totalUsd": 20.0,
            "todayRequests": 3,
            "totalRequests": 30,
            "topupBalance": {
                "visible": true,
                "title": "总量包剩余额度",
                "valueText": "$8.00",
                "summaryText": "全部总量包合计剩余",
                "details": [],
                "expiry": "2026-07-20"
            }
        }
    }));

    let summary = fetch_desktop_summary(&server.base_url, "cr_live_secret_key")
        .await
        .unwrap();
    let request = server.finish();

    assert_eq!(summary.api_key_preview, "cr_****cdef");
    assert_eq!(summary.topup_balance.value_text, "$8.00");
    assert_eq!(request.path, "/portal/desktop/summary");
    assert_eq!(request.authorization, "Bearer cr_live_secret_key");
    assert_eq!(request.x_api_key, "cr_live_secret_key");
}

#[tokio::test]
async fn fetches_desktop_summary_without_system_proxy() {
    let _guard = ProxyGuard::set_invalid();
    let server = spawn_summary_server(json!({
        "success": true,
        "data": {
            "apiKeyPreview": "sk-****5678",
            "planName": "Desktop Plan",
            "planExpiryLabel": "到期日期",
            "planRemainingText": "剩余 11 天",
            "runtimeAccessMode": "package_active",
            "packageExpired": false,
            "todayUsd": 1.5,
            "totalUsd": 20.0,
            "todayRequests": 3,
            "totalRequests": 30,
            "topupBalance": {
                "visible": false,
                "title": "总量包剩余额度",
                "valueText": "$0.00",
                "summaryText": "全部总量包合计剩余",
                "details": [],
                "expiry": "--"
            }
        }
    }));

    let summary = fetch_desktop_summary(&server.base_url, "sk-12345678")
        .await
        .unwrap();
    let request = server.finish();

    assert_eq!(summary.api_key_preview, "sk-****5678");
    assert_eq!(request.path, "/portal/desktop/summary");
    assert_eq!(request.authorization, "Bearer sk-12345678");
    assert_eq!(request.x_api_key, "sk-12345678");
}

#[tokio::test]
async fn surfaces_backend_error_message_for_invalid_key() {
    let server = spawn_summary_server_with_status(
        401,
        json!({
            "success": false,
            "message": "API Key 不完整：当前 60 位，完整应为 67 位"
        }),
    );

    let error = fetch_desktop_summary(&server.base_url, "sk-short")
        .await
        .unwrap_err();
    let request = server.finish();

    assert_eq!(request.path, "/portal/desktop/summary");
    assert_eq!(
        error.to_string(),
        "API Key 不完整：当前 60 位，完整应为 67 位"
    );
}

struct SummaryServer {
    base_url: String,
    thread: thread::JoinHandle<SummaryRequest>,
}

impl SummaryServer {
    fn finish(self) -> SummaryRequest {
        self.thread.join().unwrap()
    }
}

struct SummaryRequest {
    path: String,
    authorization: String,
    x_api_key: String,
}

fn spawn_summary_server(body: serde_json::Value) -> SummaryServer {
    spawn_summary_server_with_status(200, body)
}

fn spawn_summary_server_with_status(status: u16, body: serde_json::Value) -> SummaryServer {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    let thread = thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut buffer = [0; 4096];
        let read = stream.read(&mut buffer).unwrap();
        let request = String::from_utf8_lossy(&buffer[..read]);
        let first_line = request.lines().next().unwrap_or_default();
        let path = first_line
            .split_whitespace()
            .nth(1)
            .unwrap_or_default()
            .to_string();
        let authorization = request
            .lines()
            .find_map(|line| line.strip_prefix("authorization: "))
            .or_else(|| {
                request
                    .lines()
                    .find_map(|line| line.strip_prefix("Authorization: "))
            })
            .unwrap_or_default()
            .to_string();
        let x_api_key = request
            .lines()
            .find_map(|line| line.strip_prefix("x-api-key: "))
            .or_else(|| request.lines().find_map(|line| line.strip_prefix("X-Api-Key: ")))
            .unwrap_or_default()
            .to_string();
        let body = body.to_string();
        let reason = match status {
            200 => "OK",
            401 => "Unauthorized",
            _ => "Status",
        };
        let response = format!(
            "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream.write_all(response.as_bytes()).unwrap();
        SummaryRequest {
            path,
            authorization,
            x_api_key,
        }
    });

    SummaryServer {
        base_url: format!("http://127.0.0.1:{port}"),
        thread,
    }
}

struct ProxyGuard {
    http_proxy: Option<String>,
    https_proxy: Option<String>,
    all_proxy: Option<String>,
    no_proxy: Option<String>,
    lowercase_http_proxy: Option<String>,
    lowercase_https_proxy: Option<String>,
    lowercase_all_proxy: Option<String>,
    lowercase_no_proxy: Option<String>,
}

impl ProxyGuard {
    fn set_invalid() -> Self {
        let http_proxy = std::env::var("HTTP_PROXY").ok();
        let https_proxy = std::env::var("HTTPS_PROXY").ok();
        let all_proxy = std::env::var("ALL_PROXY").ok();
        let no_proxy = std::env::var("NO_PROXY").ok();
        let lowercase_http_proxy = std::env::var("http_proxy").ok();
        let lowercase_https_proxy = std::env::var("https_proxy").ok();
        let lowercase_all_proxy = std::env::var("all_proxy").ok();
        let lowercase_no_proxy = std::env::var("no_proxy").ok();
        unsafe {
            std::env::set_var("HTTP_PROXY", "http://127.0.0.1:9");
            std::env::set_var("HTTPS_PROXY", "http://127.0.0.1:9");
            std::env::set_var("ALL_PROXY", "http://127.0.0.1:9");
            std::env::remove_var("NO_PROXY");
            std::env::set_var("http_proxy", "http://127.0.0.1:9");
            std::env::set_var("https_proxy", "http://127.0.0.1:9");
            std::env::set_var("all_proxy", "http://127.0.0.1:9");
            std::env::remove_var("no_proxy");
        }
        Self {
            http_proxy,
            https_proxy,
            all_proxy,
            no_proxy,
            lowercase_http_proxy,
            lowercase_https_proxy,
            lowercase_all_proxy,
            lowercase_no_proxy,
        }
    }
}

impl Drop for ProxyGuard {
    fn drop(&mut self) {
        match self.http_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("HTTP_PROXY", value);
            },
            None => unsafe {
                std::env::remove_var("HTTP_PROXY");
            },
        }
        match self.https_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("HTTPS_PROXY", value);
            },
            None => unsafe {
                std::env::remove_var("HTTPS_PROXY");
            },
        }
        match self.all_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("ALL_PROXY", value);
            },
            None => unsafe {
                std::env::remove_var("ALL_PROXY");
            },
        }
        match self.no_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("NO_PROXY", value);
            },
            None => unsafe {
                std::env::remove_var("NO_PROXY");
            },
        }
        match self.lowercase_http_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("http_proxy", value);
            },
            None => unsafe {
                std::env::remove_var("http_proxy");
            },
        }
        match self.lowercase_https_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("https_proxy", value);
            },
            None => unsafe {
                std::env::remove_var("https_proxy");
            },
        }
        match self.lowercase_all_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("all_proxy", value);
            },
            None => unsafe {
                std::env::remove_var("all_proxy");
            },
        }
        match self.lowercase_no_proxy.as_ref() {
            Some(value) => unsafe {
                std::env::set_var("no_proxy", value);
            },
            None => unsafe {
                std::env::remove_var("no_proxy");
            },
        }
    }
}
