/**
 * Appended to every persona `systemPrompt` in code and mirrored in ElevenLabs dashboards.
 * Keeps agents concise and avoids reading UI/tool signals aloud.
 */
export const PERSONA_PROMPT_BREVITY_SUFFIX = `
Speak with a slightly quicker pace. Keep responses concise. Use short sentences. Avoid long pauses unless emphasis is needed.
Stay concise: aim for about 1-2 short sentences per reply unless the moment truly needs one more line—avoid rambling.
Never say numeric scores, percentages, points, or "rizz meter" aloud. Those update only via client tools (e.g. \`set_rizz_score\`, \`end_game\`)—reflect shifts only through in-character reactions (warmer, colder, laughs, dismissal).
`;
