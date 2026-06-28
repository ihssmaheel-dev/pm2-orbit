import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Input } from '@/components/shared/Input';

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
}

export function Settings() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const update = (key: keyof Settings, value: string | number) => {
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
    } catch {
      // ignore
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
          className="text-xs text-primary hover:text-primary-hover underline mt-2"
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 h-[52px] border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[3px] h-4 bg-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            Settings
          </span>
        </div>
        <div className="flex items-center gap-3">
          {saved && <Badge variant="success">Saved</Badge>}
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
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { update('theme', t); setTheme(t); }}
                      className={`px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${
                        currentTheme === t
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Security">
              <div className="space-y-4">
                <Field
                  label="Auth Token"
                  hint="Required for non-localhost access"
                  value={settings.authToken}
                  onChange={(v) => update('authToken', v)}
                  type="password"
                  placeholder="Leave empty to disable"
                />
              </div>
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Section title="Notifications">
              <div className="space-y-4">
                <Field
                  label="Slack Webhook URL"
                  value={settings.slackWebhookUrl}
                  onChange={(v) => update('slackWebhookUrl', v)}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <Field
                  label="Discord Webhook URL"
                  value={settings.discordWebhookUrl}
                  onChange={(v) => update('discordWebhookUrl', v)}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <Field
                  label="Generic Webhook URL"
                  value={settings.webhookUrl}
                  onChange={(v) => update('webhookUrl', v)}
                  placeholder="https://your-webhook-endpoint.com/..."
                />
              </div>
            </Section>

            <Section title="Email (SMTP)">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="SMTP Host"
                    value={settings.smtpHost}
                    onChange={(v) => update('smtpHost', v)}
                    placeholder="smtp.gmail.com"
                  />
                  <Field
                    label="SMTP Port"
                    value={String(settings.smtpPort)}
                    onChange={(v) => update('smtpPort', parseInt(v) || 587)}
                    placeholder="587"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Username"
                    value={settings.smtpUser}
                    onChange={(v) => update('smtpUser', v)}
                    placeholder="your@email.com"
                  />
                  <Field
                    label="Password"
                    value={settings.smtpPass}
                    onChange={(v) => update('smtpPass', v)}
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="From Address"
                    value={settings.smtpFrom}
                    onChange={(v) => update('smtpFrom', v)}
                    placeholder="alerts@yourdomain.com"
                  />
                  <Field
                    label="To Address"
                    value={settings.smtpTo}
                    onChange={(v) => update('smtpTo', v)}
                    placeholder="admin@yourdomain.com"
                  />
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/40 border border-border/60 p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 mb-4 pb-3 border-b border-border/30">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-foreground/80">{children}</span>;
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs text-foreground/80">{label}</label>
        {hint && (
          <span className="text-[10px] text-muted-foreground/40">{hint}</span>
        )}
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-xs"
      />
    </div>
  );
}
