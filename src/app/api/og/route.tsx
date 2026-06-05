import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get("a") ?? "Player A";
  const b = searchParams.get("b") ?? "Player B";
  const pick = searchParams.get("pick") ?? "";
  const pct = searchParams.get("pct") ?? "";
  const aImg = searchParams.get("aImg");
  const bImg = searchParams.get("bImg");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#1E1E1E",
          color: "white",
          fontFamily: "Impact, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            position: "relative",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: 40,
              background: pick === a ? "#F9A82533" : "transparent",
              borderRight: "4px solid #F9A825",
            }}
          >
            {aImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aImg} width={280} height={360} style={{ objectFit: "cover", borderRadius: 16 }} alt="" />
            )}
            <div style={{ fontSize: 56, marginTop: 16, display: "flex" }}>{a}</div>
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: 120,
              color: "#F9A825",
              display: "flex",
            }}
          >
            VS
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: 40,
              background: pick === b ? "#F9A82533" : "transparent",
            }}
          >
            {bImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bImg} width={280} height={360} style={{ objectFit: "cover", borderRadius: 16 }} alt="" />
            )}
            <div style={{ fontSize: 56, marginTop: 16, display: "flex" }}>{b}</div>
          </div>
        </div>
        {pick && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: 20,
              fontSize: 36,
              color: "#F9A825",
              borderTop: "2px solid #F9A82540",
            }}
          >
            I picked {pick}{pct ? ` — ${pct}% agree` : ""}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 16,
            background: "#F9A825",
            color: "#1E1E1E",
            fontSize: 26,
            letterSpacing: 4,
          }}
        >
          CHECK-UP — THE BASKETBALL NETWORK
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
