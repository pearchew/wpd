import { cache } from "react";
import { team } from "./data";
import type { TeamMember } from "./schemas";

export const getTeam = cache((): TeamMember[] => team());

export const getMember = (initials: string): TeamMember | undefined =>
  getTeam().find((m) => m.initials === initials);

/** Options (SPY261218P640) shorten to "SPY put"; every other ticker, 042660.KS included, shows as is. */
export const displayTicker = (t: string): string => {
  const o = /^([A-Z]+)\d{6}([CP])\d/.exec(t);
  return o ? `${o[1]} ${o[2] === "P" ? "put" : "call"}` : t;
};
