import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 88,
        }}
      >
        BC
      </div>
    ),
    { ...size },
  );
}
