// Kennungen, an denen Zitadel einen unbrauchbaren Code (Link) meldet. Die Kennung steht in jeder Sprache hinter dem Text,
// darum vergleichen wir sie und nicht den Wortlaut. Quelle (Stand 04.11.2026): zitadel/zitadel, internal/command/user_human.go
// (Z. 808) und internal/crypto/code.go (Z. 146, 173, 181).
const CODE_PROBLEM_MARKERS = [
  "COMMAND-2M9fs", // Errors.User.Code.NotFound (failed_precondition): Code nicht gefunden, z. B. Link schon benutzt
  "CODE-QvUQ4P", // Errors.User.Code.Expired (failed_precondition): Code abgelaufen
  "CODE-woT0xc", // Errors.User.Code.Invalid (invalid_argument): Code nicht gültig
  "CRYPT-aqrFV", // Errors.User.Code.CryptoCodeNil (invalid_argument)
  "Errors.User.Code.", // Übersetzungsschlüssel, falls Zitadel den Text nicht auflösen konnte
];

export function isCodeProblem(message?: string): boolean {
  if (!message) {
    return false;
  }
  return CODE_PROBLEM_MARKERS.some((marker) => message.includes(marker));
}

// Geworfene Fehler kommen als Error, als Text oder als Objekt mit `message` an.
export function errorMessage(error: unknown): string | undefined {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return undefined;
}
