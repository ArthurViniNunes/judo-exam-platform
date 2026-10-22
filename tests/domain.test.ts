import { describe, expect, it } from "vitest";
import type { EvaluationRow, StudentRow } from "../backend/src/contracts";
import {
  activeRoleForContext,
  dashboardFromRows,
  canDeleteEvaluation,
  formatEvaluation,
  isEvaluation,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  rolesFromCsv,
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
import { EVALUATOR_RANKS, isEvaluatorRank } from "../lib/judo-ranks";
import {
  validateTheoryPublication,
  validateTheoryQuestionInput,
  validateTheoryVersionInput,
} from "../backend/src/theory-domain";
import { eligibilityStatus } from "../backend/src/student-profile";
import {
  BROWN_THEORY_TEMPLATE,
  BROWN_THEORY_TEMPLATE_SUMMARY,
} from "../backend/src/brown-theory-template";
import {
  scoreTheoryAttempt,
  shuffleTheoryItems,
} from "../backend/src/theory-attempt-domain";
import { toTheoryYouTubeEmbedUrl } from "../lib/theory-exams";

describe("contexto de autenticação", () => {
  it("seleciona o papel permitido para cada porta de entrada", () => {
    expect(activeRoleForContext(["student", "evaluator"], "student")).toBe(
      "student",
    );
    expect(
      activeRoleForContext(["student", "evaluator"], "professional"),
    ).toBe("evaluator");
    expect(
      activeRoleForContext(
        ["student", "evaluator", "super_admin"],
        "professional",
      ),
    ).toBe("super_admin");
  });

  it("não transforma a rota escolhida em permissão", () => {
    expect(activeRoleForContext(["student"], "professional")).toBeNull();
    expect(activeRoleForContext(["evaluator"], "student")).toBeNull();
  });

  it("descarta papéis desconhecidos vindos do banco", () => {
    expect(rolesFromCsv("student,evaluator,invalid")).toEqual([
      "student",
      "evaluator",
    ]);
    expect(rolesFromCsv(null)).toEqual([]);
  });
});

describe("perfil do aluno", () => {
  const now = new Date("2026-10-22T12:00:00Z");

  it("mantém ativa a elegibilidade sem revogação ou vencimento", () => {
    expect(
      eligibilityStatus({ valid_until: null, revoked_at: null }, now),
    ).toBe("active");
  });

  it("distingue vencimento e revogação", () => {
    expect(
      eligibilityStatus(
        { valid_until: "2026-10-22 11:59:59", revoked_at: null },
        now,
      ),
    ).toBe("expired");
    expect(
      eligibilityStatus(
        {
          valid_until: "2027-01-01 00:00:00",
          revoked_at: "2026-10-20 10:00:00",
        },
        now,
      ),
    ).toBe("revoked");
  });
});

describe("mídia da prova teórica", () => {
  it("converte links do YouTube para o player com privacidade ampliada", () => {
    expect(toTheoryYouTubeEmbedUrl("https://youtu.be/abcdefghijk")).toBe(
      "https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1&rel=0",
    );
    expect(
      toTheoryYouTubeEmbedUrl("https://www.youtube.com/watch?v=abcdefghijk"),
    ).toBe(
      "https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1&rel=0",
    );
  });

  it("recusa endereços que não identificam um vídeo do YouTube", () => {
    expect(toTheoryYouTubeEmbedUrl("https://example.com/video")).toBeNull();
    expect(toTheoryYouTubeEmbedUrl("endereço inválido")).toBeNull();
  });
});

describe("provas teóricas versionadas", () => {
  it("mantém íntegro o modelo importável do exame marrom", () => {
    expect(BROWN_THEORY_TEMPLATE_SUMMARY).toEqual({
      questionCount: 52,
      totalPoints: 1000,
      gridQuestionCount: 9,
      pendingMediaCount: 14,
    });
    expect(
      BROWN_THEORY_TEMPLATE.map((question) => validateTheoryQuestionInput(question))
        .filter((result) => typeof result === "string"),
    ).toEqual([]);
  });

  it("normaliza uma versão sem inventar regras ainda não configuradas", () => {
    expect(
      validateTheoryVersionInput({
        beltId: "yellow",
        minimumScore: null,
        questionOrder: null,
      }),
    ).toMatchObject({
      beltId: "yellow",
      beltName: "Faixa amarela — 5º Kyu",
      minimumScore: null,
      questionOrder: null,
    });
  });

  it("aceita questão completa com uma única alternativa correta", () => {
    expect(
      validateTheoryQuestionInput({
        category: "História",
        prompt: "Quem fundou o Judô?",
        points: 10,
        explanation: "A resposta será explicada após a entrega.",
        options: [
          { text: "Jigoro Kano", isCorrect: true },
          { text: "Outra pessoa", isCorrect: false },
        ],
        media: null,
      }),
    ).toMatchObject({ category: "História", points: 10 });
  });

  it("recusa YouTube quando o metadado pode revelar a resposta", () => {
    expect(
      validateTheoryQuestionInput({
        category: "Técnicas",
        prompt: "Qual técnica aparece na mídia?",
        points: 10,
        explanation: "Explicação futura.",
        options: [
          { text: "Opção A", isCorrect: true },
          { text: "Opção B", isCorrect: false },
        ],
        media: {
          kind: "youtube",
          sourceUrl: "https://www.youtube.com/watch?v=abc",
          altText: "Mídia da questão",
          metadataSensitive: true,
        },
      }),
    ).toMatch(/não podem ser usados/);
  });

  it("aceita associação com uma resposta por item", () => {
    expect(
      validateTheoryQuestionInput({
        type: "grid_single",
        category: "História",
        prompt: "Relacione os fatos com as datas.",
        points: 10,
        explanation: "Confira cada associação no gabarito.",
        options: [
          { text: "1860", isCorrect: false },
          { text: "1882", isCorrect: false },
        ],
        rows: [
          { text: "Nascimento de Jigoro Kano", correctOptionIndexes: [0] },
          { text: "Fundação da Kodokan", correctOptionIndexes: [1] },
        ],
        media: null,
      }),
    ).toMatchObject({
      type: "grid_single",
      rows: [
        { correctOptionIndexes: [0] },
        { correctOptionIndexes: [1] },
      ],
    });
  });

  it("recusa item da associação sem gabarito", () => {
    expect(
      validateTheoryQuestionInput({
        type: "grid_multiple",
        category: "Técnicas",
        prompt: "Relacione as técnicas.",
        points: 10,
        explanation: "Confira as classificações.",
        options: [
          { text: "Tachi-waza", isCorrect: false },
          { text: "Sutemi-waza", isCorrect: false },
        ],
        rows: [{ text: "Tomoe-nage", correctOptionIndexes: [] }],
        media: null,
      }),
    ).toMatch(/ao menos uma resposta correta/);
  });

  it("bloqueia publicação incompleta e identifica a questão", () => {
    expect(
      validateTheoryPublication(
        { minimumScore: null, questionOrder: null },
        [{
          type: "single_choice",
          explanation: "",
          optionCount: 2,
          correctOptionCount: 1,
          rowCount: 0,
          invalidRowCount: 0,
          mediaKind: null,
          metadataSensitive: false,
        }],
      ),
    ).toEqual([
      "Defina a nota mínima.",
      "Defina a ordem das questões.",
      "Questão 1: informe a explicação do gabarito.",
    ]);
  });
});

describe("tentativas da prova teórica", () => {
  it("embaralha sem perder nem repetir itens", () => {
    const indexes = [1, 0, 0];
    const shuffled = shuffleTheoryItems(
      ["A", "B", "C", "D"],
      () => indexes.shift() ?? 0,
    );
    expect(shuffled).not.toEqual(["A", "B", "C", "D"]);
    expect([...shuffled].sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("calcula o percentual ponderado e a aprovação no servidor", () => {
    const result = scoreTheoryAttempt(
      [
        { id: "q1", points: 10, correctOptionId: "a" },
        { id: "q2", points: 30, correctOptionId: "b" },
      ],
      new Map([
        ["q1", "a"],
        ["q2", "incorreta"],
      ]),
      70,
    );
    expect(result).toEqual({
      score: 25,
      passed: false,
      awardedByQuestion: { q1: 10, q2: 0 },
    });
  });

  it("corrige uma associação sem depender da ordem das marcações", () => {
    const result = scoreTheoryAttempt(
      [{
        id: "grid",
        points: 20,
        correctOptionId: "__grid__",
        correctGridAnswers: { row1: ["b", "a"], row2: ["c"] },
      }],
      new Map([["grid", { row2: ["c"], row1: ["a", "b"] }]]),
      70,
    );
    expect(result).toMatchObject({ score: 100, passed: true });
  });
});

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
    eligibility_id: null,
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
      evaluator_rank: "Faixa preta — 1º dan",
      role: "evaluator" as const,
      roles: ["evaluator" as const],
      context: "professional" as const,
      student_id: null,
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
      beltId: "yellow",
      belt: "Amarela",
      type: "técnica" as const,
      score: 80,
      categories: [{ name: "Nage Waza", score: 85 }],
      items: [
        {
          category: "Nage Waza",
          name: "2 Fugas de Yoko-shiho-gatame",
          score: 85,
          parts: [
            { name: "1ª fuga", score: 70 },
            { name: "2ª fuga", score: 100 },
          ],
        },
      ],
    };
    expect(isEvaluation(input)).toBe(true);
    expect(isEvaluation({ ...input, beltId: "faixa-inexistente" })).toBe(false);
    expect(isEvaluation({ ...input, studentId: "" })).toBe(false);
    expect(isEvaluation({ ...input, categories: [{ name: "Nage Waza", score: -1 }] })).toBe(false);
    expect(isEvaluation({ ...input, items: [{ ...input.items[0], score: 120 }] })).toBe(false);
    expect(
      isEvaluation({
        ...input,
        items: [{ ...input.items[0], parts: [{ name: "1ª fuga", score: 101 }] }],
      }),
    ).toBe(false);

    const formatted = formatEvaluation(
      evaluation({
        categories: [
          {
            id: "category-1",
            evaluation_id: "evaluation-1",
            name: "Nage Waza",
            score: 85,
            position: 0,
          },
        ],
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
            parts: [
              {
                id: "part-1",
                evaluation_item_id: "item-1",
                name: "1ª execução",
                score: 100,
                position: 0,
              },
            ],
          },
        ],
      }),
    );
    expect(formatted.items.map((item) => item.name)).toEqual([
      "De-ashi-harai",
      "O-soto-gari",
    ]);
    expect(formatted.categories).toEqual([
      { id: "category-1", name: "Nage Waza", score: 85 },
    ]);
    expect(formatted.eligibilityId).toBeNull();
    expect(formatted.items[0].parts).toEqual([
      { id: "part-1", name: "1ª execução", score: 100 },
    ]);
  });

  it("gera um link de convite que recupera nome e e-mail sem perder acentos", () => {
    const path = buildInvitationPath({
      email: "avaliador@example.com",
      name: "Fábio Nunes",
    });

    expect(new URL(path, "https://example.com").searchParams.get("acesso")).toBe(
      "avaliador",
    );
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

  it("aceita somente graduações previstas para avaliadores", () => {
    expect(EVALUATOR_RANKS).toContain("Faixa preta — 1º dan");
    expect(isEvaluatorRank("Faixa coral — 6º dan")).toBe(true);
    expect(isEvaluatorRank("Faixa inventada")).toBe(false);
    expect(isEvaluatorRank(1)).toBe(false);
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
