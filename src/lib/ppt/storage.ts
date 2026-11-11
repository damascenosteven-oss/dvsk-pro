import { randomInt } from 'node:crypto';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { PresentationSkillId } from './schema';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PREFIX = 'ai-ppt/';
const HISTORY_PREFIX = `${PREFIX}history/`;
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function bucket(): string {
  return requiredEnv('COS_BUCKET');
}

function client(): S3Client {
  const region = requiredEnv('COS_REGION');
  return new S3Client({
    region,
    endpoint: process.env.COS_ENDPOINT || `https://cos.${region}.myqcloud.com`,
    credentials: {
      accessKeyId: requiredEnv('COS_SECRET_ID'),
      secretAccessKey: requiredEnv('COS_SECRET_KEY'),
    },
    forcePathStyle: false,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

function keyFor(code: string): string {
  return `${PREFIX}${code}.html`;
}

function historyKey(ownerHash: string, code: string): string {
  if (!/^[a-f0-9]{64}$/.test(ownerHash)) throw new Error('Invalid owner hash');
  return `${HISTORY_PREFIX}${ownerHash}/${code}.json`;
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const named = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return named.name === 'NotFound' || named.$metadata?.httpStatusCode === 404;
}

function randomCode(): string {
  return Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export async function allocateShareCode(): Promise<string> {
  const s3 = client();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: keyFor(code) }));
    } catch (error) {
      if (isNotFound(error)) return code;
      throw error;
    }
  }
  throw new Error('Unable to allocate a unique share code');
}

export async function saveDeck(
  code: string,
  html: Buffer,
  title: string,
  options: { ownerHash?: string; researchStatus?: string; motionProfile?: string; motionDesign?: DeckHistoryItem['motionDesign']; skillId?: PresentationSkillId; skillVersion?: number; skillLabel?: string; now?: number } = {},
): Promise<string> {
  const now = options.now ?? Date.now();
  const expiresAt = new Date(now + RETENTION_MS).toISOString();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: keyFor(code),
      Body: html,
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'private, no-store',
      Metadata: {
        createdAt: new Date(now).toISOString(),
        expiresAt,
        title: encodeURIComponent(title),
        ...(options.ownerHash ? { ownerHash: options.ownerHash } : {}),
        ...(options.researchStatus ? { researchStatus: options.researchStatus } : {}),
        ...(options.motionProfile ? { motionProfile: encodeURIComponent(options.motionProfile) } : {}),
        ...(options.skillId ? { skillId: options.skillId, skillVersion: String(options.skillVersion || 1), skillLabel: encodeURIComponent(options.skillLabel || options.skillId) } : {}),
        ...(options.motionDesign ? {
          motionFingerprint: options.motionDesign.fingerprint,
          motionRecipe: options.motionDesign.recipe,
          motionBackground: options.motionDesign.background,
          motionTransition: options.motionDesign.transition,
          motionLayout: options.motionDesign.layoutSignature,
        } : {}),
      },
    }),
  );
  return expiresAt;
}

export type DeckHistoryItem = {
  code: string;
  title: string;
  createdAt: string;
  expiresAt: string;
  researchStatus: 'not-required' | 'completed';
  motionProfile?: string;
  skillId?: PresentationSkillId;
  skillVersion?: number;
  skillLabel?: string;
  motionDesign?: {
    fingerprint: string;
    recipe: string;
    background: string;
    transition: string;
    layoutSignature: string;
  };
};

async function deckHistoryItem(code: string, now = Date.now()): Promise<DeckHistoryItem | null> {
  try {
    const head = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: keyFor(code) }));
    const expiresAt = head.Metadata?.expiresat || head.Metadata?.expiresAt;
    const createdAt = head.Metadata?.createdat || head.Metadata?.createdAt;
    if (!expiresAt || !createdAt || new Date(expiresAt).getTime() <= now) return null;
    const rawTitle = head.Metadata?.title || '';
    let title = rawTitle;
    try { title = decodeURIComponent(rawTitle); } catch {}
    const rawMotionProfile = head.Metadata?.motionprofile || head.Metadata?.motionProfile || '';
    let motionProfile = rawMotionProfile;
    try { motionProfile = decodeURIComponent(rawMotionProfile); } catch {}
    const motionDesign = safeMotionDesign({
      fingerprint: head.Metadata?.motionfingerprint || head.Metadata?.motionFingerprint,
      recipe: head.Metadata?.motionrecipe || head.Metadata?.motionRecipe,
      background: head.Metadata?.motionbackground || head.Metadata?.motionBackground,
      transition: head.Metadata?.motiontransition || head.Metadata?.motionTransition,
      layoutSignature: head.Metadata?.motionlayout || head.Metadata?.motionLayout,
    });
    const rawSkillLabel = head.Metadata?.skilllabel || head.Metadata?.skillLabel || '';
    let storedSkillLabel = rawSkillLabel;
    try { storedSkillLabel = decodeURIComponent(rawSkillLabel); } catch {}
    const storedSkillId = safeSkillId(head.Metadata?.skillid || head.Metadata?.skillId);
    return {
      code,
      title: title || '未命名演示文稿',
      createdAt,
      expiresAt,
      researchStatus: (head.Metadata?.researchstatus || head.Metadata?.researchStatus) === 'completed' ? 'completed' : 'not-required',
      motionProfile: motionProfile || undefined,
      motionDesign,
      skillId: storedSkillId,
      skillVersion: storedSkillId ? Number(head.Metadata?.skillversion || head.Metadata?.skillVersion || 1) : undefined,
      skillLabel: storedSkillLabel || undefined,
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function saveDeckHistory(ownerHash: string, item: DeckHistoryItem): Promise<void> {
  await client().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: historyKey(ownerHash, item.code),
    Body: JSON.stringify(item),
    ContentType: 'application/json; charset=utf-8',
    CacheControl: 'private, no-store',
    Metadata: { expiresAt: item.expiresAt },
  }));
}

function safeMotionDesign(value: unknown): DeckHistoryItem['motionDesign'] {
  if (!value || typeof value !== 'object') return undefined;
  const design = value as Record<string, unknown>;
  if (!/^v1:[a-f0-9]{16}$/.test(String(design.fingerprint || ''))) return undefined;
  if (!/^[a-z-]{3,40}$/.test(String(design.recipe || ''))) return undefined;
  if (!/^[a-z-]{3,40}$/.test(String(design.background || ''))) return undefined;
  if (!/^[a-z-]{3,40}$/.test(String(design.transition || ''))) return undefined;
  if (!/^[a-f0-9]{12}$/.test(String(design.layoutSignature || ''))) return undefined;
  return {
    fingerprint: String(design.fingerprint),
    recipe: String(design.recipe),
    background: String(design.background),
    transition: String(design.transition),
    layoutSignature: String(design.layoutSignature),
  };
}

function safeSkillId(value: unknown): PresentationSkillId | undefined {
  return ['executive-briefing', 'data-research-report', 'training-course', 'product-launch', 'project-proposal', 'legacy-general'].includes(String(value))
    ? String(value) as PresentationSkillId
    : undefined;
}

export async function importDeckHistory(ownerHash: string, code: string, now = Date.now()): Promise<DeckHistoryItem | null> {
  const item = await deckHistoryItem(code, now);
  if (!item) return null;
  await saveDeckHistory(ownerHash, item);
  return item;
}

export async function listDeckHistory(ownerHash: string, now = Date.now()): Promise<DeckHistoryItem[]> {
  const s3 = client();
  const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: `${HISTORY_PREFIX}${ownerHash}/`, MaxKeys: 100 }));
  const items: DeckHistoryItem[] = [];
  for (const object of page.Contents || []) {
    if (!object.Key?.endsWith('.json')) continue;
    try {
      const result = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: object.Key }));
      if (!result.Body) continue;
      const parsed = JSON.parse(await result.Body.transformToString()) as Partial<DeckHistoryItem>;
      if (!parsed.code || !parsed.title || !parsed.createdAt || !parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= now) continue;
      if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(parsed.code)) continue;
      items.push({
        code: parsed.code,
        title: String(parsed.title).slice(0, 120),
        createdAt: parsed.createdAt,
        expiresAt: parsed.expiresAt,
        researchStatus: parsed.researchStatus === 'completed' ? 'completed' : 'not-required',
        motionProfile: typeof parsed.motionProfile === 'string' ? parsed.motionProfile.slice(0, 80) : undefined,
        motionDesign: safeMotionDesign(parsed.motionDesign),
        skillId: safeSkillId(parsed.skillId),
        skillVersion: typeof parsed.skillVersion === 'number' && Number.isInteger(parsed.skillVersion) ? parsed.skillVersion : undefined,
        skillLabel: typeof parsed.skillLabel === 'string' ? parsed.skillLabel.slice(0, 80) : undefined,
      });
    } catch (error) {
      if (!isNotFound(error)) console.error('ppt_history_item_invalid', { key: object.Key });
    }
  }
  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export type StoredDeck =
  | { status: 'ok'; html: Uint8Array }
  | { status: 'missing' }
  | { status: 'expired' };

export async function loadDeck(code: string, now = Date.now()): Promise<StoredDeck> {
  try {
    const result = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: keyFor(code) }));
    const expiresAt = result.Metadata?.expiresat || result.Metadata?.expiresAt;
    if (!expiresAt || new Date(expiresAt).getTime() <= now) return { status: 'expired' };
    if (!result.Body) return { status: 'missing' };
    return { status: 'ok', html: await result.Body.transformToByteArray() };
  } catch (error) {
    if (isNotFound(error)) return { status: 'missing' };
    throw error;
  }
}

export async function deleteExpiredDecks(now = Date.now()): Promise<number> {
  const s3 = client();
  let continuationToken: string | undefined;
  let deleted = 0;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: PREFIX, ContinuationToken: continuationToken }),
    );
    const expired: Array<{ Key: string }> = [];
    for (const object of page.Contents || []) {
      if (!object.Key) continue;
      if (object.Key.startsWith(HISTORY_PREFIX)) {
        try {
          const head = await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: object.Key }));
          const expiresAt = head.Metadata?.expiresat || head.Metadata?.expiresAt;
          if (!expiresAt || new Date(expiresAt).getTime() <= now) expired.push({ Key: object.Key });
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }
      } else if (object.LastModified && object.LastModified.getTime() + RETENTION_MS <= now) {
        expired.push({ Key: object.Key });
      }
    }
    if (expired.length > 0) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: expired, Quiet: true } }));
      deleted += expired.length;
    }
    continuationToken = page.NextContinuationToken;
  } while (continuationToken);
  return deleted;
}
