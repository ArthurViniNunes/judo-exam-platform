export type InvitationPrefill = {
  email: string;
  name: string;
};

export function buildInvitationPath(invitation: InvitationPrefill) {
  const params = new URLSearchParams({
    acesso: "avaliador",
    cadastro: "1",
    email: invitation.email,
    nome: invitation.name,
  });
  return `/?${params.toString()}`;
}

export function readInvitationPrefill(search: string): InvitationPrefill | null {
  const params = new URLSearchParams(search);
  if (params.get("cadastro") !== "1") return null;

  const email = params.get("email")?.trim() || "";
  if (!email) return null;

  return {
    email,
    name: params.get("nome")?.trim() || "",
  };
}
