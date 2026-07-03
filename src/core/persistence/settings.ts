import fs from 'fs';
import path from 'path';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const SETTINGS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.pm2-orbit',
);
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');
const KEY_FILE = path.join(SETTINGS_DIR, '.key');

export type NotificationChannel = 'browser' | 'slack' | 'discord' | 'webhook' | 'email';

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  port: number;
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

const DEFAULTS: Settings = {
  theme: 'dark',
  port: 9823,
  authToken: '',
  slackWebhookUrl: '',
  discordWebhookUrl: '',
  webhookUrl: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  smtpTo: '',
  enabledChannels: { browser: true, slack: true, discord: true, webhook: true, email: true },
  historyRetentionHours: 24,
  logBufferSize: 2000,
};

const SENSITIVE_KEYS = ['authToken', 'smtpPass', 'slackWebhookUrl', 'discordWebhookUrl', 'webhookUrl'];

function getOrCreateKey(): Buffer {
  try {
    if (fs.existsSync(KEY_FILE)) {
      return Buffer.from(fs.readFileSync(KEY_FILE, 'utf-8'), 'hex');
    }
  } catch {
    // ignore
  }
  const key = randomBytes(32);
  try {
    if (!fs.existsSync(SETTINGS_DIR)) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
    fs.writeFileSync(KEY_FILE, key.toString('hex'), { mode: 0o600 });
  } catch {
    // ignore
  }
  return key;
}

function encrypt(value: string): string {
  if (!value) return '';
  try {
    const key = getOrCreateKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch {
    return value;
  }
}

function decrypt(value: string): string {
  if (!value || !value.includes(':')) return value;
  try {
    const key = getOrCreateKey();
    const [ivHex, encryptedHex] = value.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return value;
  }
}

let settingsCache: Settings | null = null;

function loadSettings(): Settings {
  if (settingsCache) return settingsCache;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULTS, ...parsed };
      for (const key of SENSITIVE_KEYS) {
        if (merged[key as keyof Settings]) {
          merged[key as keyof Settings] = decrypt(merged[key as keyof Settings] as string) as never;
        }
      }
      // Auto-generate token if none exists
      if (!merged.authToken) {
        merged.authToken = randomBytes(24).toString('hex');
        saveSettings(merged);
      }
      settingsCache = merged;
      return merged;
    }
  } catch {
    // ignore
  }
  // First run — generate token
  const firstRun = { ...DEFAULTS, authToken: randomBytes(24).toString('hex') };
  saveSettings(firstRun);
  settingsCache = firstRun;
  return settingsCache;
}

function invalidateCache() {
  settingsCache = null;
}

function saveSettings(settings: Settings): void {
  try {
    if (!fs.existsSync(SETTINGS_DIR)) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
    const toSave = { ...settings };
    for (const key of SENSITIVE_KEYS) {
      if (toSave[key as keyof Settings]) {
        toSave[key as keyof Settings] = encrypt(toSave[key as keyof Settings] as string) as never;
      }
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2), { mode: 0o600 });
    invalidateCache();
  } catch {
    // ignore
  }
}

export function getSettings(): Settings {
  return loadSettings();
}

export function getSettingsSafe(): Omit<Settings, 'authToken' | 'smtpPass'> & { authToken: string; smtpPass: string } {
  const settings = loadSettings();
  return {
    ...settings,
    authToken: settings.authToken ? '••••••••' : '',
    smtpPass: settings.smtpPass ? '••••••••' : '',
  };
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const current = loadSettings();
  const next = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'authToken' || key === 'smtpPass') {
      if (value === '••••••••' || value === '') {
        continue;
      }
    }
    (next as Record<string, unknown>)[key] = value;
  }
  saveSettings(next);
  return next;
}

export function applySettingsToEnv(settings: Settings): void {
  if (settings.authToken) process.env.PM2_ORBIT_TOKEN = settings.authToken;
  if (settings.slackWebhookUrl) process.env.SLACK_WEBHOOK_URL = settings.slackWebhookUrl;
  if (settings.discordWebhookUrl) process.env.DISCORD_WEBHOOK_URL = settings.discordWebhookUrl;
  if (settings.webhookUrl) process.env.WEBHOOK_URL = settings.webhookUrl;
  if (settings.smtpHost) process.env.SMTP_HOST = settings.smtpHost;
  if (settings.smtpPort) process.env.SMTP_PORT = String(settings.smtpPort);
  if (settings.smtpUser) process.env.SMTP_USER = settings.smtpUser;
  if (settings.smtpPass) process.env.SMTP_PASS = settings.smtpPass;
  if (settings.smtpFrom) process.env.SMTP_FROM = settings.smtpFrom;
  if (settings.smtpTo) process.env.SMTP_TO = settings.smtpTo;
  if (settings.theme) process.env.PM2_ORBIT_THEME = settings.theme;
  if (settings.historyRetentionHours) process.env.PM2_ORBIT_RETENTION_HOURS = String(settings.historyRetentionHours);
  if (settings.logBufferSize) process.env.PM2_ORBIT_LOG_BUFFER = String(settings.logBufferSize);
  for (const ch of Object.keys(settings.enabledChannels)) {
    process.env[`NOTIFY_${ch.toUpperCase()}_ENABLED`] = settings.enabledChannels[ch as NotificationChannel] ? '1' : '0';
  }
}
