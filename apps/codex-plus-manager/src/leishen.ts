import { invoke } from "@tauri-apps/api/core";

export type LeishenSetupStatus = {
  nodeVersion?: string | null;
  npmVersion?: string | null;
  codexVersion?: string | null;
};

export type LeishenBalance = {
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

export async function fetchLeishenSetupStatus(): Promise<CommandResult<LeishenSetupStatus>> {
  return invoke<CommandResult<LeishenSetupStatus>>("leishen_setup_status");
}

export async function fetchLeishenBalance(apiKey: string): Promise<CommandResult<LeishenBalance>> {
  return invoke<CommandResult<LeishenBalance>>("leishen_balance", {
    request: { apiKey },
  });
}

export async function configureTaiyingApiKey(apiKey: string): Promise<CommandResult<Record<string, unknown>>> {
  return invoke<CommandResult<Record<string, unknown>>>("configure_taiying_api_key", {
    request: { apiKey },
  });
}
