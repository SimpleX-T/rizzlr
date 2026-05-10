import type { Persona } from "@/lib/game-store";

/** Resolves ConvAI public agent id: per-persona override, then Next public env. */
export function resolvePersonaAgentId(
  persona: Pick<Persona, "elevenLabsAgentId">,
): string | null {
  if (typeof process === "undefined") return null;
  const fromEnv = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  return persona.elevenLabsAgentId ?? fromEnv ?? null;
}

/**
 * Voice used for post-game TTS epilogue. Prefer per-persona `voiceId`, else
 * `NEXT_PUBLIC_EPILOGUE_VOICE_ID` (any ElevenLabs voice id from the dashboard).
 */
export function resolveEpilogueVoiceId(
  persona: Pick<Persona, "voiceId">,
): string | null {
  const fromPersona = persona.voiceId?.trim();
  if (fromPersona) return fromPersona;
  if (typeof process === "undefined") return null;
  const fromEnv = process.env.NEXT_PUBLIC_EPILOGUE_VOICE_ID?.trim();
  return fromEnv ?? null;
}
