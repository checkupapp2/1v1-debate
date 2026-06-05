import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      category,
      era,
      bio,
      photo_url,
      handles,
      scoring,
      quickness,
      heart,
      court_iq,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name and category are required." },
        { status: 400 }
      );
    }

    const submissionRef = getAdminDb().collection("submissions").doc();
    await submissionRef.set({
      name,
      category,
      era: era || null,
      bio: bio || "",
      photo_url: photo_url || "",
      attributes: {
        handles: Number(handles) || 50,
        scoring: Number(scoring) || 50,
        quickness: Number(quickness) || 50,
        heart: Number(heart) || 50,
        court_iq: Number(court_iq) || 50,
      },
      status: "pending",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Submission received successfully", id: submissionRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting player:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
