import fs from 'fs';
import path from 'path';

const NOTES_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.pm2-orbit',
);
const NOTES_FILE = path.join(NOTES_DIR, 'notes.json');

interface NotesData {
  notes: Record<string, string>;
}

let cache: NotesData | null = null;

function loadFromDisk(): NotesData {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { notes: {} };
}

function saveToDisk(data: NotesData): void {
  try {
    if (!fs.existsSync(NOTES_DIR)) {
      fs.mkdirSync(NOTES_DIR, { recursive: true });
    }
    fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  } catch { /* ignore */ }
}

function invalidateCache(): void {
  cache = null;
}

function getData(): NotesData {
  if (!cache) cache = loadFromDisk();
  return cache;
}

export function getNote(processName: string): string | null {
  const data = getData();
  const note = data.notes[processName];
  if (!note || note.trim().length === 0) return null;
  return note;
}

export function getAllNotes(): Record<string, string> {
  return { ...getData().notes };
}

export function setNote(processName: string, note: string): void {
  const data = getData();
  if (!note || note.trim().length === 0) {
    delete data.notes[processName];
  } else {
    data.notes[processName] = note;
  }
  saveToDisk(data);
  invalidateCache();
}

export function deleteNote(processName: string): void {
  const data = getData();
  delete data.notes[processName];
  saveToDisk(data);
  invalidateCache();
}
