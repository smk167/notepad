import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let initialized = false;

function getClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error("TURSO_URL 환경변수가 설정되지 않았습니다.");
  }

  client = createClient({ url, authToken });
  return client;
}

/**
 * 노트 테이블을 보장한다. 최초 호출 시 한 번만 실행된다.
 */
async function ensureSchema(c: Client): Promise<void> {
  if (initialized) return;
  await c.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      notebook TEXT NOT NULL DEFAULT '기본',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  initialized = true;
}

/**
 * 스키마를 보장한 뒤 클라이언트를 반환한다.
 */
export async function getDb(): Promise<Client> {
  const c = getClient();
  await ensureSchema(c);
  return c;
}
