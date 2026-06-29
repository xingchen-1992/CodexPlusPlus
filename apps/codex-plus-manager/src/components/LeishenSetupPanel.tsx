import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

import { fetchLeishenSetupStatus, type LeishenSetupStatus } from "../leishen";

export function LeishenSetupPanel() {
  const [status, setStatus] = useState<LeishenSetupStatus>({});
  const [message, setMessage] = useState("尚未检测环境。");
  const [busy, setBusy] = useState(false);

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
          <span className="eyebrow">泰盈环境</span>
          <h3>环境配置</h3>
          <p>检查 Node.js、npm 和 Codex CLI，后续一键安装入口会从这里继续扩展。</p>
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
      <p className="field-hint leishen-panel-hint">{message}</p>
    </CardContent>
  );
}
