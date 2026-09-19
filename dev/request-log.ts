import type { Scenario } from "./fixtures";

export interface RequestRecord {
  id: number;
  path: string;
  scenario: Scenario | "live";
  status: string;
}

let sequence = 0;
export function nextRequestId(): number {
  return ++sequence;
}

interface RequestLog {
  update: (record: RequestRecord) => void;
  clear: () => void;
}

export function createRequestLog(list: HTMLOListElement): RequestLog {
  const rows = new Map<number, HTMLLIElement>();
  return {
    update(record: RequestRecord): void {
      let row = rows.get(record.id);
      if (!row) {
        row = document.createElement("li");
        rows.set(record.id, row);
        list.prepend(row);
      }
      const status = document.createElement("span");
      status.className = "request-status";
      status.textContent = record.status;
      const path = document.createElement("code");
      path.textContent = record.path;
      row.title = `#${record.id} · ${record.scenario}`;
      row.replaceChildren(status, path);
      if (rows.size > 50) {
        const oldest = rows.keys().next().value;
        if (oldest !== undefined) {
          rows.get(oldest)?.remove();
          rows.delete(oldest);
        }
      }
    },
    clear(): void {
      rows.clear();
      list.replaceChildren();
    },
  };
}
