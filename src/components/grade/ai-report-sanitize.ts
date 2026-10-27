/** Strips thought tags / markdown noise from AI report text. */
export function sanitizeAIOutputLite(raw: string): string {
  return raw
    .replace(/<thought_process>[\s\S]*?<\/thought_process>/gi, "")
    .replace(/<\/?[a-z_]+>/gi, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}
