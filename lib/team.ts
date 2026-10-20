import { cache } from "react";
import { team } from "./data";
import type { TeamMember } from "./schemas";

export const getTeam = cache((): TeamMember[] => team());

export const getMember = (initials: string): TeamMember | undefined =>
  getTeam().find((m) => m.initials === initials);

export const displayTicker = (t: string): string => (t.length > 8 ? `${t.slice(0, 3)} put` : t);
