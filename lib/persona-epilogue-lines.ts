/** Per-persona pools for post-game recap (same copy used for TTS + result UI). */

export type PersonaEpiloguePools = { win: string[]; lose: string[] }

export const PERSONA_EPILOGUE_POOLS: Record<string, PersonaEpiloguePools> = {
  zara: {
    win: [
      `Alright — you actually earned that. I'm annoyed in a good way.`,
      `Okay. You showed up with substance. That's rare on these calls.`,
      `Fine. I'll admit it — that was smooth enough to remember.`,
      `You survived my boredom threshold. That's basically a compliment.`,
    ],
    lose: [
      `Yeah… that wasn't it. Cute effort though.`,
      `I'm gonna pretend half of that didn't happen.`,
      `Love the confidence. The execution needs a whole sequel.`,
      `That was giving placeholder energy. Try again when you've got bars.`,
    ],
  },
  cole: {
    win: [
      `Huh. That was… actually solid. Don't let it go to your head.`,
      `Okay. You passed the vibe check. Barely emotional about it.`,
      `I'll remember that one. Quiet competence wins.`,
      `Not bad. Almost made me drop the deadpan. Almost.`,
    ],
    lose: [
      `That was rough in a statistical sense.`,
      `I'm filing this under "thanks for playing."`,
      `Cool story — wrong tempo. Come back tuned.`,
      `You brought wifi lag energy to a conversation that needed fiber.`,
    ],
  },
  jade: {
    win: [
      `Period — you ate that up. I'm smiling for real.`,
      `Okay bestie, that was actually charming. Approved.`,
      `You gave authentic and it showed. Periodt.`,
      `WIN. That's the energy I wanted from jump.`,
    ],
    lose: [
      `That was giving rehearsed. And not in a cute way.`,
      `Bestie… no. Read the room next time.`,
      `I'm screenshotting this vibe as a warning label.`,
      `We love confidence — but that was cosplay.`,
    ],
  },
  marcus: {
    win: [
      `Acceptable. Measured. You understood the assignment.`,
      `Rare — someone who didn't waste my minutes.`,
      `I'll note it: disciplined delivery. Keep that standard.`,
      `That met the bar. Continue operating at this level.`,
    ],
    lose: [
      `Below threshold. We'll leave it there.`,
      `That wasn't investment-grade conversation.`,
      `You hedged your personality and lost the spread.`,
      `I'm closing this position on courtesy.`,
    ],
  },
  isabelle: {
    win: [
      `Bon — you constructed an argument I couldn't dismiss.`,
      `Très bien. Wit with structure. Unusual.`,
      `I'll concede the round. Your logic had charm.`,
      `That was precise. I appreciate precision.`,
    ],
    lose: [
      `Non. That proof did not converge.`,
      `Charming noise is still noise.`,
      `You improvised where you should have derived.`,
      `Return when you've done the homework.`,
    ],
  },
  diego: {
    win: [
      `Isso aí! Cara, you brought the sauce — respect.`,
      `Okay okay — that was fun for real. You're in.`,
      `You showed heart and timing. Rare combo, cara.`,
      `Winner energy. The vibes cleared.`,
    ],
    lose: [
      `Cara… that was giving rug-pull vibes.`,
      `Ai… let's reboot that personality wallet.`,
      `Love you but that round needed more TVL — talk value locked.`,
      `You moonshot the awkward instead of the charm.`,
    ],
  },
  aoife: {
    win: [
      `Ah stop — that was genuinely lovely. Fair play.`,
      `Grand — you've a tongue on ya when you use it right.`,
      `That's the Craic I came for. Nicely done.`,
      `You danced around me nonsense and still landed. Skill.`,
    ],
    lose: [
      `Jaysus… that was painful in the funny way.`,
      `D'ya know what I mean? …No? Exactly.`,
      `That's grand if we're aiming for awkward folk art.`,
      `I've heard warmer voicemails from my bank.`,
    ],
  },
  kenji: {
    win: [
      `…Understood. That was excellent. Quietly so.`,
      `May I say — that was very well judged.`,
      `You listened. That alone puts you ahead.`,
      `Acceptable outcome. I mean that as praise.`,
    ],
    lose: [
      `May I ask — was that intentional?`,
      `That silence wasn't poetic; it was empty.`,
      `I waited for substance. It didn't arrive.`,
      `Let's reset expectations before we reset the call.`,
    ],
  },
}
