import { ImageResponse } from "next/og";

export const alt = "FunilQuiz — construtor de funis interativos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#0b0c12",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ position: "absolute", width: 760, height: 760, borderRadius: 9999, background: "#6c4bf6", opacity: 0.2, top: -390, right: -130 }} />
        <div style={{ position: "absolute", width: 560, height: 560, borderRadius: 9999, background: "#38bdf8", opacity: 0.12, bottom: -350, right: 100 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "66px 72px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 32, fontWeight: 700 }}>
            <BrandMark />
            FunilQuiz
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 770 }}>
            <div style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: -3, fontWeight: 700 }}>Funis interativos que convertem.</div>
            <div style={{ marginTop: 26, fontSize: 29, lineHeight: 1.35, color: "#b8bfd1" }}>Crie experiências de venda dinâmicas, com ou sem ajuda da IA.</div>
          </div>
          <div style={{ color: "#8b91a6", fontSize: 23 }}>funilquiz.com</div>
        </div>
      </div>
    ),
    size,
  );
}

function BrandMark() {
  return (
    <div style={{ width: 54, height: 54, display: "flex", position: "relative" }}>
      <div style={{ position: "absolute", left: 3, top: 3, width: 28, height: 18, borderRadius: 7, background: "linear-gradient(135deg, #8b5cf6, #38bdf8)" }} />
      <div style={{ position: "absolute", right: 3, top: 15, width: 28, height: 18, borderRadius: 7, background: "linear-gradient(135deg, #8b5cf6, #38bdf8)", opacity: 0.84 }} />
      <div style={{ position: "absolute", left: 13, bottom: 2, width: 28, height: 20, borderRadius: 7, background: "linear-gradient(135deg, #8b5cf6, #38bdf8)" }} />
    </div>
  );
}
