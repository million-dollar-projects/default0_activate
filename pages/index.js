// pages/index.js — 简单的服务状态页

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0a0e17",
      fontFamily: "'Courier New', monospace", color: "#e2e8f0"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%", background: "#4ade80",
          boxShadow: "0 0 12px #4ade80", margin: "0 auto 1rem",
          animation: "pulse 2s infinite"
        }} />
        <h1 style={{ fontSize: "1.2rem", letterSpacing: "0.1em", margin: "0 0 0.5rem" }}>
          LICENSE SERVER
        </h1>
        <p style={{ color: "#475569", fontSize: "0.8rem", margin: 0 }}>
          POST /api/activate
        </p>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    </div>
  );
}
