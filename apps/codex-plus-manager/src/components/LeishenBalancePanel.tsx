import { Download, ExternalLink, Eye, EyeOff, RefreshCw, Rocket } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { LeishenBalance } from "../leishen";

type LeishenBalancePanelProps = {
  apiKey: string;
  balance: LeishenBalance | null;
  busy: boolean;
  codexReady: boolean;
  message: string;
  onApiKeyChange: (value: string) => void;
  onRefreshBalance: () => void;
  onInstallCodex: () => void;
  onOpenCodex: () => void;
  onOpenSubscription: () => void;
};

export function LeishenBalancePanel({
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
}: LeishenBalancePanelProps) {
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
    <CardContent className="leishen-panel-content">
      <div className="leishen-panel-head">
        <div>
          <h3>账户额度</h3>
          <p>只读取当前 API Key 的套餐状态、已用美金和总量包余额，不暴露完整密钥。</p>
        </div>
      </div>
      <div className="leishen-balance-form">
        <label className="field leishen-key-field">
          <span>API Key</span>
          <div className="leishen-key-input">
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
      <div className="leishen-balance-actions">
        <Button className="leishen-balance-action-refresh" disabled={busy} onClick={onRefreshBalance} type="button" variant="secondary">
          <RefreshCw className="h-4 w-4" />
          {busy ? "刷新中" : "刷新额度"}
        </Button>
        <Button onClick={onOpenSubscription} type="button" variant="secondary">
          <ExternalLink className="h-4 w-4" />
          购买额度
        </Button>
        <Button
          className="leishen-balance-action-open"
          disabled={busy}
          onClick={codexReady ? onOpenCodex : onInstallCodex}
          type="button"
        >
          {codexReady ? <Rocket className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {codexReady ? "打开 Codex" : "安装 Codex"}
        </Button>
      </div>
      {metrics.length ? (
        <div className="metric-list leishen-balance-metrics">
          {metrics.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {balance?.topupBalance.visible && balance.topupBalance.details.length ? (
        <div className="guide-list leishen-balance-details">
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
      <p className="field-hint leishen-panel-hint">{message}</p>
    </CardContent>
  );
}
