import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import type { ChannelConfig, ChannelConfigPayload, SyncLog, SyncRun } from "@/api/types";

export const channelKeys = {
  configs: () => ["admin", "channels"] as const,
  logs: (propertyId?: string) => ["admin", "channel-logs", propertyId ?? null] as const,
};

/** Per-property channel wiring: which feeds are set, when each last synced. */
export function useChannelConfigs() {
  return useQuery({
    queryKey: channelKeys.configs(),
    queryFn: async () => (await apiClient.get<ChannelConfig[]>("/calendar/channels")).data,
    staleTime: 30_000,
  });
}

/** The audit trail. One row per feed per attempt, failures included. */
export function useSyncLogs(propertyId?: string, limit = 100) {
  return useQuery({
    queryKey: channelKeys.logs(propertyId),
    queryFn: async () =>
      (
        await apiClient.get<SyncLog[]>("/calendar/sync-logs", {
          params: { property_id: propertyId, limit },
        })
      ).data,
    staleTime: 15_000,
  });
}

function useChannelInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "channels"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "channel-logs"] });
    // A sync writes booking rows, so the calendar and KPI views are now stale.
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
  };
}

export function useSaveChannelConfig() {
  const invalidate = useChannelInvalidator();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ChannelConfigPayload }) =>
      (await apiClient.patch<ChannelConfig>(`/calendar/channels/${id}`, payload)).data,
    onSuccess: invalidate,
  });
}

export function useSyncNow() {
  const invalidate = useChannelInvalidator();
  return useMutation({
    mutationFn: async (propertyId: string) =>
      (await apiClient.post<SyncRun>(`/calendar/channels/${propertyId}/sync`)).data,
    onSuccess: invalidate,
  });
}

export function useRotateExportToken() {
  const invalidate = useChannelInvalidator();
  return useMutation({
    mutationFn: async (propertyId: string) =>
      (await apiClient.post<ChannelConfig>(`/calendar/channels/${propertyId}/rotate-token`)).data,
    onSuccess: invalidate,
  });
}