import { useState, useEffect, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Input } from '@/components/shared/Input';

type NotificationChannel = 'browser' | 'slack' | 'discord' | 'webhook' | 'email';

interface Settings {
  theme: 'dark' | 'light' | 'system';
  authToken: string;
  slackWebhookUrl: string;
  discordWebhookUrl: string;
  webhookUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpTo: string;
  enabledChannels: Record<NotificationChannel, boolean>;
}

export function Settings() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = () => {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pm2-orbit-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setSettings(data);
      } catch {
        setImportError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    if (importRef.current) importRef.current.value = '';
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    fetch('/api/settings', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => { if (!cancelled) setSettings(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load settings'); })
      .finally(() => clearTimeout(timeout));

    return () => { cancelled = true; controller.abort(); };
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setTheme(settings.theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      toast.error('Failed to save settings', { description: e instanceof Error ? e.message : 'Unknown error' });
    }
    setSaving(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <span className="text-destructive text-sm">Failed to load settings</span>
        <span className="text-xs opacity-60">{error}</span>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-primary hover:text-primary-hover underline mt-2 cursor-pointer"
        >
          Reload page
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  const chEnabled = (ch: NotificationChannel) => settings.enabledChannels?.[ch] ?? true;
  const toggleCh = (ch: NotificationChannel) => update('enabledChannels', { ...settings.enabledChannels, [ch]: !chEnabled(ch) });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 h-[52px] border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[3px] h-4 bg-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            Settings
          </span>
        </div>
        <div className="flex items-center gap-2">
          {importError && <Badge variant="destructive">{importError}</Badge>}
          {saved && <Badge variant="success">Saved</Badge>}
          <input
            ref={importRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => importRef.current?.click()}
            className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground border border-border/60 hover:border-border transition-colors"
            title="Import settings"
          >
            <Upload size={12} /> Import
          </button>
          <button
            onClick={handleExport}
            className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground border border-border/60 hover:border-border transition-colors"
            title="Export settings"
          >
            <Download size={12} /> Export
          </button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <Section title="Appearance">
              <div className="flex gap-1.5 bg-input/50 border border-border/60 p-1">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { update('theme', t); setTheme(t); }}
                    className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                      currentTheme === t
                        ? 'bg-primary/15 text-primary shadow-sm shadow-black/10'
                        : 'text-muted-foreground/50 hover:text-foreground/70'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Security">
              <Field
                label="Auth Token"
                hint="Required for remote access"
                value={settings.authToken}
                onChange={(v) => update('authToken', v)}
                type="password"
                placeholder="Leave empty to disable"
              />
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Section title="Notifications">
              <div className="space-y-1">
                <ChannelItem
                  label="Browser"
                  enabled={chEnabled('browser')}
                  onToggle={() => toggleCh('browser')}
                  dot="bg-primary"
                  hint="Desktop push notifications"
                />
                <ChannelItem
                  label="Slack"
                  enabled={chEnabled('slack')}
                  onToggle={() => toggleCh('slack')}
                  dot="bg-success"
                  value={settings.slackWebhookUrl}
                  onChange={(v) => update('slackWebhookUrl', v)}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <ChannelItem
                  label="Discord"
                  enabled={chEnabled('discord')}
                  onToggle={() => toggleCh('discord')}
                  dot="bg-chart-memory"
                  value={settings.discordWebhookUrl}
                  onChange={(v) => update('discordWebhookUrl', v)}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <ChannelItem
                  label="Webhook"
                  enabled={chEnabled('webhook')}
                  onToggle={() => toggleCh('webhook')}
                  dot="bg-chart-disk"
                  value={settings.webhookUrl}
                  onChange={(v) => update('webhookUrl', v)}
                  placeholder="https://your-webhook-endpoint.com/..."
                />
              </div>
            </Section>

            <Section
              title="Email (SMTP)"
              action={
                <ToggleSwitch
                  checked={chEnabled('email')}
                  onChange={() => toggleCh('email')}
                />
              }
            >
              <div className={!chEnabled('email') ? 'opacity-40 select-none' : ''}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="SMTP Host" value={settings.smtpHost} onChange={(v) => update('smtpHost', v)} placeholder="smtp.gmail.com" disabled={!chEnabled('email')} />
                  <Field label="SMTP Port" value={String(settings.smtpPort)} onChange={(v) => update('smtpPort', parseInt(v) || 587)} placeholder="587" disabled={!chEnabled('email')} />
                  <Field label="Username" value={settings.smtpUser} onChange={(v) => update('smtpUser', v)} placeholder="your@email.com" disabled={!chEnabled('email')} />
                  <Field label="Password" value={settings.smtpPass} onChange={(v) => update('smtpPass', v)} type="password" placeholder="••••••••" disabled={!chEnabled('email')} />
                  <Field label="From Address" value={settings.smtpFrom} onChange={(v) => update('smtpFrom', v)} placeholder="alerts@yourdomain.com" disabled={!chEnabled('email')} />
                  <Field label="To Address" value={settings.smtpTo} onChange={(v) => update('smtpTo', v)} placeholder="admin@yourdomain.com" disabled={!chEnabled('email')} />
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card/40 border border-border/60">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ChannelItem({
  label,
  enabled,
  onToggle,
  dot,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  dot: string;
  hint?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border border-border/30 bg-subtle/5 hover:bg-subtle/20 transition-colors">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${enabled ? dot : 'opacity-20'}`} />
      <span className={`text-xs font-medium min-w-[52px] transition-colors ${enabled ? 'text-foreground/80' : 'text-muted-foreground/40'}`}>
        {label}
      </span>
      {value !== undefined && onChange ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={!enabled}
          className="h-7 text-[11px] font-mono flex-1 min-w-0"
        />
      ) : hint ? (
        <span className="text-[10px] text-muted-foreground/40">{hint}</span>
      ) : null}
      <div className="shrink-0 ml-auto">
        <ToggleSwitch checked={enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 cursor-pointer ${
        checked ? 'bg-primary' : 'bg-subtle/60 hover:bg-subtle'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-background transition-all ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className={`text-[10px] font-medium uppercase tracking-[0.08em] transition-colors ${disabled ? 'text-muted-foreground/25' : 'text-muted-foreground/60'}`}>
        {label}
        {hint && <span className="ml-2 text-[10px] text-muted-foreground/40 font-normal normal-case">{hint}</span>}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-8 text-[11px] font-mono"
      />
    </div>
  );
}
