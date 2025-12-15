import { Stat } from 'obsidian';
import { Item } from 'src/components/types';

export interface FileAccessor {
  isEmbed: boolean;
  target: string;
  stats?: Stat;
}

export function markRangeForDeletion(str: string, range: { start: number; end: number }): string {
  const len = str.length;

  let start = range.start;
  while (start > 0 && str[start - 1] === ' ') start--;

  let end = range.end;
  while (end < len - 1 && str[end + 1] === ' ') end++;

  return str.slice(0, start) + '\u0000'.repeat(end - start) + str.slice(end);
}

export function executeDeletion(str: string) {
  return str.replace(/ *\0+ */g, ' ').trim();
}

export function replaceNewLines(str: string) {
  return str.trim().replace(/(?:\r\n|\n)/g, '<br>');
}

export function replaceBrs(str: string) {
  return str.replace(/<br>/g, '\n').trim();
}

export function indentNewLines(str: string) {
  const useTab = (app.vault as any).getConfig('useTab');
  return str.trim().replace(/(?:\r\n|\n)/g, useTab ? '\n\t' : '\n    ');
}

export function addBlockId(str: string, item: Item) {
  if (!item.data.blockId) return str;

  const lines = str.split(/(?:\r\n|\n)/g);
  lines[0] += ' ^' + item.data.blockId;

  return lines.join('\n');
}

export function addItemMetadata(str: string, item: Item) {
  const itemMetadata = item.data.metadata.itemMetadata;
  if (!itemMetadata || Object.keys(itemMetadata).length === 0) {
    return str;
  }

  // 移除可能已存在的元数据注释
  // 使用非贪婪匹配，匹配从 kanban-item-metadata: 到 --> 之间的所有内容
  const cleanedStr = str.replace(/<!--\s*kanban-item-metadata:\s*[^]*?\s*-->/g, '').trim();

  // 将元数据注释追加到内容的最后一行
  // 每个属性-值单独一行记录
  const lines = cleanedStr.split(/(?:\r\n|\n)/g);

  // 格式化元数据，每个属性-值单独一行
  const metadataLines: string[] = [];
  Object.entries(itemMetadata).forEach(([key, value]) => {
    metadataLines.push(`<!-- kanban-item-metadata: ${JSON.stringify({ [key]: value })} -->`);
  });

  if (lines.length > 0) {
    // 获取最后一行，追加第一个元数据注释
    const lastLine = lines[lines.length - 1];
    // 检查最后一行是否有缩进（tab或4个空格）
    const indentMatch = lastLine.match(/^(\s*)/);
    let indent = indentMatch ? indentMatch[1] : '';

    // 如果最后一行没有缩进，但内容有多行，需要添加缩进以保持在列表项内
    // 检查是否有其他行有缩进，如果有，使用相同的缩进格式
    if (!indent && lines.length > 1) {
      for (let i = 1; i < lines.length; i++) {
        const lineIndentMatch = lines[i].match(/^(\s*)/);
        if (lineIndentMatch && lineIndentMatch[1]) {
          indent = lineIndentMatch[1];
          break;
        }
      }
      // 如果其他行也没有缩进，使用默认缩进（4个空格或tab）
      if (!indent) {
        const useTab = (app.vault as any).getConfig('useTab');
        indent = useTab ? '\t' : '    ';
      }
    }

    // 将第一个元数据注释追加到最后一行
    lines[lines.length - 1] = lastLine + '\n' + indent + metadataLines[0];

    // 如果有多个属性，将剩余的追加到后续行
    for (let i = 1; i < metadataLines.length; i++) {
      lines.push(indent + metadataLines[i]);
    }

    return lines.join('\n');
  }

  // 如果内容为空，直接返回元数据注释
  return metadataLines.join('\n');
}

export function removeBlockId(str: string) {
  const lines = str.split(/(?:\r\n|\n)/g);

  lines[0] = lines[0].replace(/\s+\^([a-zA-Z0-9-]+)$/, '');

  return lines.join('\n');
}

export function dedentNewLines(str: string) {
  return str.trim().replace(/(?:\r\n|\n)(?: {4}|\t)/g, '\n');
}

export function parseLaneTitle(str: string) {
  str = replaceBrs(str);

  const match = str.match(/^(.*?)\s*\((\d+)\)$/);
  if (match == null) return { title: str, maxItems: 0 };

  return { title: match[1], maxItems: Number(match[2]) };
}
