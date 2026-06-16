import { NextResponse } from "next/server";
import { listNotes, createNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notes = await listNotes();
    return NextResponse.json(notes);
  } catch (err) {
    console.error("GET /api/notes 실패:", err);
    return NextResponse.json(
      { error: "노트 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let notebook = "기본";
    try {
      const body = await request.json();
      if (body && typeof body.notebook === "string" && body.notebook.trim()) {
        notebook = body.notebook.trim();
      }
    } catch {
      // 빈 바디 허용
    }
    const note = await createNote(notebook);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("POST /api/notes 실패:", err);
    return NextResponse.json(
      { error: "노트를 생성하지 못했습니다." },
      { status: 500 }
    );
  }
}
