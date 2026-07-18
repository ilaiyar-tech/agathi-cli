export function getCharWidth(char: string): number {
  const code = char.codePointAt(0);
  if (!code) return 0;
  
  // Tamil characters block: 0x0b80 to 0x0bff
  // CJK: 0x2e80 to 0x9fff
  // Emojis: 0x1f000 to 0x1faf0
  if (
    (code >= 0x2e80 && code <= 0x9fff) || 
    (code >= 0x0c80 && code <= 0x0fff) || 
    (code >= 0x0b80 && code <= 0x0bff) || 
    (code >= 0xac00 && code <= 0xd7a3) || 
    (code >= 0xff00 && code <= 0xffef) || 
    (code >= 0x1f000 && code <= 0x1faf0)  
  ) {
    return 2;
  }
  return 1;
}

export function getStringWidth(str: string): number {
  const clean = str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
  let width = 0;
  for (const char of clean) {
    width += getCharWidth(char);
  }
  return width;
}

export class TextLayoutEngine {
  static wrapText(
    text: string,
    width: number,
    prefixWidth = 0,
    preserveIndent = true
  ): string[] {
    const lines = text.split("\n");
    const result: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        result.push(line);
        continue;
      }

      if (inCodeBlock) {
        result.push(...this.wrapRawLine(line, width, prefixWidth));
        continue;
      }

      result.push(...this.wrapNormalLine(line, width, prefixWidth, preserveIndent));
    }

    return result;
  }

  private static wrapRawLine(line: string, width: number, prefixWidth: number): string[] {
    const lines: string[] = [];
    const limit = width - prefixWidth;
    let current = line;

    while (getStringWidth(current) > limit) {
      let splitIdx = 0;
      let accumWidth = 0;
      for (let i = 0; i < current.length; i++) {
        const cw = getCharWidth(current[i]);
        if (accumWidth + cw > limit) {
          splitIdx = i;
          break;
        }
        accumWidth += cw;
      }
      if (splitIdx === 0) splitIdx = 1;
      lines.push(current.substring(0, splitIdx));
      current = current.substring(splitIdx);
    }
    lines.push(current);
    return lines;
  }

  private static wrapNormalLine(
    line: string,
    width: number,
    prefixWidth: number,
    preserveIndent: boolean
  ): string[] {
    const limit = width - prefixWidth;
    if (limit <= 4) {
      return [line];
    }

    const indentMatch = line.match(/^(\s*)/);
    const indentStr = preserveIndent && indentMatch ? indentMatch[1] : "";
    const indentWidth = getStringWidth(indentStr);
    
    const tokens = line.trim().split(/(\s+)/).filter(t => t.length > 0);
    if (tokens.length === 0) {
      return [""];
    }

    const lines: string[] = [];
    let currentLine = indentStr;
    let currentWidth = indentWidth;

    for (const token of tokens) {
      const tokenWidth = getStringWidth(token);
      
      if (tokenWidth > limit - indentWidth) {
        if (currentLine.trim().length > 0) {
          lines.push(currentLine);
          currentLine = indentStr;
          currentWidth = indentWidth;
        }
        
        const wrappedLong = this.wrapRawLine(token, width, prefixWidth + indentWidth);
        for (let i = 0; i < wrappedLong.length - 1; i++) {
          lines.push(indentStr + wrappedLong[i]);
        }
        currentLine = indentStr + wrappedLong[wrappedLong.length - 1];
        currentWidth = getStringWidth(currentLine);
        continue;
      }

      if (currentWidth + tokenWidth > limit) {
        lines.push(currentLine);
        currentLine = indentStr + (token.trim() === "" ? "" : token);
        currentWidth = getStringWidth(currentLine);
      } else {
        currentLine += token;
        currentWidth += tokenWidth;
      }
    }

    if (currentLine.trim().length > 0 || lines.length === 0) {
      lines.push(currentLine);
    }

    return lines;
  }
}
