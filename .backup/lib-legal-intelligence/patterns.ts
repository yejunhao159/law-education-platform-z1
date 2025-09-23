/**
 * Legal Pattern Database
 * 法律文档模式数据库 - 用于规则提取的核心模式集合
 */

/**
 * 日期模式
 */
export const DATE_PATTERNS = {
  // 标准日期格式
  STANDARD_DATE: /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日号]?/g,
  
  // 中文日期
  CHINESE_DATE: /([一二三四五六七八九十〇○零]+年[正一二三四五六七八九十冬腊腊月]+月[一二三四五六七八九十廿卅]+[日号])/g,
  
  // 相对日期
  RELATIVE_DATE: /(当日|次日|当月|次月|当年|次年|同日|即日)/g,
  
  // 期限表达
  DEADLINE: /(?:自|从|于)(.+?)(?:起|开始)(?:至|到|止于)(.+?)(?:止|为止|结束)/g,
  
  // 时效期限
  LIMITATION: /(\d+)[个]?(日|天|周|月|年)(?:内|之内|以内)/g,
  
  // 具体时间点
  TIME_POINT: /(\d{1,2})[:时点](\d{1,2})分?/g,
  
  // 节假日
  HOLIDAY: /(春节|元旦|清明|端午|中秋|国庆|劳动节|儿童节|妇女节|教师节)/g,
}

/**
 * 当事人模式
 */
export const PARTY_PATTERNS = {
  // 原告 - 支持多种格式
  PLAINTIFF: /原告[：:：]?\s*([^，。,\s]+)(?:\s|[，,。、]|诉|与|$)/g,
  
  // 被告 - 支持多种格式和结尾
  DEFENDANT: /被告[：:：]?\s*([^，。,\s]+)(?:\s|[，,。、]|辩|与|$)/g,
  
  // 第三人
  THIRD_PARTY: /第三人[：:]?\s*([^，。,\s]+?)(?:[，,。])/g,
  
  // 法定代表人
  LEGAL_REP: /法定代表人[：:]?\s*([^，。,\s]+?)(?:[，,。])/g,
  
  // 委托代理人
  AGENT: /委托(?:诉讼)?代理人[：:]?\s*([^，。,\s]+?)(?:[，,。])/g,
  
  // 公司名称
  COMPANY: /([\u4e00-\u9fa5]+(?:有限|股份|集团|实业|科技|贸易|投资|咨询|服务|发展|建设|工程|物业|地产|文化|传媒|网络|信息|技术|电子|商务|管理)+(?:有限)?(?:责任)?公司)/g,
  
  // 自然人姓名（2-4字中文名）
  PERSON_NAME: /(?:某|张|王|李|赵|刘|陈|杨|黄|吴|周|徐|孙|马|朱|胡|郭|何|高|林|罗|郑|梁)[\u4e00-\u9fa5]{1,3}/g,
  
  // 身份证号（部分隐藏）
  ID_NUMBER: /\d{6}[\*X]+\d{2,4}/g,
  
  // 律师事务所
  LAW_FIRM: /([\u4e00-\u9fa5]+律师事务所)/g,
}

/**
 * 金额模式
 */
export const AMOUNT_PATTERNS = {
  // 数字金额
  NUMERIC: /([0-9,，]+\.?\d*)\s*(?:元|圆|万元|亿元|美元|欧元)/g,
  
  // 中文数字金额
  CHINESE: /((?:[一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟萬億]+)+)\s*(?:元|圆|万元|亿元)/g,
  
  // 百分比
  PERCENTAGE: /(\d+(?:\.\d+)?)[%％]/g,
  
  // 利率
  INTEREST_RATE: /(?:年|月|日)(?:利率|息)[为是]?(\d+(?:\.\d+)?)[%％%]?/g,
  
  // 违约金
  PENALTY: /违约金\s*(?:为|计)?\s*([0-9,，]+\.?\d*)\s*(?:元|圆)/g,
  
  // 赔偿金
  COMPENSATION: /赔偿(?:金额?|款|损失)?\s*(?:为|计|共)?\s*([0-9,，]+\.?\d*)\s*(?:元|圆)/g,
  
  // 价格区间
  PRICE_RANGE: /([0-9,，]+\.?\d*)\s*(?:元|圆).{0,5}至.{0,5}([0-9,，]+\.?\d*)\s*(?:元|圆)/g,
}

/**
 * 法律条款模式
 */
export const LEGAL_CLAUSE_PATTERNS = {
  // 法律引用
  LAW_REFERENCE: /《([\u4e00-\u9fa5]+?)》/g,
  
  // 具体条款 - 支持中文和阿拉伯数字
  ARTICLE: /第?([一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟萬億\d]+)[条款项]?/g,
  
  // 法律全称
  FULL_LAW: /《中华人民共和国([\u4e00-\u9fa5]+法)》/g,
  
  // 司法解释
  JUDICIAL_INTERPRETATION: /(?:最高人民法院|最高人民检察院)(?:关于|对于)([\u4e00-\u9fa5]+)的?(?:解释|规定|批复|答复|通知)/g,
  
  // 地方法规
  LOCAL_REGULATION: /([\u4e00-\u9fa5]{2,}(?:省|市|自治区|特别行政区)[\u4e00-\u9fa5]+(?:条例|办法|规定))/g,
  
  // 合同条款
  CONTRACT_CLAUSE: /(?:根据|依据|按照)(?:合同|协议)第([一二三四五六七八九十\d]+)[条款项]/g,
}

/**
 * 法院和案号模式
 */
export const COURT_PATTERNS = {
  // 法院名称
  COURT_NAME: /([\u4e00-\u9fa5]+(?:最高|高级|中级|基层)?人民法院)/g,
  
  // 案号格式
  CASE_NUMBER: /[\(（]\d{4}[\)）][\u4e00-\u9fa5]{1,4}\d{1,5}(?:民初|民终|民申|民再|刑初|刑终|行初|行终|执|破)?第?\d{1,10}号/g,
  
  // 简化案号
  SIMPLE_CASE_NUMBER: /\d{4}[年]?\w+\d+号/g,
  
  // 审级
  TRIAL_LEVEL: /(一审|二审|再审|重审|终审)/g,
}

/**
 * 证据模式
 */
export const EVIDENCE_PATTERNS = {
  // 证据类型
  EVIDENCE_TYPE: /(书证|物证|证人证言|鉴定意见|勘验笔录|视听资料|电子数据|当事人陈述)/g,
  
  // 证据编号
  EVIDENCE_NUMBER: /证据[一二三四五六七八九十\d]+[：:]/g,
  
  // 公证
  NOTARIZATION: /(?:经|已)公证的?([\u4e00-\u9fa5]+)/g,
  
  // 鉴定
  APPRAISAL: /([\u4e00-\u9fa5]+鉴定(?:中心|机构|所))/g,
}

/**
 * 诉讼请求模式
 */
export const CLAIM_PATTERNS = {
  // 诉讼请求
  LITIGATION_CLAIM: /诉讼请求[：:]?([\s\S]+?)(?:事实[与和]理由|被告|证据)/g,
  
  // 判决主文
  JUDGMENT: /判决如下[：:]?([\s\S]+?)(?:案件受理费|本判决|如不服)/g,
  
  // 请求事项
  REQUEST_ITEM: /[一二三四五六七八九十\d]+[、.．]([\u4e00-\u9fa5，。；,;]+)/g,
}

/**
 * 程序相关模式
 */
export const PROCEDURE_PATTERNS = {
  // 起诉
  FILING: /于(\d{4}年\d{1,2}月\d{1,2}日)(?:向[\u4e00-\u9fa5]+法院)?(?:提起诉讼|起诉|立案)/g,
  
  // 开庭
  HEARING: /(?:定于|于)(\d{4}年\d{1,2}月\d{1,2}日.{0,10}?时)(?:开庭|审理|开庭审理)/g,
  
  // 送达
  SERVICE: /(?:送达|送达)/g,
  
  // 上诉
  APPEAL: /(?:不服.{0,30}判决|提起上诉|上诉于)/g,
  
  // 执行
  EXECUTION: /(?:申请执行|强制执行|执行)/g,
}

/**
 * 关键词词库
 */
export const KEYWORDS = {
  // 合同相关
  CONTRACT: ['合同', '协议', '契约', '约定', '条款', '签订', '履行', '违约', '解除', '终止'],
  
  // 借贷相关
  LOAN: ['借款', '贷款', '借贷', '本金', '利息', '利率', '还款', '欠款', '债务', '债权'],
  
  // 侵权相关
  TORT: ['侵权', '损害', '赔偿', '过错', '责任', '伤害', '精神损失', '财产损失'],
  
  // 婚姻家庭
  FAMILY: ['离婚', '抚养', '赡养', '财产分割', '共同财产', '子女', '监护权'],
  
  // 劳动争议
  LABOR: ['劳动合同', '工资', '加班费', '社保', '解除劳动关系', '经济补偿金', '赔偿金'],
  
  // 知识产权
  IP: ['专利', '商标', '著作权', '版权', '商业秘密', '不正当竞争'],
  
  // 刑事
  CRIMINAL: ['犯罪', '量刑', '自首', '立功', '缓刑', '罚金', '有期徒刑'],
}

/**
 * 提取辅助函数
 */
export class PatternHelper {
  /**
   * 清理提取的文本
   */
  static cleanExtractedText(text: string): string {
    if (!text) return ''
    return text
      .replace(/[：:]\s*/g, '')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\s+/g, ' ')
  }
  
  /**
   * 转换中文数字为阿拉伯数字
   */
  static chineseToNumber(chinese: string): number {
    const map: Record<string, number> = {
      '零': 0, '〇': 0, '○': 0,
      '一': 1, '壹': 1,
      '二': 2, '贰': 2, '两': 2,
      '三': 3, '叁': 3,
      '四': 4, '肆': 4,
      '五': 5, '伍': 5,
      '六': 6, '陆': 6,
      '七': 7, '柒': 7,
      '八': 8, '捌': 8,
      '九': 9, '玖': 9,
      '十': 10, '拾': 10,
      '百': 100, '佰': 100,
      '千': 1000, '仟': 1000,
      '万': 10000, '萬': 10000,
      '亿': 100000000, '億': 100000000,
    }
    
    let result = 0
    let temp = 0
    let unit = 1
    
    for (let i = chinese.length - 1; i >= 0; i--) {
      const char = chinese[i]
      const value = map[char]
      
      if (value === undefined) continue
      
      if (value >= 10 && value !== 0) {
        unit = value
        if (temp === 0) temp = 1
        result += temp * unit
        temp = 0
      } else {
        temp = value
      }
    }
    
    return result + temp * unit
  }
  
  /**
   * 格式化日期为ISO格式
   */
  static formatDateToISO(year: string, month: string, day: string): string {
    const y = year.padStart(4, '20')
    const m = month.padStart(2, '0')
    const d = day.padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  
  /**
   * 判断案件类型
   */
  static detectCaseType(text: string): string {
    const types = {
      '民间借贷': /借款|借贷|欠款|还款|利息/,
      '合同纠纷': /合同|协议|违约|履行/,
      '劳动争议': /劳动|工资|社保|解雇/,
      '婚姻家庭': /离婚|抚养|财产分割/,
      '侵权责任': /侵权|损害|赔偿/,
      '知识产权': /专利|商标|著作权/,
    }
    
    for (const [type, pattern] of Object.entries(types)) {
      if (pattern.test(text)) {
        return type
      }
    }
    
    return '其他民事纠纷'
  }
  
  /**
   * 提取金额数值
   */
  static extractAmountValue(text: string): number {
    // 移除逗号和空格
    const cleaned = text.replace(/[,，\s]/g, '')
    
    // 尝试提取数字
    const match = cleaned.match(/(\d+(?:\.\d+)?)/)
    
    if (match) {
      const value = parseFloat(match[1])
      // 检查单位
      if (cleaned.includes('万')) return value * 10000
      if (cleaned.includes('亿')) return value * 100000000
      return value
    }
    
    // 尝试中文数字
    const chineseMatch = cleaned.match(/([\u4e00-\u9fa5]+)元/)
    if (chineseMatch) {
      return this.chineseToNumber(chineseMatch[1])
    }
    
    return 0
  }
}

/**
 * 导出所有模式
 */
export default {
  DATE_PATTERNS,
  PARTY_PATTERNS,
  AMOUNT_PATTERNS,
  LEGAL_CLAUSE_PATTERNS,
  COURT_PATTERNS,
  EVIDENCE_PATTERNS,
  CLAIM_PATTERNS,
  PROCEDURE_PATTERNS,
  KEYWORDS,
  PatternHelper
}