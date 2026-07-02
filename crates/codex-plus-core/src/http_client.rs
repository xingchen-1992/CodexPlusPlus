pub fn proxied_client(user_agent: &str) -> anyhow::Result<reqwest::Client> {
    Ok(client_builder(user_agent)?.build()?)
}

pub fn direct_client(user_agent: &str) -> anyhow::Result<reqwest::Client> {
    Ok(client_builder(user_agent)?.no_proxy().build()?)
}

fn client_builder(user_agent: &str) -> anyhow::Result<reqwest::ClientBuilder> {
    let ua = if user_agent.trim().is_empty() {
        format!("CodexPlusPlus/{}", env!("CARGO_PKG_VERSION"))
    } else {
        user_agent.trim().to_string()
    };
    let mut builder = reqwest::Client::builder().user_agent(ua);
    if let Some(proxy) = crate::settings::SettingsStore::default()
        .load()
        .unwrap_or_default()
        .codex_network_proxy()
    {
        builder = builder.proxy(reqwest::Proxy::all(proxy.environment_proxy_url())?);
    }
    Ok(builder)
}
