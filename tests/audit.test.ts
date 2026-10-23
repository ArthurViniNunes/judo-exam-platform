import { describe, expect, it } from "vitest";
import {
  decodeAuditCursor,
  encodeAuditCursor,
  isAuditDate,
  parseAuditMetadata,
} from "../backend/src/audit";

describe("auditoria", () => {
  it("mantém a paginação opaca e rejeita cursores adulterados", () => {
    const cursor = {
      createdAt: "2026-10-22 19:45:10",
      id: "audit-event-1",
    };

    expect(decodeAuditCursor(encodeAuditCursor(cursor))).toEqual(cursor);
    expect(decodeAuditCursor("cursor-inválido")).toBeNull();
  });

  it("aceita apenas datas reais no formato usado pelos filtros", () => {
    expect(isAuditDate("2026-10-22")).toBe(true);
    expect(isAuditDate("2026-02-30")).toBe(false);
    expect(isAuditDate("22/10/2026")).toBe(false);
  });

  it("não interrompe a consulta quando metadados antigos estão inválidos", () => {
    expect(parseAuditMetadata('{"status":"active"}')).toEqual({ status: "active" });
    expect(parseAuditMetadata("inválido")).toEqual({});
    expect(parseAuditMetadata("[]")).toEqual({});
  });
});
