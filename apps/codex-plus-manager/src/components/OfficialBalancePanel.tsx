import { Download, ExternalLink, Eye, EyeOff, RefreshCw, Rocket } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { OfficialBalance } from "../official";

const CODEX_MICROSOFT_STORE_URL = "https://apps.microsoft.com/detail/9plm9xgg6vks?hl=zh-CN&gl=SC";

type OfficialBalancePanelProps = {
  apiKey: string;
  balance: OfficialBalance | null;
  busy: boolean;
  codexInstallBusy: boolean;
  codexReady: boolean;
  message: string;
  onApiKeyChange: (value: string) => void;
  onRefreshBalance: () => void;
  onInstallCodex: () => void;
  onOpenCodex: () => void;
  onOpenSubscription: () => void;
};

export function OfficialBalancePanel({
  apiKey,
  balance,
  busy,
  codexInstallBusy,
  codexReady,
  message,
  onApiKeyChange,
  onRefreshBalance,
  onInstallCodex,
  onOpenCodex,
  onOpenSubscription,
}: OfficialBalancePanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const metrics = useMemo(() => {
    if (!balance) return [];
    return [
      { label: "套餐", value: balance.planName },
      { label: balance.planExpiryLabel, value: balance.planRemainingText },
      { label: "今日美金", value: `$${balance.todayUsd.toFixed(2)}` },
      { label: "累计美金", value: `$${balance.totalUsd.toFixed(2)}` },
      { label: balance.topupBalance.title, value: balance.topupBalance.valueText },
      { label: "API Key", value: balance.apiKeyPreview },
    ];
  }, [balance]);

  return (
    <CardContent className="official-panel-content">
      <div className="official-panel-head">
        <div>
          <h3>账户额度</h3>
          <p>只读取当前 API Key 的套餐状态、已用美金和总量包余额，不暴露完整密钥。</p>
        </div>
      </div>
      <div className="official-balance-form">
        <label className="field official-key-field">
          <span>API Key</span>
          <div className="official-key-input">
            <Input
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder="粘贴sk-"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
            />
            <Button
              aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
              onClick={() => setShowApiKey((value) => !value)}
              size="icon"
              type="button"
              variant="outline"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </label>
      </div>
      <div className="official-balance-actions">
        <Button className="official-balance-action-refresh" disabled={busy} onClick={onRefreshBalance} type="button" variant="secondary">
          <RefreshCw className="h-4 w-4" />
          {busy ? "刷新中" : "刷新额度"}
        </Button>
        <Button onClick={onOpenSubscription} type="button" variant="secondary">
          <ExternalLink className="h-4 w-4" />
          购买额度
        </Button>
        <Button
          className="official-balance-action-open"
          disabled={busy || codexInstallBusy}
          onClick={codexReady ? onOpenCodex : onInstallCodex}
          type="button"
        >
          {codexReady ? <Rocket className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {codexReady ? "打开 Codex" : codexInstallBusy ? "安装中" : "安装 Codex"}
        </Button>
      </div>
      {!codexReady ? (
        <div className="official-codex-install-guide">
          <strong>安装 Codex 说明</strong>
          <span>
            点击“安装 Codex”会先用 Windows 官方命令自动安装；如果系统限制、Microsoft Store
            不可用或 winget 不可用，会自动打开微软商店页面。
          </span>
          <span>
            兜底安装链接：
            <a href={CODEX_MICROSOFT_STORE_URL} rel="noreferrer" target="_blank">
              打开微软商店 Codex 页面
            </a>
          </span>
          <span>安装完成后回到概览，点击“刷新额度”或重新打开管理工具；按钮会变成“打开 Codex”。</span>
        </div>
      ) : null}
      {metrics.length ? (
        <div className="metric-list official-balance-metrics">
          {metrics.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {balance?.topupBalance.visible && balance.topupBalance.details.length ? (
        <div className="guide-list official-balance-details">
          {balance.topupBalance.details.map((detail) => (
            <div className="feature-item" key={detail}>
              <div>
                <strong>{detail}</strong>
                <span>到期：{balance.topupBalance.expiry || "--"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <p className="field-hint official-panel-hint">{message}</p>
      <p className="field-hint official-panel-key-warning">
        请务必保存好 API Key。API Key 丢失后无法在本工具中找回；更换设备或清空配置前，请先确认自己已备份。
      </p>
    </CardContent>
  );
}
