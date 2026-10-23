import { describe, expect, it } from "vitest";
import { buildPasswordResetEmail } from "../backend/src/email";

describe("e-mail de recuperação", () => {
  it("inclui o link de uso único e a validade da solicitação", () => {
    const email = buildPasswordResetEmail({
      recipientEmail: "judoca@example.com",
      recipientName: "Judoca",
      resetUrl: "https://example.com/?recuperar=token-seguro",
    });

    expect(email.subject).toContain("Redefina sua senha");
    expect(email.htmlContent).toContain("https://example.com/?recuperar=token-seguro");
    expect(email.htmlContent).toContain("20 minutos");
  });

  it("escapa dados dinâmicos antes de montar o HTML", () => {
    const email = buildPasswordResetEmail({
      recipientEmail: "judoca@example.com",
      recipientName: '<img src=x onerror="alert(1)">',
      resetUrl: "https://example.com/?recuperar=a&origem=b",
    });

    expect(email.htmlContent).not.toContain("<img src=x");
    expect(email.htmlContent).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(email.htmlContent).toContain("recuperar=a&amp;origem=b");
  });
});
