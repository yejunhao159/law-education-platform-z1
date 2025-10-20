import type { ProcessedJudgmentText } from '../utils/JudgmentTextProcessor';

export interface RuleBasicInfo {
  caseNumber?: string;
  court?: string;
  judgeDate?: string;
  judges: string[];
  clerk?: string;
  parties: {
    plaintiff: string[];
    defendant: string[];
    thirdParty: string[];
  };
  coverage: number;
  matchedSegments: Record<string, string>;
}

const CASE_NUMBER_REGEX = /（\d{4}）[\u4e00-\u9fa5\d（）()\-－—]+?号/;
const COURT_REGEX = /[\u4e00-\u9fa5]+人民法院/;
const DATE_REGEX = /(\d{4})年(\d{1,2})月(\d{1,2})日/;

/**
 * 使用简单规则解析判决书基础信息，作为AI补全的参考
 */
export function extractRuleBasicInfo(processed: ProcessedJudgmentText): RuleBasicInfo {
  const { normalized, sections } = processed;
  const lines = normalized.split('\n');

  const header = sections.header ?? lines.slice(0, 10).join('\n');
  const ending = sections.ending ?? lines.slice(-12).join('\n');
  const partiesSection = sections.parties ?? '';

  const caseNumberMatch = header.match(CASE_NUMBER_REGEX);
  const courtMatch = header.match(COURT_REGEX);
  const dateMatch = ending.match(DATE_REGEX);

  const judges = extractLinesByPrefix(ending, ['审判长', '审判员', '人民陪审员'])
    .map(line => line.replace(/^[\u4e00-\u9fa5（）()]+[:：]?\s*/, '').trim())
    .filter(Boolean);

  const clerkLine = extractLinesByPrefix(ending, ['书记员']).shift();
  const clerk = clerkLine ? clerkLine.replace(/^[\u4e00-\u9fa5（）()]+[:：]?\s*/, '').trim() : undefined;

  const parties = extractParties(partiesSection || header);

  const filledFields = [
    Boolean(caseNumberMatch),
    Boolean(courtMatch),
    Boolean(dateMatch),
    judges.length > 0,
    Boolean(clerk),
    parties.plaintiff.length > 0,
    parties.defendant.length > 0,
  ].reduce((count, current) => count + (current ? 1 : 0), 0);

  const coverage = Math.round((filledFields / 7) * 100);

  return {
    caseNumber: caseNumberMatch?.[0],
    court: courtMatch?.[0],
    judgeDate: dateMatch ? `${dateMatch[1]}-${pad(dateMatch[2])}-${pad(dateMatch[3])}` : undefined,
    judges,
    clerk,
    parties,
    coverage,
    matchedSegments: {
      header,
      ending,
      parties: partiesSection,
    },
  };
}

function pad(value: string): string {
  return value.length === 1 ? `0${value}` : value;
}

function extractLinesByPrefix(text: string, prefixes: string[]): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => prefixes.some(prefix => line.startsWith(prefix)));
}

function extractParties(partiesSection: string): RuleBasicInfo['parties'] {
  const partyLines = partiesSection.split('\n').map(line => line.trim());
  const plaintiff: string[] = [];
  const defendant: string[] = [];
  const thirdParty: string[] = [];

  partyLines.forEach(line => {
    if (!line) return;

    if (/^原告[:：]/.test(line)) {
      plaintiff.push(...splitNames(line.replace(/^原告[:：]/, '')));
      return;
    }

    if (/^上诉人[:：]/.test(line) || /^申请人[:：]/.test(line)) {
      plaintiff.push(...splitNames(line.replace(/^[\u4e0a\u7533][诉请]人[:：]/, '')));
      return;
    }

    if (/^被告[:：]/.test(line)) {
      defendant.push(...splitNames(line.replace(/^被告[:：]/, '')));
      return;
    }

    if (/^被上诉人[:：]/.test(line) || /^被申请人[:：]/.test(line)) {
      defendant.push(...splitNames(line.replace(/^被[\u4e0a\u7533][诉请]人[:：]/, '')));
      return;
    }

    if (/^第三人[:：]/.test(line)) {
      thirdParty.push(...splitNames(line.replace(/^第三人[:：]/, '')));
      return;
    }
  });

  return {
    plaintiff: Array.from(new Set(plaintiff)).filter(Boolean),
    defendant: Array.from(new Set(defendant)).filter(Boolean),
    thirdParty: Array.from(new Set(thirdParty)).filter(Boolean),
  };
}

function splitNames(segment: string): string[] {
  return segment
    .split(/[、，,；;、\s]+/)
    .map(name => name.replace(/（.*?）/g, '').trim())
    .filter(Boolean);
}
