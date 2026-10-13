const usd = (min: number, max: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: min, maximumFractionDigits: max });

export const money = (n: number, dp = 2): string => usd(dp, dp).format(n);

export const signedMoney = (n: number, dp = 2): string =>
  `${n < 0 ? "−" : "+"}${usd(dp, dp).format(Math.abs(n))}`;

export const pct = (n: number, dp = 1): string => `${(n * 100).toFixed(dp)}%`;

export const signedPct = (n: number, dp = 1): string =>
  `${n < 0 ? "−" : "+"}${(Math.abs(n) * 100).toFixed(dp)}%`;

export const signedNum = (n: number, dp = 2, suffix = ""): string =>
  `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(dp)}${suffix}`;

export const tone = (n: number): "gain" | "loss" | "flat" => (n > 0.00005 ? "gain" : n < -0.00005 ? "loss" : "flat");

export const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
