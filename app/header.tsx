const BANNER_BG = "#FFFFFF";
const HEADER_BG = "#1a4480";
const NAV_BG = "#003e73";

export default function Header() {
  return (
    <header role="banner">

      {/* Official government banner */}
      <div style={{
        backgroundColor: BANNER_BG,
        borderBottom: "1px solid #e0e0e0",
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "5px 0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect width="16" height="11" fill="#B22234" />
            <rect y="0.846" width="16" height="0.923" fill="#f0f0f0" />
            <rect y="2.538" width="16" height="0.923" fill="#f0f0f0" />
            <rect y="4.231" width="16" height="0.923" fill="#f0f0f0" />
            <rect y="5.923" width="16" height="0.923" fill="#f0f0f0" />
            <rect y="7.615" width="16" height="0.923" fill="#f0f0f0" />
            <rect y="9.308" width="16" height="0.923" fill="#f0f0f0" />
            <rect width="7" height="5.5" fill="#3C3B6E" />
          </svg>
          <span style={{ color: "#1B1B1B", fontSize: "13px", fontWeight: 500 }}>
            An official website of the United States government
          </span>
        </div>
      </div>

      {/* TTB Logo and agency name bar */}
      <div style={{
        backgroundColor: HEADER_BG,
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "12px 0",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}>
          {/* TTB Logo — uses actual TTB seal from their site */}
          <img
            src="/ttb-logo.svg"
            alt="TTB Logo"
            style={{ height: "50px", width: "auto" }}
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <div style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "11px",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              marginBottom: "3px",
            }}>
              U.S. Department of the Treasury
            </div>
            <h1 style={{
              color: "white",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.2px",
              margin: 0,
            }}>
              Alcohol and Tobacco Tax and Trade Bureau
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <nav style={{
        backgroundColor: NAV_BG,
        borderBottom: "3px solid #d4a017",
        padding: "0 24px",
      }} aria-label="Main navigation">
        <div style={{
          maxWidth: "1080px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
        }}>
          {[
            { label: "Home", active: false },
            { label: "COLAs Online", active: true },
            { label: "Permits Online", active: false },
            { label: "Formulas Online", active: false },
            { label: "myTTB", active: false },
          ].map(({ label, active }) => (
            <button
              key={label}
              aria-current={active ? "page" : undefined}
              style={{
                display: "inline-block",
                color: active ? "#d4a017" : "rgba(255,255,255,0.85)",
                fontSize: "13px",
                fontWeight: active ? 700 : 400,
                padding: "10px 16px",
                borderBottom: active ? "3px solid #d4a017" : "3px solid transparent",
                marginBottom: "-3px",
                background: "none",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "'Source Sans Pro', 'Public Sans', system-ui, sans-serif",
              }}
            >
              {label}
            </button>
))}
        </div>
      </nav>

    </header>
  );
}
