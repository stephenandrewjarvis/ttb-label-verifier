const FOOTER_BG = "#1a4480";
const LINK_COLOR = "#FFFFFF";
const LINK_HOVER_COLOR = "#F0F0F0";

interface FooterSection {
  title: string;
  links: Array<{ label: string; href: string }>;
}

export default function Footer() {
  return (
    <footer role="contentinfo" style={{ fontFamily: "'Public Sans', 'Source Sans Pro', system-ui, sans-serif" }}>
      <div style={{ backgroundColor: FOOTER_BG, padding: "24px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "24px",
            }}
          >
            {/* Left side - Utility links */}
            <nav aria-label="Footer links">
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "24px", flexWrap: "wrap" }}>
                <li>
                  <a
                    href="/about-ttb/accessibility"
                    style={{
                      color: LINK_COLOR,
                      fontSize: "15px",
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "color 0.15s ease",
                      lineHeight: 1.6,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = LINK_HOVER_COLOR;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = LINK_COLOR;
                    }}
                  >
                    Accessibility
                  </a>
                </li>
                <li>
                  <a
                    href="/about-ttb/privacy-policy"
                    style={{
                      color: LINK_COLOR,
                      fontSize: "15px",
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "color 0.15s ease",
                      lineHeight: 1.6,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = LINK_HOVER_COLOR;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = LINK_COLOR;
                    }}
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </nav>

            {/* Right side - Social/Newsletter links */}
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "center",
              }}
            >
              {[
                { label: "Newsletter", emoji: "📧", href: "/public-information/ttb-newsletter" },
                { label: "RSS", emoji: "📡", href: "/online-services/rss/rss-feeds-from-ttb" },
                { label: "Email Updates", emoji: "✉️", href: "/public-information/news/govdelivery" },
                { label: "Events", emoji: "📅", href: "/about-ttb/outreach/outreach-program" },
                { label: "System Maintenance", emoji: "🔧", href: "/about-ttb/calendar" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  style={{
                    color: "white",
                    fontSize: "20px",
                    textDecoration: "none",
                    transition: "opacity 0.15s ease",
                    opacity: 1,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                  }}
                >
                  {item.emoji}
                </a>
              ))}
            </div>
          </div>

          {/* Attribution */}
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            <p style={{ margin: 0, color: "#FFFFFF", fontSize: "14px", lineHeight: 1.6 }}>
              U.S. Department of the Treasury — Alcohol and Tobacco Tax and Trade Bureau
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
