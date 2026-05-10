import type { Persona } from "@/lib/game-store";

/**
 * Per-persona ConvAI agent ids from env (static keys so Next.js inlines them).
 * Voice/accent in calls follows each **ElevenLabs agent** — one shared
 * `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` makes every character sound like that agent (e.g. Zara).
 */
function agentIdFromEnvForPersonaId(personaId: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const id = personaId.trim().toLowerCase();
  const map: Record<string, string | undefined> = {
    zara: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ZARA,
    cole: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_COLE,
    jade: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_JADE,
    marcus: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_MARCUS,
    isabelle: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ISABELLE,
    diego: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_DIEGO,
    aoife: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_AOIFE,
    kenji: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_KENJI,
  };
  return map[id]?.trim();
}

/** Resolves ConvAI public agent id: persona field → per-id env → global fallback env. */
export function resolvePersonaAgentId(
  persona: Pick<Persona, "elevenLabsAgentId"> & { id?: Persona["id"] },
): string | null {
  if (typeof process === "undefined") return null;
  const fromPersona = persona.elevenLabsAgentId?.trim();
  if (fromPersona) return fromPersona;
  const fromKeyedEnv = agentIdFromEnvForPersonaId(persona.id ?? "");
  if (fromKeyedEnv) return fromKeyedEnv;
  const fallback = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim();
  return fallback ?? null;
}

/** Per-character ElevenLabs voice ids for ConvAI TTS override (static env keys). */
function voiceIdFromEnvForPersonaId(personaId: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const id = personaId.trim().toLowerCase();
  const map: Record<string, string | undefined> = {
    zara: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ZARA,
    cole: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_COLE,
    jade: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_JADE,
    marcus: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_MARCUS,
    isabelle: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ISABELLE,
    diego: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_DIEGO,
    aoife: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_AOIFE,
    kenji: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_KENJI,
  };
  return map[id]?.trim();
}

/**
 * Voice id for **live** ConvAI (`overrides.tts.voiceId`): same agent, different voices.
 * Enable TTS voice override on the agent in the ElevenLabs dashboard (security / overrides).
 *
 * Order: `persona.voiceId` → `NEXT_PUBLIC_ELEVENLABS_VOICE_<ID>` → `NEXT_PUBLIC_ELEVENLABS_VOICE_ID`.
 */
export function resolvePersonaLiveVoiceId(
  persona: Pick<Persona, "voiceId"> & { id?: Persona["id"] },
): string | null {
  if (typeof process === "undefined") return null;
  const fromPersona = persona.voiceId?.trim();
  if (fromPersona) return fromPersona;
  const fromKeyedEnv = voiceIdFromEnvForPersonaId(persona.id ?? "");
  if (fromKeyedEnv) return fromKeyedEnv;
  const global = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID?.trim();
  return global ?? null;
}

/**
 * Post-game `/api/tts` epilogue: same resolution as live voice, then
 * `NEXT_PUBLIC_EPILOGUE_VOICE_ID` if nothing else is set.
 */
export function resolveEpilogueVoiceId(
  persona: Pick<Persona, "id" | "voiceId"> & { id?: Persona["id"] },
): string | null {
  const fromLive = resolvePersonaLiveVoiceId(persona);
  if (fromLive) return fromLive;
  if (typeof process === "undefined") return null;
  return process.env.NEXT_PUBLIC_EPILOGUE_VOICE_ID?.trim() ?? null;
}
