# rizzlr

_Voice-first dating-game riff — rizz your way in._ Powered by **ElevenLabs ConvAI**, **Next.js**, **Solana** (wallet auth, optional SOL escrow for PvP challenges), and **Supabase** for profiles and sessions.

## Requirements

- **Node.js** 22.x LTS recommended and **pnpm**
- A **Supabase** project (Postgres + API keys)
- **ElevenLabs**: Conversational AI agent id(s) for personas; API key if you use server-side TTS routes
- Optional: **Solana CLI / Anchor** if you build or deploy the escrow program under `programs/rizzlr-escrow`

## Quick start

```bash
pnpm install
# add a .env.local (or .env) with the variables in the table below
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Apply SQL migrations to Supabase (Dashboard → SQL Editor, or CLI):

- `supabase/migrations/20260209120000_init.sql`
- `supabase/migrations/20260210140000_challenges.sql`

Order matters: run `init` before `challenges`.

## Environment variables

Create `.env.local` (or `.env`) — both are gitignored for secrets. Typical variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never expose to the browser |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | **Fallback only** — used when a persona has no dedicated agent. If every persona hits this, they all share one voice (e.g. Zara’s agent). |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ZARA`, `_COLE`, `_JADE`, `_MARCUS`, `_ISABELLE`, `_DIEGO`, `_AOIFE`, `_KENJI` | Optional **per-character** ConvAI public agent ids (from ElevenLabs). Set these so each persona uses its own agent (and voice). |
| `NEXT_PUBLIC_ELEVENLABS_CONNECTION_TYPE` | `websocket` (default) or `webrtc` |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_ZARA`, `_COLE`, `_JADE`, … `_KENJI` | Per-character **ElevenLabs voice ids** for **live** ConvAI when using one shared agent: passed as `overrides.tts.voiceId`. Enable voice override on that agent in the ElevenLabs dashboard. |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` | Optional **default** live voice id if a persona has no `NEXT_PUBLIC_ELEVENLABS_VOICE_<ID>`. |
| `NEXT_PUBLIC_EPILOGUE_VOICE_ID` | Fallback for **post-game** `/api/tts` only, if no persona/env voice above is set. |
| `ELEVENLABS_API_KEY` | Used by `/api/tts` if enabled |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana HTTP RPC (same cluster as your deployment) |
| `SOLANA_RPC_URL` | Optional server fallback when `NEXT_PUBLIC_*` is unset |
| `NEXT_PUBLIC_SOLANA_ESCROW_PROGRAM_ID` | Deployed Anchor program id (client + server) |
| `SOLANA_ESCROW_PROGRAM_ID` | Optional server-only override |
| `SOLANA_ESCROW_AUTHORITY_SECRET` | Base58 or JSON byte array; signs settle/refund server-side |
| `SOLANA_ESCROW_AUTHORITY_PUBKEY` | Optional if pubkey is derived from the secret |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (metadata / OG); defaults to localhost in dev |
| `NEXT_PUBLIC_WALLET_AUTO_CONNECT` | Set to `true` to restore last wallet on load |
| `NEXT_PUBLIC_ESCROW_WAGER_LAMPORTS` | Enables SOL escrow challenges from the UI when ≥ `10000` |
| `CRON_SECRET` | Protects `/api/cron/challenge-escrow` in production |

Solana Action (“Blink”) URLs use `/api/actions/challenge/[id]`. Browser invites use `/challenge/[id]`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |

## Anchor program (escrow)

The on-chain program lives in `programs/rizzlr-escrow`. After changing Rust sources or `declare_id!`, rebuild and deploy with your usual Solana/Anchor workflow (`anchor build`, `anchor deploy` or `solana program deploy`, etc.), then set `NEXT_PUBLIC_SOLANA_ESCROW_PROGRAM_ID` to the deployed address.

If simulation fails with **DeclaredProgramIdMismatch** / **Error Code: 4100**, the bytecode on-chain does not match `declare_id!` in `programs/rizzlr-escrow/src/lib.rs` (stale deploy or wrong program id in env). From `programs/rizzlr-escrow`, run `anchor keys sync` if your keypair and `declare_id!` drifted, then `anchor build` and `anchor deploy` (or `solana program deploy target/deploy/rizzlr_escrow.so --program-id target/deploy/rizzlr_escrow-keypair.json --url devnet`) so the live program matches the repo. Until then, omit `NEXT_PUBLIC_ESCROW_WAGER_LAMPORTS` (or set below `10000`) so challenges stay **free** and skip escrow.

## Security

- Never commit `.env`, `.env.local`, or keypair files.
- The escrow authority secret must stay on the server and in your host’s secret store in production.

## License

Private / all rights reserved unless the repository owners specify otherwise.
