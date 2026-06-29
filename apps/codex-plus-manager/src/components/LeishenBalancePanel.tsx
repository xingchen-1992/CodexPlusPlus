import { Download, ExternalLink, Eye, EyeOff, RefreshCw, Rocket } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { configureTaiyingApiKey, fetchLeishenBalance, type LeishenBalance } from "../leishen";

type LeishenBalancePanelProps = {
  codexReady: boolean;
  onInstallCodex: () => void;
  onOpenCodex: () => void;
  onOpenSubscription: () => void;
};

export function LeishenBalancePanel({
  codexReady,
  onInstallCodex,
  onOpenCodex,
  onOpenSubscription,
}: LeishenBalancePanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [balance, setBalance] = useState<LeishenBalance | null>(null);
  const [message, setMessage] = useState("输入你的 API Key 后即可读取套餐和总量包余额。");
  const [busy, setBusy] = useState(false);

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

  const refresh = async () => {
    const normalized = apiKey.trim();
    if (!normalized) {
      setBalance(null);
      setMessage("请先填写 API Key");
      return;
    }
    setBusy(true);
    try {
      setMessage("正在配置本机 Codex 环境...");
      const configureResult = await configureTaiyingApiKey(normalized);
      if (configureResult.status !== "ok") {
        throw new Error(configureResult.message || "本机 Codex 环境配置失败");
      }
      setMessage("本机配置完成，正在刷新额度...");
      const result = await fetchLeishenBalance(normalized);
      setBalance(result);
      const balanceMessage = result.message || (result.status === "ok" ? "额度刷新完成" : "额度暂时无法刷新");
      setMessage(`${balanceMessage}；${configureResult.message}`);
    } catch (error) {
      setBalance(null);
      setMessage(error instanceof Error ? error.message : "额度暂时无法刷新");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CardContent className="leishen-panel-content">
      <div className="leishen-panel-head">
        <div>
          <span className="eyebrow">泰盈订阅</span>
          <h3>账户额度</h3>
          <p>只读取当前 API Key 的套餐状态、已用美金和总量包余额，不暴露完整密钥。</p>
        </div>
      </div>
      <div className="form-row leishen-balance-form">
        <label className="field leishen-key-field">
          <span>API Key</span>
          <div className="leishen-key-input">
            <Input
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="粘贴 cr_... 或 sk-..."
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
        <Button disabled={busy} onClick={() => void refresh()} type="button">
          <RefreshCw className="h-4 w-4" />
          {busy ? "刷新中" : "刷新额度"}
        </Button>
      </div>
      <div className="leishen-balance-actions">
        <Button onClick={onOpenSubscription} type="button" variant="secondary">
          <ExternalLink className="h-4 w-4" />
          订阅中心
        </Button>
        <Button onClick={codexReady ? onOpenCodex : onInstallCodex} type="button" variant="secondary">
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
