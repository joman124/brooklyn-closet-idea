import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 18,
        }}
      >
        BC
      </div>
    ),
    { ...size },
  );
}
