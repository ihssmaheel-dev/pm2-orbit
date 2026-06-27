import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 h-[52px] border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[3px] h-4 bg-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            Settings
          </span>
        </div>
        {saved && (
          <Badge variant="success">Saved</Badge>
        )}
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
                      onClick={() => setTheme(t)}
                      className={`px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${
                        theme === t
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

            <Section title="Server">
              <div className="space-y-0">
                <InfoRow label="Port" value="9823" hint="PM2_ORBIT_PORT" />
                <InfoRow label="Host" value="127.0.0.1" hint="Default binding" />
                <InfoRow label="Auth" value="Token-based" hint="PM2_ORBIT_TOKEN" />
                <InfoRow label="Version" value="v0.1.0" />
              </div>
            </Section>

            <Section title="About">
              <div className="space-y-2 text-sm text-muted-foreground/70">
                <p>High-performance PM2 monitoring dashboard</p>
                <p className="text-[11px] text-muted-foreground/40">
                  Event-driven architecture • Zero polling • &lt;35MB server RAM
                </p>
              </div>
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Section title="Notifications">
              <div className="space-y-0">
                <InfoRow label="Browser" value="Requires permission" hint="Browser Notification API" />
                <InfoRow label="Slack" value="Webhook URL" hint="SLACK_WEBHOOK_URL" />
                <InfoRow label="Discord" value="Webhook URL" hint="DISCORD_WEBHOOK_URL" />
                <InfoRow label="Email" value="SMTP config" hint="SMTP_HOST, SMTP_FROM, SMTP_TO" />
              </div>
            </Section>

            <Section title="Keyboard Shortcuts">
              <div className="space-y-0">
                <ShortcutRow keys={['⌘', 'K']} action="Command palette" />
                <ShortcutRow keys={['R']} action="Restart selected" />
                <ShortcutRow keys={['S']} action="Stop selected" />
                <ShortcutRow keys={['L']} action="Go to Logs" />
                <ShortcutRow keys={['T']} action="Toggle theme" />
                <ShortcutRow keys={['1-5']} action="Switch tabs" />
                <ShortcutRow keys={['Esc']} action="Close / deselect" />
              </div>
            </Section>

            <Section title="Environment Variables">
              <div className="space-y-0">
                <EnvRow name="PM2_ORBIT_PORT" description="Server port (default: 9823)" />
                <EnvRow name="PM2_ORBIT_TOKEN" description="Auth token for remote access" />
                <EnvRow name="PM2_ORBIT_THEME" description="Default theme (dark|light|system)" />
                <EnvRow name="SLACK_WEBHOOK_URL" description="Slack notification webhook" />
                <EnvRow name="DISCORD_WEBHOOK_URL" description="Discord notification webhook" />
                <EnvRow name="SMTP_HOST" description="Email SMTP server host" />
                <EnvRow name="WEBHOOK_URL" description="Generic alert webhook URL" />
              </div>
            </Section>
          </div>
        </div>

        <div className="mt-8 pb-8">
          <Button onClick={handleSave}>Save Settings</Button>
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
  return (
    <span className="text-xs text-foreground/80">{children}</span>
  );
}

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground/80">{label}</span>
        {hint && (
          <span className="text-[10px] font-mono text-muted-foreground/30 bg-subtle/30 px-1.5 py-0.5">
            {hint}
          </span>
        )}
      </div>
      <span className="text-xs font-mono text-muted-foreground/60">{value}</span>
    </div>
  );
}

function ShortcutRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <span className="text-sm text-foreground/70">{action}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd key={i} className="text-[10px] font-mono text-muted-foreground/60 bg-subtle/30 border border-border/30 px-1.5 py-0.5 leading-none min-w-[20px] text-center">
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

function EnvRow({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-2">
        <code className="text-[11px] font-mono text-primary/80">{name}</code>
      </div>
      <span className="text-[11px] text-muted-foreground/50">{description}</span>
    </div>
  );
}
