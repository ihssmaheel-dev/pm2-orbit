import fs from 'fs';
import path from 'path';

const SETTINGS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.pm2-orbit',
);
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

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
};

function loadSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

function saveSettings(settings: Settings): void {
  try {
    if (!fs.existsSync(SETTINGS_DIR)) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch {
    // ignore
  }
}

export function getSettings(): Settings {
  return loadSettings();
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const current = loadSettings();
  const next = { ...current, ...updates };
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
}
