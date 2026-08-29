import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Link2,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";

import {
  useChannelConfigs,
  useRotateExportToken,
  useSaveChannelConfig,
  useSyncLogs,
  useSyncNow,
} from "@/hooks/useChannelSync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { ChannelConfig, SyncLog } from "@/api/types";

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function StatusPill({ log }: { log: SyncLog }) {
  const tone =
    log.status === "success"
      ? "bg-emerald-50 text-emerald-700"
      : log.status === "failed"
        ? "bg-red-50 text-red-700"
        : "bg-brand-forest/8 text-brand-ink/50";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
      {log.status}
    </span>
  );
}

function ChannelRow({ config }: { config: ChannelConfig }) {
  const { canManageChannels } = useAuth();
  const toast = useToast();

  const [airbnb, setAirbnb] = useState("");
  const [vrbo, setVrbo] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = useSaveChannelConfig();
  const syncNow = useSyncNow();
  const rotate = useRotateExportToken();

  const { data: logs = [] } = useSyncLogs(expanded ? config.property_id : undefined, 10);

  const handleSave = async () => {
    // Only send fields the operator actually touched: an untouched input must
    // not clear a stored feed. An explicit empty string does clear it.
    const payload: { airbnb_ical_url?: string; vrbo_ical_url?: string } = {};
    if (airbnb !== "") payload.airbnb_ical_url = airbnb.trim();
    if (vrbo !== "") payload.vrbo_ical_url = vrbo.trim();
    if (Object.keys(payload).length === 0) {
      toast.notify("Nothing to save — paste a feed URL first.", "info");
      return;
    }
    try {
      await save.mutateAsync({ id: config.property_id, payload });
      setAirbnb("");
      setVrbo("");
      toast.notify("Calendar feeds saved.", "success");
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Could not save feeds.", "error");
    }
  };

  const handleSync = async () => {
    try {
      const run = await syncNow.mutateAsync(config.property_id);
      const ran = run.results.filter((r) => r.status !== "skipped");
      const pulled = ran.reduce((sum, r) => sum + r.events_found, 0);
      toast.notify(
        run.ok
          ? `Synced ${ran.length} feed(s) — ${pulled} reservation block(s) imported.`
          : `Sync finished with errors: ${ran.find((r) => r.error_message)?.error_message ?? ""}`,
        run.ok ? "success" : "error",
      );
      setExpanded(true);
    } catch (err) {
      toast.notify(err instanceof Error ? err.message : "Sync failed.", "error");
    }
  };

  const copyExport = async () => {
    await navigator.clipboard.writeText(config.export_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connected = config.airbnb_ical_configured || config.vrbo_ical_configured;

  return (
    <div className="rounded-xl border border-brand-forest/12 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-brand-ink">{config.address}</p>
          <p className="mt-0.5 text-xs text-brand-ink/45">
            {connected ? (
              <>
                Airbnb {config.airbnb_ical_configured ? relativeTime(config.airbnb_last_synced_at) : "—"}
                {" · "}
                VRBO {config.vrbo_ical_configured ? relativeTime(config.vrbo_last_synced_at) : "—"}
                {" · "}
                {config.upcoming_blocked_nights} blocked range(s) ahead
              </>
            ) : (
              "No channel feed connected"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide" : "Configure"}
          </Button>
          {canManageChannels && connected && (
            <Button size="sm" variant="primary" loading={syncNow.isPending} onClick={handleSync}>
              <RefreshCw className="h-3 w-3" /> Sync now
            </Button>
          )}
        </div>
      </div>

      {config.last_sync_error && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {config.last_sync_error}
        </p>
      )}

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-brand-forest/10 pt-5">
          {/* ---------------------------------------------------- inbound */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink/45">
              Import from channels
            </p>
            <p className="mt-1 text-xs text-brand-ink/50">
              Airbnb: Calendar → Availability → Connect calendars → Export. VRBO: Calendar →
              Import/Export → Export. Paste the export links below; reservations on those
              platforms will block these dates on the website.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                label="Airbnb export URL"
                hint={config.airbnb_ical_preview ?? "Not configured"}
              >
                <TextInput
                  value={airbnb}
                  placeholder="https://www.airbnb.com/calendar/ical/…"
                  disabled={!canManageChannels}
                  onChange={(e) => setAirbnb(e.target.value)}
                />
              </Field>
              <Field label="VRBO export URL" hint={config.vrbo_ical_preview ?? "Not configured"}>
                <TextInput
                  value={vrbo}
                  placeholder="http://www.vrbo.com/icalendar/…"
                  disabled={!canManageChannels}
                  onChange={(e) => setVrbo(e.target.value)}
                />
              </Field>
            </div>

            {canManageChannels && (
              <Button
                size="sm"
                variant="primary"
                className="mt-3"
                loading={save.isPending}
                onClick={handleSave}
              >
                <Save className="h-3 w-3" /> Save feeds
              </Button>
            )}
          </div>

          {/* --------------------------------------------------- outbound */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink/45">
              Export to channels
            </p>
            <p className="mt-1 text-xs text-brand-ink/50">
              Import this link into Airbnb and VRBO so a booking taken here blocks those
              platforms too. It publishes dates only — no guest names, contact details or prices.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-brand-cream px-3 py-2 text-xs text-brand-ink/70">
                {config.export_url}
              </code>
              <Button size="sm" onClick={copyExport}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              {canManageChannels && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={rotate.isPending}
                  onClick={() => rotate.mutate(config.property_id)}
                  title="Invalidate the current link. You must re-import the new URL on each channel."
                >
                  <RotateCcw className="h-3 w-3" /> Rotate
                </Button>
              )}
            </div>
          </div>

          {/* -------------------------------------------------- audit log */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink/45">
              Recent sync activity
            </p>
            {logs.length === 0 ? (
              <p className="mt-2 text-xs text-brand-ink/40">No sync has run for this home yet.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-brand-cream px-3 py-2 text-xs"
                  >
                    <StatusPill log={log} />
                    <span className="font-medium capitalize text-brand-ink/70">{log.source}</span>
                    <span className="text-brand-ink/50">
                      {new Date(log.started_at).toLocaleString()}
                    </span>
                    {log.status === "success" && (
                      <span className="text-brand-ink/50">
                        {log.events_found} found · {log.events_created} new ·{" "}
                        {log.events_updated} updated · {log.events_removed} released ·{" "}
                        {log.duration_ms}ms
                      </span>
                    )}
                    {log.error_message && (
                      <span className="text-red-600">{log.error_message}</span>
                    )}
                    <span className="ml-auto text-brand-ink/35">{log.triggered_by}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChannelSync() {
  const { data: configs = [], isLoading, isError, error } = useChannelConfigs();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return configs;
    return configs.filter((c) => c.address.toLowerCase().includes(needle));
  }, [configs, query]);

  const connectedCount = configs.filter(
    (c) => c.airbnb_ical_configured || c.vrbo_ical_configured,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-brand-ink">Channel sync</h1>
        <p className="mt-1 text-sm text-brand-ink/55">
          Two-way calendar sync with Airbnb and VRBO. {connectedCount} of {configs.length} homes
          connected.
        </p>
      </div>

      {connectedCount === 0 && !isLoading && (
        <div className="flex items-start gap-3 rounded-xl bg-brand-gold/10 p-4 text-sm text-brand-ink/75">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
          <div>
            <p className="font-medium text-brand-ink">No calendar feeds connected yet.</p>
            <p className="mt-1 text-xs text-brand-ink/55">
              Sync stays inactive until at least one Airbnb or VRBO export URL is saved. Open a
              home below and paste its export link to start blocking dates automatically.
            </p>
          </div>
        </div>
      )}

      <TextInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by address…"
        className="max-w-sm"
      />

      {isLoading && <p className="text-sm text-brand-ink/40">Loading homes…</p>}
      {isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : "Could not load channel configuration."}
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((config) => (
          <ChannelRow key={config.property_id} config={config} />
        ))}
      </div>
    </div>
  );
}