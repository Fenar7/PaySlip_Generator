export type PdfTextToken = {
  text: string;
  x: number;
  y: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
};

export type PdfTextCell = {
  text: string;
  x: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
};

export type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  cells: PdfTextCell[];
};

export type PdfLayoutBlock =
  | { kind: "paragraphs"; lines: PdfTextLine[] }
  | { kind: "table"; rows: string[][] };

function joinTokenText(parts: Array<{ text: string; x: number; width: number; fontSize: number }>) {
  return parts.reduce((joined, part, index) => {
    if (index === 0) {
      return part.text;
    }

    const previous = parts[index - 1];
    const gap = Math.max(0, part.x - (previous.x + previous.width));
    const needsSpace = gap > Math.max(1.5, Math.min(previous.fontSize, part.fontSize) * 0.2);
    return `${joined}${needsSpace ? " " : ""}${part.text}`;
  }, "");
}

function buildLineCells(tokens: PdfTextToken[]) {
  const sortedTokens = [...tokens].sort((left, right) => left.x - right.x);
  const cells: PdfTextCell[] = [];

  for (const token of sortedTokens) {
    const previous = cells.at(-1);
    const gap =
      previous == null
        ? 0
        : token.x - (previous.x + previous.width);
    const startsNewCell =
      previous == null || gap > Math.max(36, Math.max(previous.fontSize, token.fontSize) * 2.5);

    if (startsNewCell) {
      cells.push({
        text: token.text,
        x: token.x,
        top: token.top,
        width: token.width,
        height: token.height,
        fontSize: token.fontSize,
      });
      continue;
    }

    previous.text = joinTokenText([
      { text: previous.text, x: previous.x, width: previous.width, fontSize: previous.fontSize },
      { text: token.text, x: token.x, width: token.width, fontSize: token.fontSize },
    ]);
    previous.width = Math.max(previous.width, token.x + token.width - previous.x);
    previous.height = Math.max(previous.height, token.height);
    previous.fontSize = Math.max(previous.fontSize, token.fontSize);
  }

  return cells;
}

export function groupPdfTextTokensIntoLines(tokens: PdfTextToken[]) {
  const sortedTokens = [...tokens]
    .filter((token) => token.text.trim().length > 0)
    .sort((left, right) => {
      if (Math.abs(right.y - left.y) > 1) {
        return right.y - left.y;
      }
      return left.x - right.x;
    });

  const lineGroups: Array<{ y: number; tokens: PdfTextToken[] }> = [];

  for (const token of sortedTokens) {
    const previous = lineGroups.at(-1);
    const tolerance = Math.max(4, token.fontSize * 0.6);
    if (previous && Math.abs(previous.y - token.y) <= tolerance) {
      previous.tokens.push(token);
      previous.y = (previous.y * (previous.tokens.length - 1) + token.y) / previous.tokens.length;
      continue;
    }

    lineGroups.push({ y: token.y, tokens: [token] });
  }

  return lineGroups.map(({ tokens: lineTokens }) => {
    const sortedLineTokens = [...lineTokens].sort((left, right) => left.x - right.x);
    const cells = buildLineCells(sortedLineTokens).filter((cell) => cell.text.trim().length > 0);
    const text = cells.map((cell) => cell.text).join("    ").trim();
    const first = sortedLineTokens[0];
    const last = sortedLineTokens[sortedLineTokens.length - 1];

    return {
      text,
      x: first?.x ?? 0,
      y: lineTokens.reduce((sum, token) => sum + token.y, 0) / lineTokens.length,
      top: Math.min(...lineTokens.map((token) => token.top)),
      width:
        last == null || first == null ? 0 : Math.max(last.x + last.width - first.x, first.width),
      height: Math.max(...lineTokens.map((token) => token.height)),
      fontSize: Math.max(...lineTokens.map((token) => token.fontSize)),
      cells,
    } satisfies PdfTextLine;
  });
}

function clusterAnchors(values: number[], tolerance = 24) {
  const anchors: number[] = [];

  for (const value of [...values].sort((left, right) => left - right)) {
    const existingIndex = anchors.findIndex((anchor) => Math.abs(anchor - value) <= tolerance);
    if (existingIndex === -1) {
      anchors.push(value);
      continue;
    }

    anchors[existingIndex] = (anchors[existingIndex] + value) / 2;
  }

  return anchors.sort((left, right) => left - right);
}

function materializeTableRows(lines: PdfTextLine[]) {
  const anchors = clusterAnchors(lines.flatMap((line) => line.cells.map((cell) => cell.x)));
  if (anchors.length < 2) {
    return null;
  }

  return lines.map((line) => {
    const row = Array.from({ length: anchors.length }, () => "");

    for (const cell of line.cells) {
      const targetIndex = anchors.reduce(
        (bestIndex, anchor, index) =>
          Math.abs(anchor - cell.x) < Math.abs(anchors[bestIndex] - cell.x) ? index : bestIndex,
        0,
      );

      row[targetIndex] = row[targetIndex]
        ? `${row[targetIndex]} ${cell.text}`.trim()
        : cell.text;
    }

    return row;
  });
}

export function buildPdfLayoutBlocks(lines: PdfTextLine[]) {
  const blocks: PdfLayoutBlock[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor];
    const looksTabular = line.cells.length >= 2;

    if (!looksTabular) {
      const paragraphLines: PdfTextLine[] = [];
      while (cursor < lines.length && lines[cursor].cells.length < 2) {
        paragraphLines.push(lines[cursor]);
        cursor += 1;
      }
      if (paragraphLines.length > 0) {
        blocks.push({ kind: "paragraphs", lines: paragraphLines });
      }
      continue;
    }

    const tableLines: PdfTextLine[] = [];
    while (cursor < lines.length && lines[cursor].cells.length >= 2) {
      tableLines.push(lines[cursor]);
      cursor += 1;
    }

    const rows = materializeTableRows(tableLines);
    if (rows) {
      blocks.push({ kind: "table", rows });
    } else {
      blocks.push({ kind: "paragraphs", lines: tableLines });
    }
  }

  return blocks;
}

export function buildWorksheetRowsFromBlocks(blocks: PdfLayoutBlock[]) {
  const rows: string[][] = [];

  for (const block of blocks) {
    if (block.kind === "table") {
      rows.push(...block.rows);
    } else {
      rows.push(...block.lines.map((line) => [line.text]));
    }
    rows.push([""]);
  }

  while (rows.length > 0 && rows.at(-1)?.every((value) => value.length === 0)) {
    rows.pop();
  }

  return rows;
}
