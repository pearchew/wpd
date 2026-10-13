const draw = (rows: string[], size: number, label: string) => (
  <svg
    role="img"
    aria-label={label}
    viewBox={`0 0 ${rows[0].length} ${rows.length}`}
    width={(rows[0].length / rows.length) * size}
    height={size}
    shapeRendering="crispEdges"
    fill="currentColor"
    style={{ display: "block" }}
  >
    <title>{label}</title>
    {rows.flatMap((r, y) =>
      [...r].map((c, x) => (c === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)),
    )}
  </svg>
);

const CROWN = ["X...X...X", "XX.XXX.XX", "XXXXXXXXX", "XXXXXXXXX", "XXXXXXXXX"];
const SKULL = [".XXXXXX.", "XXXXXXXX", "X..XX..X", "X..XX..X", "XXXXXXXX", ".XXXXXX.", ".X.XX.X.", ".XXXXXX."];

export const Crown = ({ size = 14 }: { size?: number }) => (
  <span style={{ color: "#d9a520" }}>{draw(CROWN, size, "Best performer")}</span>
);
export const Skull = ({ size = 16 }: { size?: number }) => (
  <span style={{ color: "var(--loss)" }}>{draw(SKULL, size, "Worst performer")}</span>
);
