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

      <div className="flex-1 overflow-auto p-6 max-w-2xl">
        <div className="space-y-8">
          {/* Theme */}
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

          {/* Server */}
          <Section title="Server">
            <div className="space-y-4">
              <InfoRow label="Port" value="9823" hint="Set via PM2_ORBIT_PORT env var" />
              <InfoRow label="Host" value="127.0.0.1" hint="Default binding" />
              <InfoRow label="Auth" value={process.env.PM2_ORBIT_TOKEN ? 'Enabled' : 'Disabled'} hint="Set PM2_ORBIT_TOKEN to enable" />
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <div className="space-y-4">
              <InfoRow label="Browser" value="Requires permission" hint="Granted via browser" />
              <InfoRow label="Slack" value="Configure webhook" hint="Set SLACK_WEBHOOK_URL env var" />
              <InfoRow label="Discord" value="Configure webhook" hint="Set DISCORD_WEBHOOK_URL env var" />
              <InfoRow label="Email" value="Configure SMTP" hint="Set SMTP_HOST, SMTP_FROM, SMTP_TO env vars" />
            </div>
          </Section>

          {/* Keyboard Shortcuts */}
          <Section title="Keyboard Shortcuts">
            <div className="space-y-2">
              <ShortcutRow keys={['⌘', 'K']} action="Open command palette" />
              <ShortcutRow keys={['R']} action="Restart selected process" />
              <ShortcutRow keys={['S']} action="Stop selected process" />
              <ShortcutRow keys={['L']} action="Go to Logs" />
              <ShortcutRow keys={['T']} action="Toggle theme" />
              <ShortcutRow keys={['1']} action="Go to Processes" />
              <ShortcutRow keys={['2']} action="Go to Logs" />
              <ShortcutRow keys={['3']} action="Go to Alerts" />
              <ShortcutRow keys={['4']} action="Go to History" />
              <ShortcutRow keys={['5']} action="Go to Settings" />
              <ShortcutRow keys={['Esc']} action="Close panel / deselect" />
            </div>
          </Section>

          {/* About */}
          <Section title="About">
            <div className="space-y-2 text-sm text-muted-foreground/70">
              <p>PM2 Orbit v0.1.0</p>
              <p>High-performance PM2 monitoring dashboard</p>
              <p className="text-[11px] text-muted-foreground/40 mt-2">
                Event-driven architecture • Zero polling • &lt;35MB server RAM
              </p>
            </div>
          </Section>

          <div className="pb-8">
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 mb-4 pb-2 border-b border-border/30">
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
    <div className="flex items-center justify-between py-2 border-b border-border/20">
      <div>
        <span className="text-sm text-foreground/80">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground/40 ml-2">{hint}</span>}
      </div>
      <span className="text-xs font-mono text-muted-foreground/60">{value}</span>
    </div>
  );
}

function ShortcutRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground/70">{action}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd key={i} className="text-[10px] font-mono text-muted-foreground/60 border border-border/60 px-1.5 py-0.5 leading-none min-w-[20px] text-center">
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
