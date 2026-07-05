export function HighlightText({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) return <>{text}</>;

  const set = new Set(indices);
  const parts: { char: string; match: boolean }[] = text.split("").map((char, i) => ({
    char,
    match: set.has(i),
  }));

  const chunks: { text: string; match: boolean }[] = [];
  for (const part of parts) {
    const last = chunks[chunks.length - 1];
    if (last && last.match === part.match) {
      last.text += part.char;
    } else {
      chunks.push({ text: part.char, match: part.match });
    }
  }

  return (
    <>
      {chunks.map((chunk, i) =>
        chunk.match ? (
          <mark key={i} className="bg-primary/25 text-primary rounded-[2px] px-0 py-0 font-semibold">
            {chunk.text}
          </mark>
        ) : (
          <span key={i}>{chunk.text}</span>
        )
      )}
    </>
  );
}
