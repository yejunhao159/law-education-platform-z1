/**
 * 法律文书智能解析器
 * 用于提取判决书的三要素：事实、法律依据、裁判理由
 */

export interface LegalDocument {
  // 基本信息
  caseNumber?: string;      // 案号
  court?: string;           // 法院
  date?: string;            // 判决日期
  parties?: {
    plaintiff?: string;     // 原告
    defendant?: string;     // 被告
  };
  
  // 三要素
  threeElements: {
    facts: {
      title: string;
      content: string;
      keywords: string[];
      timeline?: Array<{
        date: string;
        event: string;
        importance: 'critical' | 'normal';
      }>;
    };
    law: {
      title: string;
      content: string;
      keywords: string[];
      provisions?: string[];  // 法条引用
    };
    reasoning: {
      title: string;
      content: string;
      keywords: string[];
      conclusion?: string;
    };
  };
  
  // 证据链
  evidence?: Array<{
    name: string;
    type: string;
    credibility: number;
  }>;
  
  // 争议焦点
  disputes?: string[];
}

/**
 * 智能提取判决书三要素
 */
export class LegalParser {
  
  /**
   * 解析判决书文本
   */
  static parse(text: string): LegalDocument {
    return {
      ...this.extractBasicInfo(text),
      threeElements: {
        facts: this.extractFacts(text),
        law: this.extractLawBasis(text),
        reasoning: this.extractReasoning(text)
      },
      evidence: this.extractEvidence(text),
      disputes: this.extractDisputes(text)
    };
  }
  
  /**
   * 提取基本信息
   */
  private static extractBasicInfo(text: string): Partial<LegalDocument> {
    const info: Partial<LegalDocument> = {};
    
    // 提取案号 - 支持多种格式
    const caseNumberPatterns = [
      /[(（]\d{4}[）)].*?第?\d+号/,
      /\d{4}.*?民初.*?\d+号/,
      /\d{4}.*?刑初.*?\d+号/,
      /\d{4}.*?行初.*?\d+号/
    ];
    
    for (const pattern of caseNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        info.caseNumber = match[0];
        break;
      }
    }
    
    // 提取法院
    const courtMatch = text.match(/[\u4e00-\u9fa5]+人民法院/);
    if (courtMatch) {
      info.court = courtMatch[0];
    }
    
    // 提取日期
    const dateMatch = text.match(/\d{4}年\d{1,2}月\d{1,2}日/);
    if (dateMatch) {
      info.date = dateMatch[0];
    }
    
    // 提取当事人
    const parties: any = {};
    
    // 原告
    const plaintiffMatch = text.match(/原告[：:]?\s*([^，,。\s]+)/);
    if (plaintiffMatch) {
      parties.plaintiff = plaintiffMatch[1];
    }
    
    // 被告
    const defendantMatch = text.match(/被告[：:]?\s*([^，,。\s]+)/);
    if (defendantMatch) {
      parties.defendant = defendantMatch[1];
    }
    
    if (Object.keys(parties).length > 0) {
      info.parties = parties;
    }
    
    return info;
  }
  
  /**
   * 提取案件事实
   */
  private static extractFacts(text: string): LegalDocument['threeElements']['facts'] {
    const facts = {
      title: '案件事实',
      content: '',
      keywords: [] as string[],
      timeline: [] as any[]
    };
    
    // 查找事实部分的标志性段落
    const factPatterns = [
      /经审理查明[：:]([\s\S]*?)(?=本院认为|本院查明|另查明|以上事实)/,
      /本院查明[：:]([\s\S]*?)(?=本院认为|经审理查明)/,
      /原告.*?诉称[：:]([\s\S]*?)(?=被告.*?辩称)/,
      /经查[，,]([\s\S]*?)(?=本院认为|综上)/
    ];
    
    for (const pattern of factPatterns) {
      const match = text.match(pattern);
      if (match) {
        facts.content = match[1].trim().substring(0, 500);
        break;
      }
    }
    
    // 如果没有找到，尝试更宽泛的提取
    if (!facts.content) {
      const sections = text.split(/本院认为|判决如下/);
      if (sections.length > 1) {
        facts.content = sections[0].substring(Math.max(0, sections[0].length - 500));
      }
    }
    
    // 提取时间线
    const dateEvents = text.matchAll(/(\d{4}年\d{1,2}月\d{1,2}日)[，,]?(.*?)(?=[。；])/g);
    for (const match of dateEvents) {
      if (match[2] && match[2].length < 100) {
        facts.timeline.push({
          date: match[1],
          event: match[2].trim(),
          importance: this.isImportantEvent(match[2]) ? 'critical' : 'normal'
        });
      }
    }
    
    // 提取关键词
    facts.keywords = this.extractKeywords(facts.content, ['合同', '签订', '履行', '违约', '支付', '交付']);
    
    return facts;
  }
  
  /**
   * 提取法律依据
   */
  private static extractLawBasis(text: string): LegalDocument['threeElements']['law'] {
    const law = {
      title: '法律依据',
      content: '',
      keywords: [] as string[],
      provisions: [] as string[]
    };
    
    // 查找法律依据部分
    const lawPatterns = [
      /(?:依照|根据|依据)(.*?第[\d\u4e00-\u9fa5]+条.*?)(?:规定|之规定)/g,
      /《[\u4e00-\u9fa5]+》第[\d\u4e00-\u9fa5]+条/g,
      /《中华人民共和国.*?》/g
    ];
    
    const provisions = new Set<string>();
    
    for (const pattern of lawPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        provisions.add(match[0]);
      }
    }
    
    law.provisions = Array.from(provisions);
    law.content = law.provisions.join('；');
    
    // 提取法律关键词
    law.keywords = this.extractKeywords(law.content, ['民法典', '合同法', '侵权', '责任', '义务', '权利']);
    
    return law;
  }
  
  /**
   * 提取裁判理由
   */
  private static extractReasoning(text: string): LegalDocument['threeElements']['reasoning'] {
    const reasoning = {
      title: '裁判理由',
      content: '',
      keywords: [] as string[],
      conclusion: ''
    };
    
    // 查找裁判理由部分
    const reasoningPatterns = [
      /本院认为[：:]([\s\S]*?)(?=依照|根据|判决如下|综上所述)/,
      /综上所述[，,]([\s\S]*?)(?=判决如下|依照)/,
      /本院.*?认定[：:]([\s\S]*?)(?=判决如下|依照)/
    ];
    
    for (const pattern of reasoningPatterns) {
      const match = text.match(pattern);
      if (match) {
        reasoning.content = match[1].trim().substring(0, 500);
        break;
      }
    }
    
    // 提取判决结论
    const conclusionMatch = text.match(/判决如下[：:]([\s\S]*?)(?=如不服|案件受理费|$)/);
    if (conclusionMatch) {
      reasoning.conclusion = conclusionMatch[1].trim().substring(0, 300);
    }
    
    // 提取关键词
    reasoning.keywords = this.extractKeywords(reasoning.content, ['构成', '违约', '责任', '应当', '不予支持', '予以支持']);
    
    return reasoning;
  }
  
  /**
   * 提取证据
   */
  private static extractEvidence(text: string): LegalDocument['evidence'] {
    const evidence: LegalDocument['evidence'] = [];
    
    // 查找证据部分
    const evidenceSection = text.match(/(?:原告提供|被告提供|证据如下|举证|质证)([\s\S]*?)(?=本院认为|经审理)/);
    
    if (evidenceSection) {
      const evidenceText = evidenceSection[1];
      
      // 常见证据类型
      const evidenceTypes = [
        { pattern: /合同/g, type: '书证', credibility: 95 },
        { pattern: /转账凭证|银行流水/g, type: '书证', credibility: 90 },
        { pattern: /发票|收据/g, type: '书证', credibility: 85 },
        { pattern: /证人.*?证言/g, type: '证人证言', credibility: 70 },
        { pattern: /鉴定.*?意见/g, type: '鉴定意见', credibility: 85 },
        { pattern: /录音|录像/g, type: '视听资料', credibility: 75 }
      ];
      
      for (const { pattern, type, credibility } of evidenceTypes) {
        const matches = evidenceText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            evidence.push({
              name: match,
              type,
              credibility
            });
          });
        }
      }
    }
    
    return evidence.length > 0 ? evidence : undefined;
  }
  
  /**
   * 提取争议焦点
   */
  private static extractDisputes(text: string): string[] | undefined {
    const disputes: string[] = [];
    
    // 查找争议焦点
    const disputePatterns = [
      /争议焦点.*?[：:](.*?)(?=[。；])/g,
      /双方争议.*?[：:](.*?)(?=[。；])/g,
      /争点.*?[：:](.*?)(?=[。；])/g
    ];
    
    for (const pattern of disputePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          disputes.push(match[1].trim());
        }
      }
    }
    
    // 如果没有明确的争议焦点，尝试从内容推断
    if (disputes.length === 0) {
      if (text.includes('是否构成')) {
        const match = text.match(/(.*?是否构成.*?)(?=[。；])/);
        if (match) disputes.push(match[1]);
      }
      if (text.includes('能否')) {
        const match = text.match(/(.*?能否.*?)(?=[。；])/);
        if (match) disputes.push(match[1]);
      }
    }
    
    return disputes.length > 0 ? disputes : undefined;
  }
  
  /**
   * 判断是否为重要事件
   */
  private static isImportantEvent(event: string): boolean {
    const importantKeywords = ['签订', '合同', '支付', '交付', '违约', '起诉', '立案', '判决', '履行'];
    return importantKeywords.some(keyword => event.includes(keyword));
  }
  
  /**
   * 提取关键词
   */
  private static extractKeywords(text: string, candidates: string[]): string[] {
    const keywords: string[] = [];
    for (const candidate of candidates) {
      if (text.includes(candidate)) {
        keywords.push(candidate);
      }
    }
    return keywords;
  }
}

/**
 * 格式化输出解析结果
 */
export function formatLegalDocument(doc: LegalDocument): string {
  let output = '# 判决书解析结果\n\n';
  
  // 基本信息
  output += '## 基本信息\n';
  if (doc.caseNumber) output += `- 案号：${doc.caseNumber}\n`;
  if (doc.court) output += `- 法院：${doc.court}\n`;
  if (doc.date) output += `- 判决日期：${doc.date}\n`;
  if (doc.parties) {
    if (doc.parties.plaintiff) output += `- 原告：${doc.parties.plaintiff}\n`;
    if (doc.parties.defendant) output += `- 被告：${doc.parties.defendant}\n`;
  }
  
  // 三要素
  output += '\n## 三要素分析\n\n';
  
  output += `### ${doc.threeElements.facts.title}\n`;
  output += `${doc.threeElements.facts.content}\n`;
  output += `**关键词**：${doc.threeElements.facts.keywords.join('、')}\n\n`;
  
  output += `### ${doc.threeElements.law.title}\n`;
  output += `${doc.threeElements.law.content}\n`;
  output += `**关键词**：${doc.threeElements.law.keywords.join('、')}\n\n`;
  
  output += `### ${doc.threeElements.reasoning.title}\n`;
  output += `${doc.threeElements.reasoning.content}\n`;
  output += `**关键词**：${doc.threeElements.reasoning.keywords.join('、')}\n\n`;
  
  // 争议焦点
  if (doc.disputes && doc.disputes.length > 0) {
    output += '## 争议焦点\n';
    doc.disputes.forEach((dispute, index) => {
      output += `${index + 1}. ${dispute}\n`;
    });
  }
  
  return output;
}