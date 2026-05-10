"use client";

import type { PersonaCardCallState } from "@/lib/persona-call-state";
import { Persona } from "@/lib/game-store";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PersonaCardProps {
  persona: Persona;
  isUnlocked: boolean;
  isSelected: boolean;
  callState: PersonaCardCallState;
  onSelect: () => void;
  index: number;
}

const callStateLabel: Record<PersonaCardCallState, string | null> = {
  idle: null,
  connecting: "Calling…",
  connected: "On call",
  ended: "Ended",
};

export function PersonaCard({
  persona,
  isUnlocked,
  isSelected,
  callState,
  onSelect,
  index,
}: PersonaCardProps) {
  const genderLabel = persona.gender === "female" ? "F" : "M";
  const stateLabel = callStateLabel[callState];

  return (
    <button
      onClick={onSelect}
      disabled={!isUnlocked}
      className={cn(
        "relative w-full text-left transition-colors duration-200",
        "border-b border-[var(--border-soft)]",
        isUnlocked
          ? isSelected
            ? "bg-[color-mix(in_oklch,var(--accent)_9%,transparent)]"
            : "hover:bg-[color-mix(in_oklch,var(--surface)_62%,transparent)]"
          : "opacity-30 cursor-not-allowed",
      )}
      style={{
        paddingTop: isSelected ? "20px" : "16px",
        paddingBottom: isSelected ? "20px" : "16px",
      }}
    >
      {stateLabel && (
        <span
          className="absolute top-2 right-3 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{
            color:
              callState === "connected"
                ? "var(--chain)"
                : callState === "ended"
                  ? "var(--muted)"
                  : "var(--accent)",
            fontFamily: "var(--font-body)",
            background:
              callState === "connected"
                ? "color-mix(in oklch, var(--chain) 14%, transparent)"
                : "color-mix(in oklch, var(--surface-strong) 88%, transparent)",
            border: "1px solid var(--border-soft)",
          }}
        >
          {stateLabel}
        </span>
      )}

      {/* Primary row: index · name · age · gender */}
      <div className="flex items-center gap-4">
        <span
          className="tabular-nums shrink-0 w-6 text-right text-[11px]"
          style={{ color: "var(--faint)", fontFamily: "var(--font-display)" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <span
          className={cn(
            "shrink-0 rounded-full overflow-hidden transition-all duration-200",
            isSelected ? "w-14 h-14 ring-2" : "w-12 h-12",
            callState === "connecting" && "ring-2 animate-pulse",
          )}
          style={{
            background: "var(--surface-strong)",
            border: "1px solid var(--border)",
            boxShadow: isSelected
              ? "0 0 0 5px color-mix(in oklch, var(--accent) 12%, transparent)"
              : "none",
            ["--tw-ring-color" as string]: "var(--accent)",
          }}
        >
          <img
            src={persona.avatar}
            alt=""
            className="w-full h-full object-cover transition-all duration-200"
            style={{
              opacity: isSelected ? 1 : 0.62,
              filter: isSelected ? "none" : "grayscale(40%) saturate(75%)",
            }}
          />
        </span>

        <span className="flex-1 min-w-0">
          <span
            className="block min-w-0 truncate text-base"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              color: isSelected ? "var(--accent)" : "var(--text)",
            }}
          >
            {persona.name.toUpperCase()}
          </span>
          <span
            className="block text-xs mt-1"
            style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}
          >
            {persona.age} · {genderLabel}
          </span>
        </span>

        {!isUnlocked ? (
          <span
            className="shrink-0 flex items-center gap-1 text-[10px]"
            style={{
              color: "var(--faint)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.06em",
            }}
          >
            <Lock className="w-2.5 h-2.5" />
            {persona.unlockCost} SOL
          </span>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {isSelected && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex gap-3 mt-3 pl-[6.5rem]">
              <span
                className="text-xs leading-relaxed"
                style={{
                  color: "var(--muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {persona.occupation}
              </span>
              <span
                className="text-xs leading-relaxed"
                style={{
                  color: "var(--faint)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {persona.location}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
