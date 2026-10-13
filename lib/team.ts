import { cache } from "react";
import { researchDocs, team } from "./data";
import type { TeamMember } from "./schemas";

export const getTeam = cache((): TeamMember[] => team());

export const getMember = (initials: string): TeamMember | undefined =>
  getTeam().find((m) => m.initials === initials);

/** Tickers each person has written (published or in progress). */
export const coverage = cache((): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const d of researchDocs()) (out[d.front.author] ??= []).push(d.front.ticker);
  return out;
});

export const displayTicker = (t: string): string => (t.length > 8 ? `${t.slice(0, 3)} put` : t);
