import { Face } from "./Face";
import type { TeamMember } from "@/lib/schemas";

export function Analysts({ team }: { team: TeamMember[] }) {
  return (
    <div className="analysts">
      {team.map((p) => (
        <article className="analyst" key={p.initials}>
          <span className="analyst-face">
            <Face initials={p.initials} size={64} />
          </span>
          <h3>{p.name}</h3>
          <p className="analyst-bio">{p.bio}</p>
          {p.focuses.length > 0 && (
            <ul className="analyst-focuses" aria-label="Focuses">
              {p.focuses.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
