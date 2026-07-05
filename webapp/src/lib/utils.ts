import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatRelativeTime(epochSeconds: number) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const daysDifference = Math.round((epochSeconds * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
  if (Math.abs(daysDifference) < 1) {
    const hoursDifference = Math.round((epochSeconds * 1000 - Date.now()) / (1000 * 60 * 60))
    if (Math.abs(hoursDifference) < 1) {
      const minutesDifference = Math.round((epochSeconds * 1000 - Date.now()) / (1000 * 60))
      return rtf.format(minutesDifference, 'minute')
    }
    return rtf.format(hoursDifference, 'hour')
  }
  return rtf.format(daysDifference, 'day')
}

export function formatDate(epochSeconds: number) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(epochSeconds * 1000))
}

export function getFileUrl(relPath: string) {
  return 'https://kasp-content-hub.vercel.app/Content/' + relPath.split('/').map(encodeURIComponent).join('/')
}

export function getWeekNumber(name: string): number | null {
  const match = name.match(/week\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

// Week 2 of the program began on this Sunday (Asia/Riyadh). Weeks run Sunday-Thursday,
// and each subsequent week starts exactly 7 days later.
const WEEK_2_START_RIYADH = "2026-07-05"

function getRiyadhDateOnly(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return new Date(`${y}-${m}-${d}T00:00:00Z`)
}

export function getCurrentWeekNumber(): number {
  const today = getRiyadhDateOnly(new Date())
  const week2Start = new Date(`${WEEK_2_START_RIYADH}T00:00:00Z`)
  const diffDays = Math.floor((today.getTime() - week2Start.getTime()) / (1000 * 60 * 60 * 24))
  const weekOffset = Math.floor(diffDays / 7)
  return 2 + weekOffset
}

const PCAP_EXTENSIONS = new Set(['pcap', 'pcapng', 'cap']);

// Extension-level overrides take priority over the broad kind (e.g. distinguishing
// json from other "code" files, or pcap from other network files).
const EXT_COLOR_KEY: Record<string, string> = {
  pdf: 'pdf',
  doc: 'doc', docx: 'doc',
  ppt: 'ppt', pptx: 'ppt',
  xls: 'xls', xlsx: 'xls', csv: 'xls',
  pcap: 'pcap', pcapng: 'pcap', cap: 'pcap',
  json: 'json', ndjson: 'json',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
  mp3: 'audio', wav: 'audio', m4a: 'audio', flac: 'audio',
  py: 'code', js: 'code', ts: 'code', html: 'code', css: 'code', sh: 'code', ps1: 'code', c: 'code', cpp: 'code', java: 'code',
  md: 'md', markdown: 'md', txt: 'text', log: 'text',
};

// Card tint classes: readable text shade (400) + subtle bg/border at rest, with a
// slightly stronger bg/border on hover for interactive feedback.
const COLOR_CLASSES: Record<string, string> = {
  pdf: 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/[0.15] hover:border-red-500/35',
  doc: 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/[0.15] hover:border-blue-500/35',
  ppt: 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/[0.15] hover:border-orange-500/35',
  xls: 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/[0.15] hover:border-green-500/35',
  json: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/[0.15] hover:border-amber-500/35',
  image: 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/[0.15] hover:border-purple-500/35',
  video: 'text-pink-400 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/[0.15] hover:border-pink-500/35',
  audio: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/[0.15] hover:border-indigo-500/35',
  archive: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/[0.15] hover:border-yellow-500/35',
  code: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/[0.15] hover:border-cyan-500/35',
  pcap: 'text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/[0.15] hover:border-sky-500/35',
  md: 'text-teal-400 bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/[0.15] hover:border-teal-500/35',
  text: 'text-stone-400 bg-stone-500/10 border-stone-500/20 hover:bg-stone-500/[0.15] hover:border-stone-500/35',
  file: 'text-slate-400 bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/[0.15] hover:border-slate-500/35',
};

export function getFileColorAccent(type?: string) {
  return COLOR_CLASSES[type || 'file'] || COLOR_CLASSES.file;
}

export interface FuzzyMatch {
  score: number;
  indices: number[];
}

// Lightweight fuzzy matcher: exact substring hits score highest (bonus for
// matching at a word boundary / start of string), falling back to in-order
// subsequence matching so typos/partial words still surface useful results.
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  const idx = t.indexOf(q);
  if (idx !== -1) {
    const indices = Array.from({ length: q.length }, (_, i) => idx + i);
    const isWordStart = idx === 0 || /[\s/_\-.]/.test(t[idx - 1]);
    let score = 100 - idx * 0.5 + (q.length / t.length) * 20;
    if (isWordStart) score += 25;
    if (idx === 0) score += 15;
    return { score, indices };
  }

  const indices: number[] = [];
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return null;
    indices.push(found);
    ti = found + 1;
  }
  const span = indices[indices.length - 1] - indices[0] + 1;
  const density = q.length / span;
  const score = 40 * density - indices[0] * 0.1;
  return { score, indices };
}

export function getEffectiveFileKind(file: { type?: string; ftype?: string; ext?: string }): string {
  const ext = (file.ext || '').replace(/^\./, '').toLowerCase();
  if (EXT_COLOR_KEY[ext]) return EXT_COLOR_KEY[ext];
  if (PCAP_EXTENSIONS.has(ext)) return 'pcap';
  return file.ftype || file.type || 'file';
}
