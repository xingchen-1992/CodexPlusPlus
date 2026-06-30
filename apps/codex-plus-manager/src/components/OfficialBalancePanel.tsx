import { Download, ExternalLink, Eye, EyeOff, RefreshCw, Rocket } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { OfficialBalance } from "../official";

type OfficialBalancePanelProps = {
  apiKey: string;
  balance: OfficialBalance | null;
  busy: boolean;
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
          disabled={busy}
          onClick={codexReady ? onOpenCodex : onInstallCodex}
          type="button"
        >
          {codexReady ? <Rocket className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {codexReady ? "打开 Codex" : "安装 Codex"}
        </Button>
      </div>
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
    </CardContent>
  );
}
