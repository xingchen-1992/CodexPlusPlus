/**
 * Codex 供应商预设
 *
 * 提供一键填充供应商配置的预设模板，包括 Base URL、协议、模型列表等。
 * 手动供应商创建逻辑在 App.tsx 中保留，不依赖这里的预设数量。
 */

export type PresetCategory = "official" | "aggregator" | "third_party" | "cn_official";

export type RelayProtocol = "responses" | "chatCompletions";

export interface ProviderPreset {
  id: string;
  name: string;
  websiteUrl?: string;
  apiKeyUrl?: string;
  category: PresetCategory;
  baseUrl: string;
  protocol: RelayProtocol;
  model: string;
  modelList?: string[];
}

/**
 * 预设列表。选择任一预设会自动填充：
 * - name     → 供应商名称
 * - baseUrl  → API 端点
 * - protocol → responses / chatCompletions（根据上游实际协议）
 * - model    → 默认模型名
 * - modelList → 可选模型清单（换行分隔）
 */
export const PRESETS: ProviderPreset[] = [
  {
    id: "official",
    name: "官方",
    websiteUrl: "https://www.leishen-ai.cn/tools/codex-plus/#downloads",
    apiKeyUrl: "https://www.leishen-ai.cn/tools/codex-plus/#downloads",
    category: "aggregator",
    baseUrl: "https://www.leishen-ai.cn/openai",
    protocol: "responses",
    model: "gpt-5.4",
    modelList: ["gpt-5.4"],
  },
  {
    id: "openai",
    name: "OpenAI Official",
    category: "official",
    baseUrl: "https://api.openai.com/v1",
    protocol: "responses",
    model: "gpt-5.5",
    websiteUrl: "https://chatgpt.com/codex",
  },
];
