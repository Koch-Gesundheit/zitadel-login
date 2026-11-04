import deepmerge from "deepmerge";

type Messages = Record<string, unknown>;

// Reihenfolge von unten nach oben: Englisch als Grundlage, darüber die Texte aus der Zitadel-API, zuletzt die Dateien in
// locales/. Die Datei muss gewinnen: Die API liefert für jede Sprache den vollen Satz mit Zitadels eingebautem Text (und
// antwortet nicht immer), sonst würde dieser unsere Änderungen in der Datei überdecken.
export function mergeMessages({ fallback, locale, custom }: { fallback: Messages; locale: Messages; custom: Messages }) {
  return deepmerge.all([fallback, custom, locale]) as Record<string, string>;
}
