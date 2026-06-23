import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b4552f",
          color: "#faf7f2",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 96,
        }}
      >
        BC
      </div>
    ),
    { width: 192, height: 192 },
  );
}
