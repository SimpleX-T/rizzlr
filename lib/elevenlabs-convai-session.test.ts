import { describe, expect, it, vi } from "vitest";

import {
  getPublicAgentSessionOptions,
  resolveConvaiConnectionType,
} from "./elevenlabs-convai-session";

describe("resolveConvaiConnectionType", () => {
  it("defaults to websocket", () => {
    expect(resolveConvaiConnectionType(undefined)).toBe("websocket");
    expect(resolveConvaiConnectionType("")).toBe("websocket");
    expect(resolveConvaiConnectionType("unknown")).toBe("websocket");
  });

  it("accepts webrtc", () => {
    expect(resolveConvaiConnectionType("webrtc")).toBe("webrtc");
    expect(resolveConvaiConnectionType("WEBRTC")).toBe("webrtc");
  });

  it("accepts websocket explicitly", () => {
    expect(resolveConvaiConnectionType("websocket")).toBe("websocket");
  });
});

describe("getPublicAgentSessionOptions", () => {
  it("uses explicit connectionType when provided", () => {
    expect(getPublicAgentSessionOptions("agent_x", "webrtc")).toEqual({
      agentId: "agent_x",
      connectionType: "webrtc",
    });
    expect(getPublicAgentSessionOptions("agent_x", "websocket")).toEqual({
      agentId: "agent_x",
      connectionType: "websocket",
    });
  });

  it("defaults connectionType from env when omitted", () => {
    vi.stubEnv("NEXT_PUBLIC_ELEVENLABS_CONNECTION_TYPE", "webrtc");
    expect(getPublicAgentSessionOptions("agent_y")).toEqual({
      agentId: "agent_y",
      connectionType: "webrtc",
    });
    vi.stubEnv("NEXT_PUBLIC_ELEVENLABS_CONNECTION_TYPE", "");
    expect(getPublicAgentSessionOptions("agent_z").connectionType).toBe(
      "websocket",
    );
    vi.unstubAllEnvs();
  });
});
