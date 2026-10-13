export function Footer() {
  return (
    <footer className="footer">
      The WDP Fund is a student learning exercise, not investment advice.
    </footer>
  );
}

export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      Demo mode: prices, trades and analysis are dummy data. Set the Supabase environment variables to switch to the daily feed.
    </div>
  );
}
