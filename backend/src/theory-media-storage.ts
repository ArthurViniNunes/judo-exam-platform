import { AwsClient } from "aws4fetch";
import { json } from "./http";

export const MAX_THEORY_MEDIA_BYTES = 50 * 1024 * 1024;

const mediaTypes = {
  "image/jpeg": { kind: "image", extension: "jpg" },
  "image/png": { kind: "image", extension: "png" },
  "image/webp": { kind: "image", extension: "webp" },
  "image/gif": { kind: "image", extension: "gif" },
  "audio/mpeg": { kind: "audio", extension: "mp3" },
  "audio/mp4": { kind: "audio", extension: "m4a" },
  "audio/ogg": { kind: "audio", extension: "ogg" },
  "audio/wav": { kind: "audio", extension: "wav" },
  "audio/webm": { kind: "audio", extension: "webm" },
  "video/mp4": { kind: "video", extension: "mp4" },
  "video/webm": { kind: "video", extension: "webm" },
  "video/ogg": { kind: "video", extension: "ogv" },
} as const;

export type UploadedTheoryMediaKind = (typeof mediaTypes)[keyof typeof mediaTypes]["kind"];

type MediaStorageConfig = {
  keyId: string;
  applicationKey: string;
  bucket: string;
  region: string;
};

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export function theoryMediaStorageConfigured(env: Env) {
  return Boolean(
    clean(env.B2_MEDIA_KEY_ID)
      && clean(env.B2_MEDIA_APPLICATION_KEY)
      && clean(env.B2_MEDIA_BUCKET)
      && clean(env.B2_MEDIA_REGION),
  );
}

function storageConfig(env: Env): MediaStorageConfig | null {
  const config = {
    keyId: clean(env.B2_MEDIA_KEY_ID),
    applicationKey: clean(env.B2_MEDIA_APPLICATION_KEY),
    bucket: clean(env.B2_MEDIA_BUCKET),
    region: clean(env.B2_MEDIA_REGION),
  };
  if (Object.values(config).some((value) => !value)) return null;
  if (!/^[a-z0-9-]+$/.test(config.region)) return null;
  if (!/^[a-z0-9][a-z0-9.-]{4,48}[a-z0-9]$/.test(config.bucket)) return null;
  return config;
}

export function theoryMediaType(contentType: string | null) {
  const normalized = contentType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mediaTypes[normalized as keyof typeof mediaTypes] ?? null;
}

export function validateTheoryMediaUpload(
  contentType: string | null,
  contentLength: string | null,
) {
  const mediaType = theoryMediaType(contentType);
  if (!mediaType) {
    return "Formato não aceito. Use JPG, PNG, WebP, GIF, MP3, M4A, OGG, WAV, MP4 ou WebM.";
  }
  if (!contentLength || !/^\d+$/.test(contentLength)) {
    return "Não foi possível confirmar o tamanho do arquivo.";
  }
  const size = Number(contentLength);
  if (!Number.isSafeInteger(size) || size <= 0) return "O arquivo está vazio ou é inválido.";
  if (size > MAX_THEORY_MEDIA_BYTES) return "O arquivo deve ter no máximo 50 MB.";
  return { ...mediaType, size };
}

function objectUrl(config: MediaStorageConfig, objectKey: string) {
  const path = [config.bucket, ...objectKey.split("/")]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://s3.${config.region}.backblazeb2.com/${path}`;
}

function mediaObjectKey(extension: string, now = new Date()) {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `theory-media/${year}/${month}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadTheoryMedia(request: Request, env: Env) {
  const config = storageConfig(env);
  if (!config) {
    return json(request, env, {
      error: "O armazenamento de mídias ainda não foi configurado. Use uma URL HTTPS por enquanto.",
    }, 503);
  }

  const validation = validateTheoryMediaUpload(
    request.headers.get("Content-Type"),
    request.headers.get("Content-Length"),
  );
  if (typeof validation === "string") {
    return json(request, env, { error: validation }, 400);
  }
  if (!request.body) return json(request, env, { error: "Envie um arquivo." }, 400);

  const objectKey = mediaObjectKey(validation.extension);
  const url = objectUrl(config, objectKey);
  const client = new AwsClient({
    accessKeyId: config.keyId,
    secretAccessKey: config.applicationKey,
    service: "s3",
    region: config.region,
    retries: 0,
  });

  let response: Response;
  try {
    response = await client.fetch(url, {
      method: "PUT",
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": request.headers.get("Content-Type") || "application/octet-stream",
      },
      body: request.body,
    });
  } catch (error) {
    console.error(JSON.stringify({
      message: "theory media upload failed",
      error: error instanceof Error ? error.message : "unknown error",
      requestId: request.headers.get("X-Request-Id"),
    }));
    return json(request, env, { error: "Não foi possível enviar a mídia. Tente novamente." }, 502);
  }

  if (!response.ok) {
    console.error(JSON.stringify({
      message: "theory media storage rejected upload",
      status: response.status,
      requestId: request.headers.get("X-Request-Id"),
    }));
    return json(request, env, {
      error: "O armazenamento recusou o arquivo. Confira as credenciais e o acesso ao bucket.",
    }, 502);
  }

  return json(request, env, {
    sourceUrl: url,
    kind: validation.kind,
    size: validation.size,
  }, 201);
}
