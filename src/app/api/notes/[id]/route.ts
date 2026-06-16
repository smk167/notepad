import { NextResponse } from "next/server";
import { getNote, updateNote, deleteNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const note = await getNote(id);
    if (!note) {
      return NextResponse.json(
        { error: "노트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json(note);
  } catch (err) {
    console.error("GET /api/notes/[id] 실패:", err);
    return NextResponse.json(
      { error: "노트를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const note = await updateNote(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      notebook: typeof body.notebook === "string" ? body.notebook : undefined,
    });
    if (!note) {
      return NextResponse.json(
        { error: "노트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json(note);
  } catch (err) {
    console.error("PATCH /api/notes/[id] 실패:", err);
    return NextResponse.json(
      { error: "노트를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteNote(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/notes/[id] 실패:", err);
    return NextResponse.json(
      { error: "노트를 삭제하지 못했습니다." },
      { status: 500 }
    );
  }
}
