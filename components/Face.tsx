import { getMember } from "@/lib/team";

/** The 8-bit face for a team member. Drawn 16×16 and scaled with crisp edges. */
export function Face({ initials, size = 24 }: { initials: string; size?: number }) {
  const m = getMember(initials);
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className="pixel-img"
      src={m?.avatar ?? "/avatars/a.svg"}
      alt={m ? m.name : `Author ${initials}`}
      width={size}
      height={size}
    />
  );
}

export function Byline({ initials, prefix = "by", center = false }: { initials: string; prefix?: string; center?: boolean }) {
  const m = getMember(initials);
  return (
    <span className={`byline${center ? " center" : ""}`} style={{ margin: 0, padding: 0 }}>
      <Face initials={initials} size={20} />
      <span>
        {prefix} {m?.name ?? initials}
      </span>
    </span>
  );
}
