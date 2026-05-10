export type ConvaiConnectionType = "websocket" | "webrtc";

/**
 * Reads NEXT_PUBLIC_ELEVENLABS_CONNECTION_TYPE (build-time in Next.js client bundles).
 * Invalid or missing values default to `websocket` to avoid LiveKit ICE issues on localhost / restrictive networks.
 */
export function resolveConvaiConnectionType(
  raw?: string | null,
): ConvaiConnectionType {
  const v = raw?.trim().toLowerCase();
  if (v === "webrtc") return "webrtc";
  return "websocket";
}

export type PublicAgentSessionOptions = {
  agentId: string;
  connectionType: ConvaiConnectionType;
};

/**
 * Session options for public ConvAI agents. Use with `startSession(...)`.
 * When `connectionType` is omitted, uses `resolveConvaiConnectionType(process.env.NEXT_PUBLIC_ELEVENLABS_CONNECTION_TYPE)`.
 */
export function getPublicAgentSessionOptions(
  agentId: string,
  connectionType?: ConvaiConnectionType,
): PublicAgentSessionOptions {
  const ct =
    connectionType ??
    resolveConvaiConnectionType(
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_ELEVENLABS_CONNECTION_TYPE
        : undefined,
    );
  return { agentId, connectionType: ct };
}

/** Ensures mic permission before voice transport; avoids confusing ICE failures with permission denial. */
export async function ensureMicrophonePermission(): Promise<void> {
  await navigator.mediaDevices.getUserMedia({ audio: true });
}
