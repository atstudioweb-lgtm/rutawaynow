export function extractJson(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const jsonMatch = content.match(/{[\s\S]*}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return trimmed;
}
