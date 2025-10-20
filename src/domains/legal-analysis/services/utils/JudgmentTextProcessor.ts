/**
 * 判决书文本预处理与分段工具
 * 目标：
 * 1. 标准化原始文本，清理排版噪音
 * 2. 基于常见标题/关键词识别判决书关键段落
 * 3. 为后续 AI 提取提供更稳定的结构化上下文
 */

export type JudgmentSection =
  | 'header'
  | 'parties'
  | 'claims'
  | 'trial'
  | 'facts'
  | 'arguments'
  | 'evidence'
  | 'reasoning'
  | 'judgment'
  | 'ending';

export interface ProcessedJudgmentText {
  normalized: string;
  sections: Partial<Record<JudgmentSection, string>>;
  /**
   * 原始文本长度及清洗后的统计信息
   * 便于日志记录与后续调试
   */
  stats: {
    originalLength: number;
    normalizedLength: number;
    sectionCount: number;
  };
}

/**
 * 主入口：标准化文本并识别关键段落
 */
export function processJudgmentText(rawText: string): ProcessedJudgmentText {
  const normalized = normalizeText(rawText);
  const sections = detectSections(normalized);
  const sectionValues = Object.values(sections).filter(Boolean);

  return {
    normalized,
    sections,
    stats: {
      originalLength: rawText.length,
      normalizedLength: normalized.length,
      sectionCount: sectionValues.length,
    },
  };
}

/**
 * 规范化判决书文本：
 * - 统一换行/空格
 * - 去除页眉页脚常见噪声
 * - 合并被人为拆分的中文标题（如“民 事 判 决 书”）
 */
function normalizeText(raw: string): string {
  let text = raw;

  // 统一换行符，替换全角空格、制表符
  text = text.replace(/\r\n/g, '\n').replace(/\u3000/g, ' ').replace(/\t/g, ' ');

  // 移除页眉/页脚类信息（如“第1页/共10页”“—— 2 ——”）
  text = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^第\s*[\d一二三四五六七八九十百千万]+\s*[页頁]$/u.test(trimmed)) return false;
      if (/^——+\s*\d+\s*——+$/u.test(trimmed)) return false;
      if (/^Page\s+\d+$/i.test(trimmed)) return false;
      return true;
    })
    .join('\n');

  // 合并中文字符之间的多余空格（例如“民 事 判 决 书”）
  text = text.replace(/(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/gu, '');

  // 压缩连续空格，但保留换行
  text = text.replace(/ {2,}/g, ' ');

  // 拆分行，修剪前后空白，同时最多保留一个空行用于分段
  const normalizedLines: string[] = [];
  let previousBlank = false;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      if (!previousBlank) {
        normalizedLines.push('');
        previousBlank = true;
      }
      continue;
    }

    normalizedLines.push(trimmed);
    previousBlank = false;
  }

  return normalizedLines.join('\n').trim();
}

/**
 * 基于常见标题关键字识别各段落起点
 */
function detectSections(normalized: string): Partial<Record<JudgmentSection, string>> {
  const lines = normalized.split('\n');

  type SectionPattern = {
    label: JudgmentSection;
    patterns: RegExp[];
  };

  const sectionDefinitions: SectionPattern[] = [
    {
      label: 'parties',
      patterns: [
        /^(?:上诉人|被上诉人|原告|被告|第三人|申请人|被申请人|申请执行人|被执行人)/,
        /^法定代表人[:：]/,
      ],
    },
    {
      label: 'claims',
      patterns: [
        /^(?:上诉人|被上诉人).*(请求|诉讼请求|上诉请求|主张)/,
        /^(?:原告|被告).*?(请求|诉称|主张)/,
        /^诉讼请求[:：]/,
      ],
    },
    {
      label: 'trial',
      patterns: [
        /^本案立案后/,
        /^本院立案后/,
        /^依法组成合议庭/,
        /^本案现已审理终结/,
        /^依照法定程序/,
      ],
    },
    {
      label: 'facts',
      patterns: [
        /^经审理查明/,
        /^本院查明/,
        /^查明/,
        /^经查明/,
        /^一审法院认定的事实/,
      ],
    },
    {
      label: 'arguments',
      patterns: [
        /^(?:上诉人|被上诉人).*(理由|辩称|抗辩|答辩)/,
        /^上诉理由[:：]/,
        /^被上诉人辩称/,
        /^原审被告辩称/,
      ],
    },
    {
      label: 'evidence',
      patterns: [
        /^证据[:：]/,
        /^证据一[:：]/,
        /^证据二[:：]/,
        /^质证意见/,
        /^经质证/,
      ],
    },
    {
      label: 'reasoning',
      patterns: [
        /^本院认为/,
        /^经本院审理认为/,
        /^本院审理后认为/,
        /^合议庭认为/,
      ],
    },
    {
      label: 'judgment',
      patterns: [
        /^判决如下/,
        /^裁定如下/,
        /^决定如下/,
        /^综上所述，根据.*判决如下/,
      ],
    },
    {
      label: 'ending',
      patterns: [
        /^本判决为终审判决/,
        /^本裁定为终审裁定/,
        /^审判长/,
        /^审判员/,
        /^人民陪审员/,
        /^书记员/,
        /^\d{4}年\d{1,2}月\d{1,2}日$/,
      ],
    },
  ];

  const sectionStartIndex: Partial<Record<JudgmentSection, number>> = {
    header: 0,
  };

  lines.forEach((line, index) => {
    for (const { label, patterns } of sectionDefinitions) {
      if (sectionStartIndex[label] !== undefined) continue;
      if (patterns.some((pattern) => pattern.test(line))) {
        sectionStartIndex[label] = index;
        break;
      }
    }
  });

  const orderedLabels: JudgmentSection[] = [
    'header',
    'parties',
    'claims',
    'trial',
    'facts',
    'arguments',
    'evidence',
    'reasoning',
    'judgment',
    'ending',
  ];

  const sections: Partial<Record<JudgmentSection, string>> = {};

  for (let i = 0; i < orderedLabels.length; i++) {
    const label = orderedLabels[i];
    const start = sectionStartIndex[label];
    if (start === undefined) continue;

    let end = lines.length;
    for (let j = i + 1; j < orderedLabels.length; j++) {
      const nextLabel = orderedLabels[j];
      const nextIndex = sectionStartIndex[nextLabel];
      if (nextIndex !== undefined && nextIndex > start) {
        end = nextIndex;
        break;
      }
    }

    const chunk = lines.slice(start, end).join('\n').trim();
    if (chunk) {
      sections[label] = chunk;
    }
  }

  return sections;
}
