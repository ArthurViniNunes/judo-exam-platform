import { describe, expect, it } from "vitest";
import type { EvaluationRow, StudentRow } from "../backend/src/contracts";
import {
  dashboardFromRows,
  canDeleteEvaluation,
  formatEvaluation,
  isEvaluation,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  studentsFromRows,
  studentsFromCatalog,
} from "../backend/src/domain";
import { validPassword } from "../backend/src/security";
import {
  buildInvitationPath,
  readInvitationPrefill,
} from "../lib/invitations";
import {
  calculateKataResult,
  createKataExam,
  EMPTY_KATA_MARK,
} from "../lib/kata-exams";
import {
  calculateSequenceScore,
  createPracticalExam,
  getTechniqueEvaluationParts,
  PRACTICAL_BELTS,
  toYouTubeEmbedUrl,
  type ExamCategory,
} from "../lib/practical-exams";
import { calculatePracticalResult } from "../lib/practical-scoring";

function evaluation(overrides: Partial<EvaluationRow> = {}): EvaluationRow {
  return {
    id: crypto.randomUUID(),
    athlete: "Ana Silva",
    student_id: "student-1",
    evaluator_id: "evaluator-1",
    professor: "Arthur Nunes",
    belt: "Amarela",
    type: "técnica",
    score: 80,
    result: "Aprovado",
    matrix_id: null,
    detail: null,
    created_at: "2026-10-10 12:00:00",
    ...overrides,
  };
}

describe("regras da avaliação prática", () => {
  it("aprova média 7 sem três grupos abaixo de 7 ou dois abaixo de 5", () => {
    const exam: ExamCategory[] = [
      { name: "Nage Waza", techniques: [{ id: "a", name: "A" }] },
      { name: "Renraku-Henka Waza", techniques: [{ id: "b", name: "B" }] },
      { name: "Kaeshi Waza", techniques: [{ id: "c", name: "C" }] },
    ];
    const result = calculatePracticalResult(exam, { a: 7, b: 7, c: 10 });
    expect(result.approved).toBe(true);
    expect(result.score).toBe(8);
    expect(result.items).toEqual([
      { category: "Nage Waza", name: "A", score: 7 },
      { category: "Renraku-Henka Waza", name: "B", score: 7 },
      { category: "Kaeshi Waza", name: "C", score: 10 },
    ]);
  });

  it("reprova quando três grupos ficam abaixo de 7 mesmo com média geral suficiente", () => {
    const exam: ExamCategory[] = [
      { name: "Nage Waza", techniques: [{ id: "a", name: "A" }] },
      { name: "Renraku-Henka Waza", techniques: [{ id: "b", name: "B" }] },
      { name: "Kaeshi Waza", techniques: [{ id: "c", name: "C" }] },
      { name: "Osaekomi Waza", techniques: [{ id: "d", name: "D" }] },
      { name: "Shime Waza", techniques: [{ id: "e", name: "E" }] },
      { name: "Kansetsu Waza", techniques: [{ id: "f", name: "F" }] },
    ];
    const result = calculatePracticalResult(exam, {
      a: 5,
      b: 5,
      c: 5,
      d: 10,
      e: 10,
      f: 10,
    });
    expect(result.score).toBe(7.5);
    expect(result.approved).toBe(false);
    expect(result.detail).toContain("3 categorias ficaram abaixo de 7,0");
  });

  it("monta seleções aleatórias sem duplicar técnicas dentro da categoria", () => {
    const exam = createPracticalExam("brown", () => 0.25);
    for (const category of exam) {
      const names = category.techniques.map((technique) => technique.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("dispõe técnicas sorteadas na ordem das faixas de origem", () => {
    const beltOrder = [
      "Faixa Amarela",
      "Faixa Laranja",
      "Faixa Verde",
      "Faixa Roxa",
      "Faixa Marrom",
      "Faixa Preta",
    ];
    const exam = createPracticalExam("brown", () => 0.25);

    for (const category of exam) {
      const origins = category.techniques.flatMap((technique) =>
        technique.drawnFrom ? [technique.drawnFrom] : [],
      );
      const positions = origins.map((origin) => beltOrder.indexOf(origin));

      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((left, right) => left - right));
    }
  });

  it("trata Renraku-Henka como uma única avaliação", () => {
    const renraku = "O-uchi-gari → Uchi-mata → Tai-otoshi";
    expect(getTechniqueEvaluationParts(renraku)).toEqual([renraku]);
    expect(getTechniqueEvaluationParts("A × B")).toEqual(["A × B"]);
  });

  it("cria uma avaliação para cada execução explicitamente numerada", () => {
    expect(getTechniqueEvaluationParts("2 Fugas de Yoko-shiho-gatame")).toEqual([
      "Avaliação 1 de 2",
      "Avaliação 2 de 2",
    ]);
    expect(getTechniqueEvaluationParts("3 execuções de exemplo")).toHaveLength(3);
    expect(getTechniqueEvaluationParts("1 transição de Tachi-waza → Ne-waza")).toHaveLength(1);

    for (const belt of PRACTICAL_BELTS) {
      for (const definition of Object.values(belt.categories)) {
        for (const technique of definition?.fixed ?? []) {
          const explicitCount = Number.parseInt(technique.match(/^(\d+)\s+/)?.[1] ?? "1", 10);
          expect(getTechniqueEvaluationParts(technique)).toHaveLength(explicitCount);
        }
      }
    }

    expect(calculateSequenceScore({ 0: 10, 1: 7, 2: 5 }, 3)).toBeCloseTo(
      7.33,
      2,
    );
    expect(calculateSequenceScore({ 0: 10, 2: 5 }, 3)).toBeUndefined();
  });

  it("abre referências do YouTube com reprodução automática e preserva o início", () => {
    const embed = toYouTubeEmbedUrl("https://youtu.be/example?t=2m9s");
    expect(embed).toContain("autoplay=1");
    expect(embed).toContain("playsinline=1");
    expect(embed).toContain("start=129");
  });
});

describe("regras da avaliação de kata", () => {
  it("aplica o fator de erro grave uma única vez sobre a nota geral", () => {
    const groups = createKataExam("nage-no-kata", "partial");
    const techniques = groups.flatMap((group) => group.techniques);
    const marks = Object.fromEntries(
      techniques.map((technique) => [
        technique.id,
        { ...EMPTY_KATA_MARK, reviewed: true },
      ]),
    );
    marks[techniques[0].id] = {
      ...EMPTY_KATA_MARK,
      reviewed: true,
      severe: true,
    };
    marks[techniques[1].id] = {
      ...EMPTY_KATA_MARK,
      reviewed: true,
      severe: true,
    };

    const result = calculateKataResult(groups, marks);
    expect(result.severeApplied).toBe(true);
    expect(result.score).toBeCloseTo(result.rawScore / 2, 1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        category: "Abertura",
        name: "Cerimônia de abertura",
        score: 0,
      }),
    );
    expect(result.items[0].detail).toContain("erro grave");
  });
});

describe("domínio administrativo", () => {
  it("normaliza nomes para associar avaliações do mesmo aluno", () => {
    expect(normalizeName("  Ána   SILVA ")).toBe("ana silva");
  });

  it("mantém judocas pré-cadastrados mesmo antes da primeira avaliação", () => {
    const catalog: StudentRow[] = [
      {
        id: "student-new",
        name: "Judoca sem avaliação",
        normalized_name: "judoca sem avaliacao",
        created_at: "2026-10-20 10:00:00",
      },
    ];

    expect(studentsFromCatalog(catalog, [])).toEqual([
      expect.objectContaining({
        id: "student-new",
        name: "Judoca sem avaliação",
        average: 0,
        latestScore: 0,
        evolution: 0,
        lastEvaluationAt: null,
        evaluations: [],
      }),
    ]);
  });

  it("restringe exclusão de avaliação ao autor ou Super Admin", () => {
    const row = evaluation({ evaluator_id: "evaluator-owner" });
    const evaluator = {
      id: "evaluator-owner",
      email: "owner@example.com",
      name: "Avaliador",
      role: "evaluator" as const,
      status: "active" as const,
    };

    expect(canDeleteEvaluation(evaluator, row)).toBe(true);
    expect(canDeleteEvaluation({ ...evaluator, id: "another" }, row)).toBe(false);
    expect(
      canDeleteEvaluation({ ...evaluator, id: "admin", role: "super_admin" }, row),
    ).toBe(true);
  });

  it("valida e formata as notas individuais de uma avaliação", () => {
    const input = {
      studentId: "student-1",
      belt: "Amarela",
      type: "técnica" as const,
      score: 80,
      items: [
        { category: "Nage Waza", name: "O-soto-gari", score: 70 },
      ],
    };
    expect(isEvaluation(input)).toBe(true);
    expect(isEvaluation({ ...input, studentId: "" })).toBe(false);
    expect(isEvaluation({ ...input, items: [{ ...input.items[0], score: 120 }] })).toBe(false);

    const formatted = formatEvaluation(
      evaluation({
        items: [
          {
            id: "item-2",
            evaluation_id: "evaluation-1",
            category: "Nage Waza",
            name: "O-soto-gari",
            score: 70,
            detail: null,
            position: 1,
          },
          {
            id: "item-1",
            evaluation_id: "evaluation-1",
            category: "Nage Waza",
            name: "De-ashi-harai",
            score: 100,
            detail: "Sem auxílio.",
            position: 0,
          },
        ],
      }),
    );
    expect(formatted.items.map((item) => item.name)).toEqual([
      "De-ashi-harai",
      "O-soto-gari",
    ]);
  });

  it("gera um link de convite que recupera nome e e-mail sem perder acentos", () => {
    const path = buildInvitationPath({
      email: "avaliador@example.com",
      name: "Fábio Nunes",
    });

    expect(readInvitationPrefill(new URL(path, "https://example.com").search)).toEqual({
      email: "avaliador@example.com",
      name: "Fábio Nunes",
    });
  });

  it("normaliza e valida e-mails antes de criar o convite", () => {
    expect(normalizeEmail(" Avaliador@EXAMPLE.com ")).toBe(
      "avaliador@example.com",
    );
    expect(isValidEmail("avaliador@example.com")).toBe(true);
    expect(isValidEmail("avaliador@localhost")).toBe(false);
  });

  it("aplica no cadastro a mesma regra de senha usada pela API", () => {
    expect(validPassword("Avaliador123")).toBe(true);
    expect(validPassword("semnumerosuficiente")).toBe(false);
    expect(validPassword("1234567890")).toBe(false);
  });

  it("calcula evolução cronológica e indicadores sem contar kata na aprovação", () => {
    const rows = [
      evaluation({ score: 60, created_at: "2026-09-01 10:00:00" }),
      evaluation({ score: 80, created_at: "2026-10-01 10:00:00" }),
      evaluation({
        id: "kata-1",
        type: "kata",
        score: 40,
        result: "Registro técnico",
        created_at: "2026-10-02 10:00:00",
      }),
    ];
    const dashboard = dashboardFromRows(rows, new Date("2026-10-17T00:00:00Z"));
    const [student] = studentsFromRows(rows);

    expect(dashboard.summary.approvalRate).toBe(100);
    expect(dashboard.summary.students).toBe(1);
    expect(student.evolution).toBe(-20);
    expect(student.evaluations.map((item) => item.id)).toEqual([
      rows[0].id,
      rows[1].id,
      "kata-1",
    ]);
  });
});
