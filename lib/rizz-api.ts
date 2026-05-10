"use client";

import type { Message } from "@/lib/game-store";
import {
  buildChallengeCreateMessage,
  buildChallengeSubmitMessage,
  buildProfileAuthMessage,
  buildSessionSaveMessage,
  buildSessionsListMessage,
} from "@/lib/auth-messages";
import { stableStringify } from "@/lib/stable-json";
import { signUtf8, utf8StringToBase64 } from "@/lib/wallet-sign";

export type UserProfile = {
  wallet: string;
  displayName: string;
  avatarUrl: string;
};

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchProfile(
  wallet: string,
): Promise<UserProfile | null> {
  const res = await fetch(`/api/profile?wallet=${encodeURIComponent(wallet)}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function saveProfile(opts: {
  wallet: string;
  displayName: string;
  nonce: string;
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
}): Promise<UserProfile> {
  const isDevTrust =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  let signature = "";
  if (opts.signMessage) {
    const msg = buildProfileAuthMessage(
      opts.wallet,
      opts.displayName,
      opts.nonce,
    );
    signature = await signUtf8(opts.signMessage, msg);
  }

  const res = await fetch("/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isDevTrust ? { "x-wallet-address": opts.wallet } : {}),
    },
    body: JSON.stringify({
      wallet: opts.wallet,
      displayName: opts.displayName,
      nonce: opts.nonce,
      signature,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Profile save failed",
    );
  }

  return res.json();
}

export async function fetchNonce(
  wallet: string,
): Promise<{ nonce: string; expiresAt: string }> {
  const res = await fetch(
    `/api/auth/nonce?wallet=${encodeURIComponent(wallet)}`,
  );
  if (!res.ok) throw new Error("Nonce request failed");
  return res.json();
}

export async function persistGameSession(opts: {
  wallet: string;
  personaId: string;
  won: boolean;
  score: number;
  exitLine?: string;
  messages: Message[];
  startedAt: number;
  endedAt: number;
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
}): Promise<{ ok: boolean; sessionId?: string }> {
  const isDevTrust =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  if (!isDevTrust && !opts.signMessage) {
    return { ok: false };
  }

  const ts = Date.now();
  const innerPart = {
    wallet: opts.wallet,
    timestamp: ts,
    personaId: opts.personaId,
    won: opts.won,
    score: opts.score,
    exitLine: opts.exitLine ?? null,
    messages: opts.messages,
    startedAt: opts.startedAt,
    endedAt: opts.endedAt,
  };

  const hashHex = await sha256Hex(stableStringify(innerPart));
  const authMsg = buildSessionSaveMessage(opts.wallet, ts, hashHex);

  let signature = "";
  if (opts.signMessage) {
    signature = await signUtf8(opts.signMessage, authMsg);
  }

  const wire = { ...innerPart, signature };

  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isDevTrust ? { "x-wallet-address": opts.wallet } : {}),
    },
    body: JSON.stringify(wire),
  });

  if (!res.ok) return { ok: false };
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return {
    ok: true,
    sessionId: typeof data.id === "string" ? data.id : undefined,
  };
}

export type SessionListItem = {
  id: string;
  personaId: string;
  won: boolean;
  score: number;
  exitLine: string | null;
  messages: Message[];
  startedAt: string;
  endedAt: string;
};

export async function fetchSessionHistory(
  wallet: string,
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>,
): Promise<SessionListItem[]> {
  const isDevTrust =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  const ts = Date.now();
  const msg = buildSessionsListMessage(wallet, ts);

  const headers: Record<string, string> = {};
  if (isDevTrust) {
    headers["x-wallet-address"] = wallet;
  } else if (signMessage) {
    headers["x-wallet-address"] = wallet;
    headers["x-auth-message-b64"] = utf8StringToBase64(msg);
    headers["x-auth-signature"] = await signUtf8(signMessage, msg);
  } else {
    return [];
  }

  const res = await fetch(
    `/api/sessions?wallet=${encodeURIComponent(wallet)}`,
    { headers },
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.sessions ?? [];
}

export type RoastFeedItem = {
  id: string;
  personaId: string;
  personaName: string;
  personaAvatar?: string;
  exitLine: string;
  likeCount: number;
  createdAt: string;
  liked: boolean;
  playerDisplayName: string | null;
  playerAvatarUrl: string | null;
  playerWalletShort: string | null;
};

export async function fetchRoastsFeed(opts: {
  sort: "top" | "recent";
  wallet?: string | null;
}): Promise<RoastFeedItem[]> {
  const wallet = opts.wallet?.trim() ?? "";

  const url = new URL("/api/roasts", window.location.origin);
  url.searchParams.set("sort", opts.sort);
  if (wallet) url.searchParams.set("wallet", wallet);

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.roasts ?? [];
}

export async function likeRoast(opts: {
  roastId: string;
  wallet: string;
}): Promise<boolean> {
  const isDevTrust =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  const res = await fetch(
    `/api/roasts/${encodeURIComponent(opts.roastId)}/like`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isDevTrust ? { "x-wallet-address": opts.wallet } : {}),
      },
      body: JSON.stringify({
        wallet: opts.wallet,
      }),
    },
  );

  return res.ok;
}

function randomHexSeed(byteLength = 32): string {
  const u = new Uint8Array(byteLength);
  crypto.getRandomValues(u);
  return Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type ChallengeCreatedResponse = {
  challengeId: string;
  blinkUrl: string;
  appUrl: string;
  creatorDepositTransaction?: string;
  error?: string;
};

export async function createChallenge(opts: {
  wallet: string;
  personaId: string;
  creatorScore: number;
  timeLimitSeconds: number;
  sourceGameSessionId?: string | null;
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
  wagerType?: "free" | "sol_escrow";
  wagerLamports?: number;
}): Promise<ChallengeCreatedResponse> {
  const isDevTrust =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  if (!isDevTrust && !opts.signMessage) {
    throw new Error("Wallet must sign challenge creation");
  }

  const challengeId = crypto.randomUUID();
  const sessionSeed = randomHexSeed();
  const ts = Date.now();
  const wagerType = opts.wagerType === "sol_escrow" ? "sol_escrow" : "free";
  const wagerLamports =
    wagerType === "sol_escrow"
      ? Math.max(0, Math.floor(opts.wagerLamports ?? 0))
      : 0;

  const msg = buildChallengeCreateMessage({
    challengeId,
    wallet: opts.wallet,
    personaId: opts.personaId,
    sessionSeed,
    timeLimitSeconds: opts.timeLimitSeconds,
    creatorScore: Math.round(opts.creatorScore),
    wagerType,
    wagerLamports,
    timestampMs: ts,
  });

  let signature = "";
  if (opts.signMessage) {
    signature = await signUtf8(opts.signMessage, msg);
  }

  const res = await fetch("/api/challenges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isDevTrust ? { "x-wallet-address": opts.wallet } : {}),
    },
    body: JSON.stringify({
      challengeId,
      wallet: opts.wallet,
      timestamp: ts,
      signature,
      personaId: opts.personaId,
      sessionSeed,
      timeLimitSeconds: opts.timeLimitSeconds,
      creatorScore: Math.round(opts.creatorScore),
      wagerType,
      wagerLamports,
      sourceGameSessionId: opts.sourceGameSessionId ?? undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Challenge create failed",
    );
  }

  return res.json();
}

export async function submitChallengeResult(opts: {
  challengeId: string;
  wallet: string;
  challengerScore: number;
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
}): Promise<{
  winner: string;
  result: string;
  tie: boolean;
  creatorScore: number;
  challengerScore: number;
  shareCard: {
    headline: string;
    creatorScore: number;
    challengerScore: number;
    winnerWallet: string;
    tie: boolean;
  };
}> {
  const isDevTrust =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  if (!isDevTrust && !opts.signMessage) {
    throw new Error("Wallet must sign challenge submission");
  }

  const ts = Date.now();
  const msg = buildChallengeSubmitMessage(
    opts.challengeId,
    opts.wallet,
    opts.challengerScore,
    ts,
  );

  let signature = "";
  if (opts.signMessage) {
    signature = await signUtf8(opts.signMessage, msg);
  }

  const res = await fetch(
    `/api/challenges/${encodeURIComponent(opts.challengeId)}/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isDevTrust ? { "x-wallet-address": opts.wallet } : {}),
      },
      body: JSON.stringify({
        wallet: opts.wallet,
        timestamp: ts,
        signature,
        challengerScore: Math.round(opts.challengerScore),
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Submit failed",
    );
  }

  return res.json();
}
