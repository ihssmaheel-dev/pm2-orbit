import fs from 'fs';
import path from 'path';
import type { Tag, TagData } from '../../types';

const TAGS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.pm2-orbit',
);
const TAGS_FILE = path.join(TAGS_DIR, 'tags.json');

let cache: TagData | null = null;

function loadFromDisk(): TagData {
  try {
    if (fs.existsSync(TAGS_FILE)) {
      return JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { tags: [], assignments: {} };
}

function saveToDisk(data: TagData): void {
  try {
    if (!fs.existsSync(TAGS_DIR)) {
      fs.mkdirSync(TAGS_DIR, { recursive: true });
    }
    fs.writeFileSync(TAGS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  } catch { /* ignore */ }
}

function invalidateCache(): void {
  cache = null;
}

export function getTagData(): TagData {
  if (!cache) cache = loadFromDisk();
  return cache;
}

export function getTags(): Tag[] {
  return getTagData().tags;
}

export function createTag(name: string, color: string): Tag {
  const data = getTagData();
  const tag: Tag = {
    id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    color,
  };
  data.tags.push(tag);
  saveToDisk(data);
  invalidateCache();
  return tag;
}

export function updateTag(id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>): boolean {
  const data = getTagData();
  const tag = data.tags.find((t) => t.id === id);
  if (!tag) return false;
  if (updates.name !== undefined) tag.name = updates.name;
  if (updates.color !== undefined) tag.color = updates.color;
  saveToDisk(data);
  invalidateCache();
  return true;
}

export function deleteTag(id: string): boolean {
  const data = getTagData();
  const idx = data.tags.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  data.tags.splice(idx, 1);
  for (const processName of Object.keys(data.assignments)) {
    data.assignments[processName] = data.assignments[processName].filter((tid) => tid !== id);
    if (data.assignments[processName].length === 0) delete data.assignments[processName];
  }
  saveToDisk(data);
  invalidateCache();
  return true;
}

export function assignTagsToProcess(processName: string, tagIds: string[]): void {
  const data = getTagData();
  if (tagIds.length === 0) {
    delete data.assignments[processName];
  } else {
    data.assignments[processName] = tagIds;
  }
  saveToDisk(data);
  invalidateCache();
}

export function getTagsForProcess(processName: string): Tag[] {
  const data = getTagData();
  const ids = data.assignments[processName];
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => data.tags.find((t) => t.id === id)).filter(Boolean) as Tag[];
}
