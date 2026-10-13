import { cache } from "react";
import { instruments } from "../data";
import { generateDummyBook, DUMMY_START } from "./dummy";
import { SupabasePriceStore } from "./supabase";
import type { PriceBook } from "./types";

export type { PriceBook } from "./types";

export const usingDummyPrices = (): boolean =>
  !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** One price book per request. Dummy data until the Supabase env vars are set. */
export const getPriceBook = cache(async (): Promise<PriceBook> => {
  if (usingDummyPrices()) return generateDummyBook(instruments());
  return new SupabasePriceStore().load(DUMMY_START);
});
