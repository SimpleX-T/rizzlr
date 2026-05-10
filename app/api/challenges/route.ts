import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

import { escrowPdaForChallengeUuid } from "@/lib/escrow/codec";
import {
  getEscrowAuthorityPubkey,
  getEscrowProgramId,
  isEscrowConfigured,
} from "@/lib/escrow/config";
import {
  buildUnsignedVersionedTx,
  initializeEscrowIx,
} from "@/lib/escrow/instructions";
import { isValidPersonaId } from "@/lib/persona-guard";
import { verifyChallengeCreateRequest } from "@/lib/server-wallet-request";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_WAGER_LAMPORTS = 10_000;

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  let body: {
    challengeId?: string;
    wallet?: string;
    timestamp?: number;
    signature?: string;
    personaId?: string;
    sessionSeed?: string;
    timeLimitSeconds?: number;
    creatorScore?: number;
    wagerType?: string;
    wagerLamports?: number;
    sourceGameSessionId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const challengeId = body.challengeId?.trim();
  const wallet = body.wallet?.trim();
  if (!challengeId || !wallet || body.timestamp === undefined) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!UUID_RE.test(challengeId)) {
    return NextResponse.json(
      { error: "challengeId must be a UUID" },
      { status: 400 },
    );
  }

  const personaId = body.personaId?.trim();
  const sessionSeed = body.sessionSeed?.trim();
  const tls = body.timeLimitSeconds;
  const creatorScore = body.creatorScore;

  if (
    !personaId ||
    !sessionSeed ||
    typeof tls !== "number" ||
    typeof creatorScore !== "number"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!isValidPersonaId(personaId)) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 400 });
  }

  if (!/^[0-9a-fA-F]{32,}$/.test(sessionSeed)) {
    return NextResponse.json(
      { error: "sessionSeed must be hex string (min 32 chars)" },
      { status: 400 },
    );
  }

  const wagerType = body.wagerType === "sol_escrow" ? "sol_escrow" : "free";
  const wagerLamports = Math.max(
    0,
    Math.floor(Number(body.wagerLamports ?? 0)),
  );

  if (wagerType === "sol_escrow") {
    if (!isEscrowConfigured()) {
      return NextResponse.json(
        {
          error:
            "SOL escrow requires NEXT_PUBLIC_SOLANA_ESCROW_PROGRAM_ID (or SOLANA_ESCROW_PROGRAM_ID) and SOLANA_ESCROW_AUTHORITY_SECRET / SOLANA_ESCROW_AUTHORITY_PUBKEY",
        },
        { status: 503 },
      );
    }
    if (wagerLamports < MIN_WAGER_LAMPORTS) {
      return NextResponse.json(
        {
          error: `wagerLamports must be at least ${MIN_WAGER_LAMPORTS} lamports per side`,
        },
        { status: 400 },
      );
    }
  }

  const verified = verifyChallengeCreateRequest(request, {
    challengeId,
    wallet,
    timestamp: body.timestamp,
    signature: body.signature,
    personaId,
    sessionSeed,
    timeLimitSeconds: tls,
    creatorScore,
    wagerType: body.wagerType ?? "free",
    wagerLamports: Number(wagerLamports),
  });
  if (verified instanceof Response) return verified;

  const score = Math.round(creatorScore);
  if (score < 0 || score > 100) {
    return NextResponse.json(
      { error: "creatorScore must be 0–100" },
      { status: 400 },
    );
  }

  const timeLimitSeconds = Math.round(tls);
  if (timeLimitSeconds < 30 || timeLimitSeconds > 600) {
    return NextResponse.json(
      { error: "timeLimitSeconds must be between 30 and 600" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", verified.wallet)
    .maybeSingle();

  if (!userRow) {
    return NextResponse.json(
      { error: "Create a profile before issuing challenges" },
      { status: 400 },
    );
  }

  let sourceGameSessionId: string | null = null;
  if (body.sourceGameSessionId && UUID_RE.test(body.sourceGameSessionId)) {
    const { data: sess } = await supabase
      .from("game_sessions")
      .select("id")
      .eq("id", body.sourceGameSessionId)
      .eq("user_id", userRow.id)
      .maybeSingle();
    if (sess?.id) sourceGameSessionId = sess.id;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const escrowPdaStr =
    wagerType === "sol_escrow"
      ? escrowPdaForChallengeUuid(challengeId).toBase58()
      : null;

  const { error: insertErr } = await supabase.from("challenges").insert({
    id: challengeId,
    creator_wallet: verified.wallet,
    persona_id: personaId,
    session_seed: sessionSeed,
    time_limit_seconds: timeLimitSeconds,
    creator_score: score,
    wager_type: wagerType,
    wager_lamports: wagerType === "sol_escrow" ? Number(wagerLamports) : 0,
    status: "open",
    expires_at: expiresAt.toISOString(),
    source_game_session_id: sourceGameSessionId,
    escrow_pda: escrowPdaStr,
    escrow_state: wagerType === "sol_escrow" ? "pending_creator" : null,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: "Challenge id already exists" },
        { status: 409 },
      );
    }
    console.error("[challenges POST]", insertErr);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const base = {
    challengeId,
    blinkUrl: `${origin}/api/actions/challenge/${challengeId}`,
    appUrl: `${origin}/?challenge=${challengeId}`,
  };

  if (wagerType !== "sol_escrow") {
    return NextResponse.json(base);
  }

  const authority = getEscrowAuthorityPubkey();
  if (!authority) {
    return NextResponse.json(base);
  }

  try {
    const rpc =
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      process.env.SOLANA_RPC_URL ??
      clusterApiUrl("devnet");
    const conn = new Connection(rpc, "confirmed");
    const programId = getEscrowProgramId();
    const expiresTs = BigInt(Math.floor(expiresAt.getTime() / 1000));
    const ix = initializeEscrowIx({
      creator: new PublicKey(verified.wallet),
      challengeIdUuid: challengeId,
      wagerPerSideLamports: BigInt(wagerLamports),
      expiresTs,
      authority,
      programId,
    });
    const vtx = await buildUnsignedVersionedTx({
      connection: conn,
      feePayer: new PublicKey(verified.wallet),
      instructions: [ix],
    });
    const creatorDepositTransaction = Buffer.from(vtx.serialize()).toString(
      "base64",
    );
    return NextResponse.json({
      ...base,
      creatorDepositTransaction,
    });
  } catch (e) {
    console.error("[challenges POST] escrow tx build", e);
    return NextResponse.json({
      ...base,
      error:
        "Challenge saved but creator deposit transaction could not be built — check RPC and program id.",
    });
  }
}
