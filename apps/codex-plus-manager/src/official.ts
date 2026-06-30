import { invoke } from "@tauri-apps/api/core";

export type OfficialSetupStatus = {
  nodeVersion?: string | null;
  npmVersion?: string | null;
  codexVersion?: string | null;
};

export type OfficialBalance = {
  apiKeyPreview: string;
  planName: string;
  planExpiryLabel: string;
  planRemainingText: string;
  runtimeAccessMode: string;
  packageExpired: boolean;
  todayUsd: number;
  totalUsd: number;
  todayRequests: number;
  totalRequests: number;
  topupBalance: {
    visible: boolean;
    title: string;
    valueText: string;
    summaryText: string;
    details: string[];
    expiry: string;
  };
};

export type CommandResult<T> = T & {
  status: string;
  message: string;
};

export async function fetchOfficialSetupStatus(): Promise<CommandResult<OfficialSetupStatus>> {
  return invoke<CommandResult<OfficialSetupStatus>>("official_setup_status");
}

export async function fetchOfficialBalance(apiKey: string): Promise<CommandResult<OfficialBalance>> {
  return invoke<CommandResult<OfficialBalance>>("official_balance", {
    request: { apiKey },
  });
}

export async function configureOfficialApiKey(apiKey: string): Promise<CommandResult<Record<string, unknown>>> {
  return invoke<CommandResult<Record<string, unknown>>>("configure_official_api_key", {
    request: { apiKey },
  });
}

export async function installCodexCli(): Promise<CommandResult<Record<string, unknown>>> {
  return invoke<CommandResult<Record<string, unknown>>>("install_codex_cli");
}
