export type PasswordResetEmail = {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
};

export interface EmailProvider {
  sendPasswordReset(message: PasswordResetEmail): Promise<void>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export function buildPasswordResetEmail(message: PasswordResetEmail) {
  const name = escapeHtml(message.recipientName);
  const resetUrl = escapeHtml(message.resetUrl);
  return {
    subject: "Redefina sua senha — Judô Rogério Cruz",
    htmlContent: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f3f0ee;color:#241b19;font-family:Arial,sans-serif">
    <main style="max-width:560px;margin:0 auto;padding:32px 20px">
      <section style="background:#ffffff;border:1px solid #dfd6d2;border-radius:16px;padding:28px">
        <p style="margin:0 0 8px;color:#a6241b;font-size:12px;font-weight:700;text-transform:uppercase">Associação Judô Rogério Cruz</p>
        <h1 style="margin:0 0 16px;font-size:24px">Redefinição de senha</h1>
        <p>Olá, ${name}.</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta. O link abaixo é válido por 20 minutos e pode ser usado uma única vez.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 18px;border-radius:10px;background:#a6241b;color:#ffffff;font-weight:700;text-decoration:none">Criar nova senha</a>
        </p>
        <p style="font-size:13px;color:#6f625e;overflow-wrap:anywhere">Se o botão não abrir, copie este endereço:<br>${resetUrl}</p>
        <p style="margin-top:22px;font-size:13px;color:#6f625e">Se você não fez esta solicitação, ignore esta mensagem. Sua senha atual continua válida.</p>
      </section>
    </main>
  </body>
</html>`,
  };
}

class BrevoEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly senderEmail: string,
    private readonly senderName: string,
  ) {}

  async sendPasswordReset(message: PasswordResetEmail) {
    const content = buildPasswordResetEmail(message);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: message.recipientEmail, name: message.recipientName }],
        subject: content.subject,
        htmlContent: content.htmlContent,
        headers: { "Idempotency-Key": crypto.randomUUID() },
        tags: ["password-reset"],
      }),
    });
    if (!response.ok) {
      throw new Error(`Brevo recusou o envio (${response.status}).`);
    }
  }
}

export function getEmailProvider(env: Env): EmailProvider | null {
  const apiKey = env.BREVO_API_KEY?.trim();
  const senderEmail = env.EMAIL_FROM_ADDRESS?.trim();
  if (!apiKey || !senderEmail) return null;
  return new BrevoEmailProvider(
    apiKey,
    senderEmail,
    env.EMAIL_FROM_NAME?.trim() || "Judô Rogério Cruz",
  );
}
