import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'yuling_ppt_session';
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const DEVICE_COOKIE = 'yuling_ppt_device';
export const DEVICE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(expiresAt: string): string {
  return createHmac('sha256', requiredEnv('PPT_SESSION_SECRET')).update(expiresAt).digest('base64url');
}

function deviceSignature(id: string): string {
  return createHmac('sha256', requiredEnv('PPT_SESSION_SECRET')).update(`device:${id}`).digest('base64url');
}

function validDeviceId(id: string): boolean {
  return /^[A-Za-z0-9_-]{22}$/.test(id);
}

export type DeviceIdentity = { id: string; ownerHash: string; cookieValue?: string };

export function createDeviceToken(): string {
  const id = randomBytes(16).toString('base64url');
  return `${id}.${deviceSignature(id)}`;
}

export function verifyDeviceToken(token: string | undefined): string | null {
  if (!token) return null;
  const [id, suppliedSignature, extra] = token.split('.');
  if (!id || !suppliedSignature || extra || !validDeviceId(id)) return null;
  return safeEqual(suppliedSignature, deviceSignature(id)) ? id : null;
}

export function deviceOwnerHash(id: string): string {
  return createHmac('sha256', requiredEnv('PPT_SESSION_SECRET')).update(`owner:${id}`).digest('hex');
}

export function deviceIdentity(request: NextRequest): DeviceIdentity {
  const existing = verifyDeviceToken(request.cookies.get(DEVICE_COOKIE)?.value);
  if (existing) return { id: existing, ownerHash: deviceOwnerHash(existing) };
  const cookieValue = createDeviceToken();
  const id = verifyDeviceToken(cookieValue);
  if (!id) throw new Error('Unable to create device identity');
  return { id, ownerHash: deviceOwnerHash(id), cookieValue };
}

export function verifyInvitePassword(candidate: string): boolean {
  return safeEqual(candidate, requiredEnv('PPT_INVITE_PASSWORD'));
}

export function createSessionToken(now = Date.now()): string {
  const expiresAt = String(now + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expiresAt, suppliedSignature, extra] = token.split('.');
  if (!expiresAt || !suppliedSignature || extra || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= now) return false;
  return safeEqual(suppliedSignature, signature(expiresAt));
}

export function isAuthenticated(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}
