// Der Hinweis „Code gesendet“ stimmt nur auf der Seite, die aus „Passwort zurücksetzen“ kommt. Mit `code` im Link steckt der
// Code schon im Formular (es wurde nichts gesendet), mit `initial` wird gar kein Code gebraucht.
export function showCodeSentBanner({ initial, code }: { initial?: string; code?: string }): boolean {
  return !initial && !code;
}
