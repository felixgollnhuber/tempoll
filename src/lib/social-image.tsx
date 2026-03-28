import { ImageResponse } from "next/og";

const sampleCounts = [
  [1, 2, 2, 1],
  [2, 4, 5, 2],
  [3, 5, 6, 4],
  [1, 3, 4, 3],
  [0, 2, 3, 2],
];

const cellColors = [
  "#f5ede0",
  "#e0f1f1",
  "#cbeeee",
  "#a9e9e4",
  "#72ddd6",
  "#28bfb7",
  "#0e8690",
];

export const socialImageAlt =
  "tempoll share card highlighting free scheduling, no accounts, and live availability heatmaps.";

export const socialImageSize = {
  width: 1200,
  height: 630,
} as const;

export const socialImageContentType = "image/png";

export function renderSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(14, 134, 144, 0.18), transparent 34%), linear-gradient(135deg, #fcf8f1 0%, #f5efe3 48%, #e6f6f4 100%)",
          color: "#153040",
          fontFamily:
            "Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -40,
            width: 320,
            height: 320,
            borderRadius: 9999,
            background: "rgba(14, 134, 144, 0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -90,
            bottom: -110,
            width: 360,
            height: 360,
            borderRadius: 9999,
            background: "rgba(26, 188, 156, 0.12)",
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            padding: "52px 58px",
            gap: 42,
          }}
        >
          <div
            style={{
              width: "63%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  borderRadius: 9999,
                  background: "#163848",
                  color: "#fefaf2",
                  padding: "12px 20px",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                }}
              >
                tempoll
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 72,
                    lineHeight: 1.02,
                    fontWeight: 800,
                    letterSpacing: -2,
                    color: "#153040",
                  }}
                >
                  Free scheduling without accounts
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    lineHeight: 1.3,
                    color: "#35505e",
                    maxWidth: 620,
                  }}
                >
                  Share one link, let everyone paint availability, and watch the best meeting
                  times rise to the top.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {["Free to use", "Join with just a name", "Live heatmap"].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    borderRadius: 9999,
                    padding: "12px 18px",
                    fontSize: 24,
                    fontWeight: 700,
                    background: "rgba(255, 255, 255, 0.76)",
                    border: "1px solid rgba(21, 48, 64, 0.08)",
                    color: "#153040",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              width: "37%",
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 22,
                borderRadius: 32,
                border: "1px solid rgba(21, 48, 64, 0.08)",
                background: "rgba(255, 255, 255, 0.84)",
                padding: 28,
                boxShadow: "0 22px 44px rgba(21, 48, 64, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: "#58707f",
                    }}
                  >
                    Live board
                  </div>
                  <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
                    Thursday design review
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9999,
                    background: "#e6f6f4",
                    color: "#0e8690",
                    padding: "10px 14px",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  6 participants
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  borderRadius: 26,
                  background: "#f8f3e8",
                  padding: 18,
                }}
              >
                {sampleCounts.map((row, rowIndex) => (
                  <div key={rowIndex} style={{ display: "flex", gap: 10 }}>
                    {row.map((count, columnIndex) => (
                      <div
                        key={`${rowIndex}-${columnIndex}`}
                        style={{
                          display: "flex",
                          flex: 1,
                          height: 34,
                          borderRadius: 10,
                          border: "1px solid rgba(21, 48, 64, 0.06)",
                          background: cellColors[count] ?? cellColors[0],
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                {[
                  ["Best slot", "Thu · 13:00"],
                  ["Overlap", "4+ available"],
                  ["Entry", "Name only"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      gap: 6,
                      borderRadius: 18,
                      background: "#ffffff",
                      border: "1px solid rgba(21, 48, 64, 0.06)",
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 17,
                        color: "#58707f",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#153040",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...socialImageSize,
    },
  );
}
