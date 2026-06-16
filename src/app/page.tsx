"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Note } from "@/lib/notes";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

const ALL = "__all__";

/** HTML 태그를 제거해 미리보기용 텍스트를 만든다. */
function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeNotebook, setActiveNotebook] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [loading, setLoading] = useState(true);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- 초기 로딩 ---- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notes");
        const data: Note[] = await res.json();
        setNotes(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch (err) {
        console.error("노트 로딩 실패:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  /* ---- 노트북 목록 (개수 포함) ---- */
  const notebooks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes) {
      counts.set(n.notebook, (counts.get(n.notebook) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [notes]);

  /* ---- 필터링된 리스트 ---- */
  const visibleNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeNotebook !== ALL && n.notebook !== activeNotebook) return false;
      if (!q) return true;
      const haystack = (n.title + " " + stripHtml(n.content)).toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, activeNotebook, search]);

  /* ---- 저장 (디바운스) ---- */
  const scheduleSave = useCallback(
    (id: string, patch: { title?: string; content?: string }) => {
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const updated: Note = await res.json();
          setNotes((prev) =>
            prev
              .map((n) => (n.id === id ? { ...n, ...updated } : n))
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              )
          );
          setSaveState("saved");
        } catch (err) {
          console.error("저장 실패:", err);
          setSaveState("idle");
        }
      }, 600);
    },
    []
  );

  /* ---- 로컬 즉시 반영 + 저장 예약 ---- */
  const updateLocal = (id: string, patch: { title?: string; content?: string }) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n))
    );
    scheduleSave(id, patch);
  };

  /* ---- 새 노트 ---- */
  const handleNew = async () => {
    try {
      const notebook = activeNotebook === ALL ? "기본" : activeNotebook;
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebook }),
      });
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
      setSearch("");
    } catch (err) {
      console.error("새 노트 생성 실패:", err);
    }
  };

  /* ---- 삭제 ---- */
  const handleDelete = async (id: string) => {
    if (!window.confirm("이 메모를 삭제할까요?")) return;
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null);
        }
        return next;
      });
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  return (
    <div className="app">
      {/* 사이드바 */}
      <aside className="sidebar">
        <div className="sidebar-header">📝 메모장</div>
        <button className="new-note-btn" onClick={handleNew}>
          ＋ 새 메모
        </button>
        <div className="sidebar-section-title">노트북</div>
        <ul className="notebook-list">
          <li
            className={`notebook-item${
              activeNotebook === ALL ? " active" : ""
            }`}
            onClick={() => setActiveNotebook(ALL)}
          >
            <span>전체 메모</span>
            <span className="notebook-count">{notes.length}</span>
          </li>
          {notebooks.map((nb) => (
            <li
              key={nb.name}
              className={`notebook-item${
                activeNotebook === nb.name ? " active" : ""
              }`}
              onClick={() => setActiveNotebook(nb.name)}
            >
              <span>📓 {nb.name}</span>
              <span className="notebook-count">{nb.count}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* 노트 리스트 */}
      <section className="note-list-pane">
        <div className="list-header">
          {activeNotebook === ALL ? "전체 메모" : activeNotebook}
        </div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            placeholder="메모 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ul className="note-list">
          {loading ? (
            <li className="list-empty">불러오는 중…</li>
          ) : visibleNotes.length === 0 ? (
            <li className="list-empty">
              {search ? "검색 결과가 없습니다." : "메모가 없습니다."}
            </li>
          ) : (
            visibleNotes.map((n) => {
              const preview = stripHtml(n.content);
              return (
                <li
                  key={n.id}
                  className={`note-card${
                    n.id === selectedId ? " active" : ""
                  }`}
                  onClick={() => setSelectedId(n.id)}
                >
                  <div
                    className={`note-card-title${
                      n.title.trim() ? "" : " untitled"
                    }`}
                  >
                    {n.title.trim() || "제목 없음"}
                  </div>
                  <div className="note-card-preview">
                    {preview || "내용 없음"}
                  </div>
                  <div className="note-card-date">
                    {formatDate(n.updatedAt)}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* 에디터 */}
      <section className="editor-pane">
        {selectedNote ? (
          <>
            <div className="editor-toolbar" style={{ paddingBottom: 0, borderBottom: "none" }}>
              <span className="tb-spacer" />
              <span
                className={`save-indicator${
                  saveState === "saving" ? " saving" : ""
                }`}
              >
                {saveState === "saving"
                  ? "저장 중…"
                  : saveState === "saved"
                  ? "저장됨"
                  : ""}
              </span>
              <span className="tb-sep" />
              <button
                className="tb-btn delete-btn"
                title="삭제"
                onClick={() => handleDelete(selectedNote.id)}
              >
                🗑
              </button>
            </div>

            <input
              className="editor-title-input"
              placeholder="제목 없음"
              value={selectedNote.title}
              onChange={(e) =>
                updateLocal(selectedNote.id, { title: e.target.value })
              }
            />
            <div className="editor-meta">
              {formatDate(selectedNote.updatedAt)} · {selectedNote.notebook}
            </div>

            <Editor
              key={selectedNote.id}
              content={selectedNote.content}
              onChange={(html) =>
                updateLocal(selectedNote.id, { content: html })
              }
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🗒️</div>
            <div>왼쪽에서 메모를 선택하거나</div>
            <div>새 메모를 만들어 시작하세요.</div>
          </div>
        )}
      </section>
    </div>
  );
}
