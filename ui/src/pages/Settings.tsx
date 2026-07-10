import { useState, useEffect, useRef } from 'react';
import {
  Download, Upload, Settings as SettingsIcon, Palette, Shield,
  Bell, Mail, Database, Check, Loader2, AlertCircle, Webhook, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
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
  historyRetentionHours: number;
  logBufferSize: number;
}

const CHANNEL_CONFIG: Record<NotificationChannel, { label: string; icon: React.ReactNode; color: string; placeholder: string }> = {
  browser: { label: 'Browser', icon: <Bell size={13} />, color: 'text-primary', placeholder: '' },
  slack: { label: 'Slack', icon: <MessageSquare size={13} />, color: 'text-green-400', placeholder: 'https://hooks.slack.com/services/...' },
  discord: { label: 'Discord', icon: <MessageSquare size={13} />, color: 'text-indigo-400', placeholder: 'https://discord.com/api/webhooks/...' },
  webhook: { label: 'Webhook', icon: <Webhook size={13} />, color: 'text-amber-400', placeholder: 'https://your-api.com/webhook' },
  email: { label: 'Email', icon: <Mail size={13} />, color: 'text-rose-400', placeholder: '' },
};

export function Settings() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  const handleExport = () => {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pm2-orbit-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported');
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
        toast.success('Settings imported — click Save to apply');
      } catch {
        setImportError('Invalid JSON');
        toast.error('Invalid JSON file');
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
      const res = await api('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        label: 'Save settings',
      });
      if (res.ok) {
        setTheme(settings.theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success('Settings saved');
      }
    } catch (e) {
      toast.error('Failed to save', { description: e instanceof Error ? e.message : 'Unknown error' });
    }
    setSaving(false);
  };

  const handleTestWebhook = async (channel: NotificationChannel) => {
    const urlKey = channel === 'slack' ? 'slackWebhookUrl' : channel === 'discord' ? 'discordWebhookUrl' : 'webhookUrl';
    const url = settings?.[urlKey];
    if (!url) return;

    setTestingChannel(channel);
    try {
      const res = await api('/api/settings/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: channel === 'email' ? 'webhook' : channel }),
        label: 'Test webhook',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${CHANNEL_CONFIG[channel].label} test sent`);
      } else {
        toast.error(`Test failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      toast.error('Test failed — network error');
    }
    setTestingChannel(null);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <AlertCircle size={32} className="text-destructive/50" />
        <span className="text-destructive text-sm font-medium">Failed to load settings</span>
        <span className="text-xs opacity-60">{error}</span>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-primary hover:text-primary-hover underline mt-1 cursor-pointer"
        >
          Reload page
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading settings...</span>
      </div>
    );
  }

  const chEnabled = (ch: NotificationChannel) => settings.enabledChannels?.[ch] ?? true;
  const toggleCh = (ch: NotificationChannel) => update('enabledChannels', { ...settings.enabledChannels, [ch]: !chEnabled(ch) });
  const activeChannels = Object.entries(settings.enabledChannels).filter(([, v]) => v).length;

  return (
    <div className="flex flex-col h-full bg-card/30 border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-card/80 shrink-0">
        <SettingsIcon size={14} className="text-primary" />
        <span className="text-sm text-foreground font-semibold tracking-wider uppercase">Settings</span>

        <Badge variant="outline" className="text-[9px] ml-1">{activeChannels} channels</Badge>

        <div className="ml-auto flex items-center gap-1.5">
          {importError && <Badge variant="destructive" className="text-[9px]">{importError}</Badge>}
          {saved && (
            <Badge variant="success" className="text-[9px] gap-1">
              <Check size={9} /> Saved
            </Badge>
          )}
          <input
            ref={importRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => importRef.current?.click()}
            className="cursor-pointer flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-border/80 transition-colors"
          >
            <Upload size={11} /> Import
          </button>
          <button
            onClick={handleExport}
            className="cursor-pointer flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-border/80 transition-colors"
          >
            <Download size={11} /> Export
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer flex items-center gap-1.5 h-7 px-3 text-[11px] font-semibold text-primary-foreground bg-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-5">
          {/* Appearance + Security — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Appearance */}
            <Section icon={<Palette size={14} />} title="Appearance" description="Choose your preferred color scheme">
              <div className="flex gap-1 bg-input/50 border border-border/60 p-1">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { update('theme', t); setTheme(t); }}
                    className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all cursor-pointer ${
                      currentTheme === t
                        ? 'bg-primary/15 text-primary shadow-sm'
                        : 'text-muted-foreground/50 hover:text-foreground/70 hover:bg-subtle/30'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Section>

            {/* Security */}
            <Section icon={<Shield size={14} />} title="Security" description="Protect access with a bearer token">
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

          {/* Notification Channels */}
          <Section
            icon={<Bell size={14} />}
            title="Notification Channels"
            description="Configure how you receive alerts"
            badge={<Badge variant="outline" className="text-[9px]">{activeChannels}/{Object.keys(CHANNEL_CONFIG).length} active</Badge>}
          >
            <div className="space-y-2">
              {(Object.keys(CHANNEL_CONFIG) as NotificationChannel[]).map((ch) => {
                const config = CHANNEL_CONFIG[ch];
                const enabled = chEnabled(ch);
                const isEmail = ch === 'email';
                const hasUrl = ch !== 'browser' && ch !== 'email';
                const urlKey = ch === 'slack' ? 'slackWebhookUrl' : ch === 'discord' ? 'discordWebhookUrl' : 'webhookUrl';
                const urlValue = hasUrl ? (settings[urlKey as keyof Settings] as string) : '';

                return (
                  <div
                    key={ch}
                    className={`border transition-all ${
                      enabled ? 'border-border/50 bg-subtle/5' : 'border-border/30 bg-transparent opacity-60'
                    }`}
                  >
                    {/* Channel header row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className={`shrink-0 ${enabled ? config.color : 'text-muted-foreground/40'}`}>
                        {config.icon}
                      </div>
                      <span className={`text-[12px] font-medium min-w-[60px] ${enabled ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                        {config.label}
                      </span>

                      {/* URL input for webhook channels */}
                      {hasUrl && (
                        <Input
                          value={urlValue}
                          onChange={(e) => update(urlKey as keyof Settings, e.target.value)}
                          placeholder={config.placeholder}
                          disabled={!enabled}
                          className="h-7 text-[11px] font-mono flex-1 min-w-0"
                        />
                      )}

                      {/* Browser hint */}
                      {ch === 'browser' && (
                        <span className="text-[10px] text-muted-foreground/40 flex-1">Desktop push notifications</span>
                      )}

                      {/* Test button */}
                      {hasUrl && urlValue && enabled && (
                        <button
                          onClick={() => handleTestWebhook(ch)}
                          disabled={testingChannel === ch}
                          className="text-[10px] text-primary hover:text-primary-hover disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {testingChannel === ch ? 'Testing...' : 'Test'}
                        </button>
                      )}

                      {/* Toggle */}
                      <ToggleSwitch checked={enabled} onChange={() => toggleCh(ch)} />
                    </div>

                    {/* Email SMTP sub-section */}
                    {isEmail && enabled && (
                      <div className="px-4 pb-3 pt-1 border-t border-border/20">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="SMTP Host" value={settings.smtpHost} onChange={(v) => update('smtpHost', v)} placeholder="smtp.gmail.com" />
                          <Field label="SMTP Port" value={String(settings.smtpPort)} onChange={(v) => update('smtpPort', parseInt(v) || 587)} placeholder="587" />
                          <Field label="Username" value={settings.smtpUser} onChange={(v) => update('smtpUser', v)} placeholder="your@email.com" />
                          <Field label="Password" value={settings.smtpPass} onChange={(v) => update('smtpPass', v)} type="password" placeholder="••••••••" />
                          <Field label="From Address" value={settings.smtpFrom} onChange={(v) => update('smtpFrom', v)} placeholder="alerts@yourdomain.com" />
                          <Field label="To Address" value={settings.smtpTo} onChange={(v) => update('smtpTo', v)} placeholder="admin@yourdomain.com" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Data Retention */}
          <Section icon={<Database size={14} />} title="Data Retention" description="Configure history and log buffer sizes">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="History Retention"
                hint="hours"
                value={String(settings.historyRetentionHours)}
                onChange={(v) => update('historyRetentionHours', parseInt(v) || 24)}
                placeholder="24"
              />
              <Field
                label="Log Buffer Size"
                hint="lines per process"
                value={String(settings.logBufferSize)}
                onChange={(v) => update('logBufferSize', parseInt(v) || 2000)}
                placeholder="2000"
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────── */

function Section({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/40 border border-border/60">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/30">
        <div className="text-primary">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-semibold text-foreground tracking-wide">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
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
    <div className="space-y-1.5">
      <label className={`text-[10px] font-medium uppercase tracking-[0.08em] flex items-center gap-1.5 ${disabled ? 'text-muted-foreground/25' : 'text-muted-foreground/60'}`}>
        {label}
        {hint && <span className="text-[9px] text-muted-foreground/40 font-normal normal-case tracking-normal">{hint}</span>}
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
        className={`inline-block h-3.5 w-3.5 rounded-full bg-background transition-all shadow-sm ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
