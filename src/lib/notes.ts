import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export interface Note {
  id: string;
  title: string;
  content: string;
  notebook: string;
  createdAt: string;
  updatedAt: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToNote(row: any): Note {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    notebook: String(row.notebook ?? "기본"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * 모든 노트를 최근 수정순으로 반환한다.
 */
export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT * FROM notes ORDER BY updated_at DESC"
  );
  return result.rows.map(rowToNote);
}

/**
 * 단일 노트를 반환한다. 없으면 null.
 */
export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM notes WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToNote(result.rows[0]);
}

/**
 * 빈 노트를 생성하고 반환한다.
 */
export async function createNote(notebook = "기본"): Promise<Note> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO notes (id, title, content, notebook, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, "", "", notebook, now, now],
  });
  return {
    id,
    title: "",
    content: "",
    notebook,
    createdAt: now,
    updatedAt: now,
  };
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  notebook?: string;
}

/**
 * 노트를 부분 업데이트하고 갱신된 노트를 반환한다.
 */
export async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<Note | null> {
  const existing = await getNote(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const title = input.title ?? existing.title;
  const content = input.content ?? existing.content;
  const notebook = input.notebook ?? existing.notebook;

  const db = await getDb();
  await db.execute({
    sql: `UPDATE notes SET title = ?, content = ?, notebook = ?, updated_at = ?
          WHERE id = ?`,
    args: [title, content, notebook, now, id],
  });

  return { ...existing, title, content, notebook, updatedAt: now };
}

/**
 * 노트를 삭제한다.
 */
export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM notes WHERE id = ?", args: [id] });
}
