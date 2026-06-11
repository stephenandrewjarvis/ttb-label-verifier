const FEDERAL_BLUE = "#005EA2";

export default function Title() {
  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      borderBottom: `3px solid ${FEDERAL_BLUE}`,
      padding: "0 24px",
    }}>
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "16px 0" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1B1B1B", margin: "0 0 4px" }}>
          TTB Label Verification System
        </h1>
        <p style={{ fontSize: "13px", color: "#565C65", margin: 0 }}>
          AI-powered compliance verification for beverage alcohol labels
        </p>
      </div>
    </div>
  );
}
