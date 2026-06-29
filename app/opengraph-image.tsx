import { ImageResponse } from "next/og";

export const alt = "GitGraph Painter contribution graph canvas";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

const colors = ["#EBE6D6", "#CBD8C0", "#9DBB94", "#5F8A66", "#2D5A3D"];

export default function Image() {
  const cells = Array.from({ length: 7 * 32 }, (_, index) => {
    const row = index % 7;
    const col = Math.floor(index / 7);
    const level = (row + col * 2) % 5;
    return colors[level];
  });

  return new ImageResponse(
    (
      <div
        style={{
          background: "#FAF7F0",
          color: "#353530",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Georgia",
          height: "100%",
          justifyContent: "space-between",
          padding: 72,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#2D5A3D", fontFamily: "monospace", fontSize: 24, fontWeight: 700 }}>
            Atelier x terminal
          </div>
          <div style={{ fontSize: 72, letterSpacing: -3, lineHeight: 0.95, marginTop: 24, maxWidth: 820 }}>
            Paint your GitHub contribution graph.
          </div>
          <div style={{ color: "#6B675E", fontFamily: "sans-serif", fontSize: 28, lineHeight: 1.35, marginTop: 28, maxWidth: 760 }}>
            Design the pattern, preview the commits, and download a safe local script. No OAuth. No backend.
          </div>
        </div>
        <div
          style={{
            background: "#F4F0E6",
            border: "1px solid #A8A59C",
            borderRadius: 28,
            display: "flex",
            padding: 28,
            width: 720,
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            {Array.from({ length: 32 }, (_, col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: 7 }, (_, row) => {
                  const color = cells[col * 7 + row];
                  return (
                    <div
                      key={`${col}-${row}`}
                      style={{
                        background: color,
                        borderRadius: 4,
                        height: 18,
                        width: 18,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
