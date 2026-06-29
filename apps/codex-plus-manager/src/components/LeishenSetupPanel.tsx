import { AlertCircle, CheckCircle2, Copy, Download, RefreshCw, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { fetchLeishenSetupStatus, type LeishenSetupStatus } from "../leishen";

const CODEX_CLI_PROMPT =
  "请帮我检查并安装 Codex CLI 环境：先确认 Node.js 和 npm 是否可用；如果缺失，请指导我安装 Node.js LTS；然后执行 npm install -g @openai/codex；最后运行 codex --version 验证安装结果。";

type LeishenSetupPanelProps = {
  mode?: "compact" | "full";
  onCopyDesktopPrompt?: () => void;
  onInstallCodexCli?: () => void;
  onOpenNodeInstaller?: () => void;
};

export function LeishenSetupPanel({
  mode = "compact",
  onCopyDesktopPrompt,
  onInstallCodexCli,
  onOpenNodeInstaller,
}: LeishenSetupPanelProps) {
  const [status, setStatus] = useState<LeishenSetupStatus>({});
  const [message, setMessage] = useState("尚未检测环境。");
  const [busy, setBusy] = useState(false);
  const fullMode = mode === "full";

  const refresh = async () => {
    setBusy(true);
    try {
      const result = await fetchLeishenSetupStatus();
      if (result.status === "ok") {
        setStatus(result);
        setMessage(result.message || "环境检测完成");
      } else {
        setStatus({});
        setMessage(result.message || "环境检测失败");
      }
    } catch (error) {
      setStatus({});
      setMessage(error instanceof Error ? error.message : "环境检测失败");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const rows = [
    ["Node.js", status.nodeVersion],
    ["npm", status.npmVersion],
    ["Codex CLI", status.codexVersion],
  ] as const;

  return (
    <CardContent className="leishen-panel-content">
      <div className="leishen-panel-head">
        <div>
          <h3>{fullMode ? "Codex CLI 环境" : "环境配置"}</h3>
          <p>
            {fullMode
              ? "Codex CLI 用于在终端中使用 Codex；桌面端可以先使用，终端能力需要 Node.js、npm 和 Codex CLI。"
              : "检查 Node.js、npm 和 Codex CLI。"}
          </p>
        </div>
        <Button disabled={busy} onClick={() => void refresh()} type="button" variant="secondary">
          <RefreshCw className="h-4 w-4" />
          {busy ? "检测中" : "重新检测"}
        </Button>
      </div>
      <div className="health-grid leishen-status-grid">
        {rows.map(([label, value]) => {
          const detected = Boolean(value);
          return (
            <div className={`health-item ${detected ? "ok" : "needs-fix"}`} key={label}>
              {detected ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <div>
                <strong>{label}</strong>
                <span>{value || "未检测到，可在后续步骤中自动补齐。"}</span>
              </div>
            </div>
          );
        })}
      </div>
      {fullMode ? (
        <>
          <div className="leishen-cli-actions">
            <Button onClick={onOpenNodeInstaller} type="button" variant="secondary">
              <Download className="h-4 w-4" />
              安装 Node.js/npm
            </Button>
            <Button onClick={onInstallCodexCli} type="button">
              <Terminal className="h-4 w-4" />
              安装 Codex CLI
            </Button>
          </div>
          <div className="leishen-cli-prompt">
            <div className="relay-file-head">
              <div>
                <strong>桌面端辅助提示词</strong>
                <span>复制后粘贴到 Codex 桌面端，让它辅助检查终端环境。</span>
              </div>
              <Button onClick={onCopyDesktopPrompt} size="sm" type="button" variant="secondary">
                <Copy className="h-4 w-4" />
                复制
              </Button>
            </div>
            <Textarea readOnly value={CODEX_CLI_PROMPT} />
          </div>
        </>
      ) : null}
      <p className="field-hint leishen-panel-hint">{message}</p>
    </CardContent>
  );
}
