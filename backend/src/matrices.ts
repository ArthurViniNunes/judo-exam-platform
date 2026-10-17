import type { AuthUser } from "./contracts";
import { isMatrix } from "./domain";
import { json } from "./http";

export async function listMatrices(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const matrixResult =
    user.role === "super_admin"
      ? await env.DB.prepare(
          "SELECT exam_matrices.*, users.name AS creator_name FROM exam_matrices JOIN users ON users.id = exam_matrices.created_by ORDER BY exam_matrices.created_at DESC",
        ).all<Record<string, unknown>>()
      : await env.DB.prepare(
          "SELECT exam_matrices.*, users.name AS creator_name FROM exam_matrices JOIN users ON users.id = exam_matrices.created_by WHERE exam_matrices.status = 'active' ORDER BY exam_matrices.created_at DESC",
        ).all<Record<string, unknown>>();
  const categoryResult = await env.DB.prepare(
    "SELECT * FROM matrix_categories ORDER BY position",
  ).all<{
    id: string;
    matrix_id: string;
    name: string;
    position: number;
  }>();
  const techniqueResult = await env.DB.prepare(
    "SELECT * FROM matrix_techniques ORDER BY position",
  ).all<{
    id: string;
    category_id: string;
    name: string;
    position: number;
  }>();

  return json(
    request,
    env,
    matrixResult.results.map((matrix) => ({
      id: matrix.id,
      name: matrix.name,
      description: matrix.description,
      hasKata: Boolean(matrix.has_kata),
      kataType: matrix.kata_type,
      minimumScore: matrix.minimum_score,
      maxCategoriesBelowFive: matrix.max_categories_below_five,
      status: matrix.status,
      creatorName: matrix.creator_name,
      createdAt: matrix.created_at,
      categories: categoryResult.results
        .filter((category) => category.matrix_id === matrix.id)
        .map((category) => ({
          id: category.id,
          name: category.name,
          techniques: techniqueResult.results
            .filter((technique) => technique.category_id === category.id)
            .map((technique) => technique.name),
        })),
    })),
  );
}

export async function createMatrix(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const body: unknown = await request.json();
  if (!isMatrix(body)) {
    return json(
      request,
      env,
      {
        error:
          "Revise o nome, as regras e informe ao menos uma técnica por categoria.",
      },
      400,
    );
  }

  const id = crypto.randomUUID();
  const statements = [
    env.DB.prepare(
      "INSERT INTO exam_matrices (id, name, description, has_kata, kata_type, minimum_score, max_categories_below_five, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      body.name.trim(),
      body.description?.trim() || null,
      Number(body.hasKata),
      body.hasKata ? body.kataType : null,
      body.minimumScore,
      body.maxCategoriesBelowFive,
      body.status || "active",
      user.id,
    ),
  ];

  body.categories.forEach((category, categoryIndex) => {
    const categoryId = crypto.randomUUID();
    statements.push(
      env.DB.prepare(
        "INSERT INTO matrix_categories (id, matrix_id, name, position) VALUES (?, ?, ?, ?)",
      ).bind(categoryId, id, category.name.trim(), categoryIndex),
    );
    category.techniques
      .map((technique) => technique.trim())
      .filter(Boolean)
      .forEach((technique, techniqueIndex) =>
        statements.push(
          env.DB.prepare(
            "INSERT INTO matrix_techniques (id, category_id, name, position) VALUES (?, ?, ?, ?)",
          ).bind(crypto.randomUUID(), categoryId, technique, techniqueIndex),
        ),
      );
  });

  await env.DB.batch(statements);
  return json(request, env, { id }, 201);
}
