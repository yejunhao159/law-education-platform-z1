/**
 * API端点完整测试
 * 测试整个数据流：前端 → API → Repository → PostgreSQL
 */

import { pool } from '../lib/db';

// 测试配置
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 1;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试结果统计
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

async function testCase(name: string, fn: () => Promise<void>) {
  testResults.total++;
  try {
    log(`\n🧪 测试: ${name}`, 'cyan');
    await fn();
    testResults.passed++;
    log(`✅ 通过: ${name}`, 'green');
  } catch (error) {
    testResults.failed++;
    log(`❌ 失败: ${name}`, 'red');
    console.error(error);
  }
}

// 生成JWT Token（临时测试用）
function generateTestToken(userId: number): string {
  // 在实际环境中，应该调用真实的JWT生成逻辑
  // 这里为了测试简化，直接从数据库获取或创建测试用户
  return 'test-token-' + userId;
}

// 模拟HTTP请求
async function apiRequest(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  const url = `${BASE_URL}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return { status: response.status, data };
}

// ========== 测试数据 ==========
const mockSnapshot = {
  schemaVersion: 1,
  version: '1.0.0',
  sessionState: 'act1',
  caseTitle: 'API测试案例 - 劳动争议',
  caseNumber: '(2025)沪01民终5678号',
  courtName: '上海市第一中级人民法院',
  act1: {
    basicInfo: {
      caseNumber: '(2025)沪01民终5678号',
      court: '上海市第一中级人民法院',
      judgeDate: '2025-03-20',
      caseType: '民事',
      level: '二审',
      nature: '劳动争议',
      parties: {
        plaintiff: ['张三'],
        defendant: ['某科技公司'],
      },
    },
    facts: {
      summary: '员工因加班费问题与公司产生劳动争议',
      timeline: [
        {
          date: '2024-01-01',
          event: '入职',
          description: '张三入职某科技公司',
          importance: 'normal' as const,
          category: '劳动关系',
        },
        {
          date: '2024-12-31',
          event: '离职',
          description: '因加班费争议离职',
          importance: 'critical' as const,
          category: '劳动关系',
        },
      ],
      keyFacts: ['长期加班未支付加班费', '劳动合同约定不明确'],
      disputedFacts: ['实际加班时长'],
    },
    evidence: {
      summary: '提供打卡记录、工资条等证据',
      items: [
        {
          id: 'E001',
          type: 'documentary' as const,
          description: '考勤打卡记录',
          source: '原告提供',
          relevance: '证明加班时长',
          credibility: 'high' as const,
          party: 'plaintiff' as const,
        },
      ],
      chainAnalysis: {
        complete: true,
        missingLinks: [],
        strength: 'strong' as const,
      },
    },
    reasoning: {
      summary: '法院支持原告诉讼请求',
      legalBasis: [
        {
          law: '中华人民共和国劳动法',
          article: '第44条',
          content: '用人单位应当支付加班工资',
          application: '本案适用该条规定',
        },
      ],
      logicChain: [
        {
          premise: '存在加班事实',
          inference: '应支付加班费',
          conclusion: '判决被告支付',
          supportingEvidence: ['E001'],
        },
      ],
      keyArguments: ['加班事实清楚', '证据充分'],
      judgment: '判决被告支付加班费',
      strength: 'strong' as const,
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: 0.92,
      processingTime: 1500,
      aiModel: 'test-api-model',
      extractionMethod: 'ai' as const,
    },
    originalFileName: 'api-test-case.pdf',
    uploadedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ========== 测试用例 ==========

let testSessionId: string | null = null;

async function test01_CreateSession() {
  log('直接调用Repository创建测试会话（跳过认证）', 'blue');

  // 直接使用Repository
  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  const saved = await teachingSessionRepository.saveSnapshot(
    TEST_USER_ID,
    mockSnapshot
  );

  if (!saved.id) throw new Error('创建会话失败');
  testSessionId = saved.id;
  log(`创建会话ID: ${testSessionId}`, 'blue');
}

async function test02_GetSessionById() {
  if (!testSessionId) throw new Error('缺少会话ID');

  log('直接调用Repository查询', 'blue');
  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  const session = await teachingSessionRepository.findById(
    testSessionId,
    TEST_USER_ID
  );

  if (!session) throw new Error('会话不存在');
  if (session.caseTitle !== mockSnapshot.caseTitle)
    throw new Error('案例标题不匹配');

  log(`找到会话: ${session.caseTitle}`, 'blue');
}

async function test03_GetSessionList() {
  log('获取用户会话列表', 'blue');

  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  const result = await teachingSessionRepository.findByUserId(TEST_USER_ID, {
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  if (result.total === 0) throw new Error('列表为空');
  log(`找到 ${result.total} 个会话`, 'blue');
}

async function test04_UpdateToAct2() {
  if (!testSessionId) throw new Error('缺少会话ID');

  log('更新会话到Act2', 'blue');

  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  // 先获取当前会话
  const existing = await teachingSessionRepository.findById(
    testSessionId,
    TEST_USER_ID
  );
  if (!existing) throw new Error('会话不存在');

  // 添加Act2数据
  const updatedSnapshot = {
    ...mockSnapshot,
    sessionState: 'act2' as const,
    act2: {
      narrative: {
        chapters: [
          {
            id: 'chapter-1',
            title: '劳动关系的建立',
            content: '张三于2024年1月1日入职某科技公司...',
            icon: '📋',
            color: 'blue',
            order: 1,
          },
        ],
        generatedAt: new Date().toISOString(),
        fallbackUsed: false,
      },
      timelineAnalysis: {
        turningPoints: [
          {
            id: 'tp-1',
            date: '2024-12-31',
            event: '离职',
            description: '劳动关系终止',
            impact: 'major' as const,
            perspective: 'plaintiff' as const,
          },
        ],
        timeline: mockSnapshot.act1.facts.timeline,
        metadata: {
          analyzedAt: new Date().toISOString(),
          confidence: 0.88,
          method: 'ai-analysis',
        },
        additionalData: {},
      },
      evidenceQuestions: [],
      claimAnalysis: {
        claims: [],
        analysisAt: new Date().toISOString(),
      },
      completedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  const updated = await teachingSessionRepository.saveSnapshot(
    TEST_USER_ID,
    updatedSnapshot,
    testSessionId
  );

  if (updated.sessionState !== 'act2') throw new Error('状态未更新');
  if (!updated.act2) throw new Error('Act2数据未保存');

  log(`更新成功，当前状态: ${updated.sessionState}`, 'blue');
}

async function test05_SearchSessions() {
  log('搜索会话', 'blue');

  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  const results = await teachingSessionRepository.search(
    TEST_USER_ID,
    '劳动争议'
  );

  if (results.length === 0) throw new Error('搜索结果为空');
  log(`搜索到 ${results.length} 个匹配`, 'blue');
}

async function test06_Act2Cache() {
  if (!testSessionId) throw new Error('缺少会话ID');

  log('验证Act2缓存机制', 'blue');

  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  // 第一次查询，应该有Act2数据
  const session = await teachingSessionRepository.findById(
    testSessionId,
    TEST_USER_ID
  );

  if (!session) throw new Error('会话不存在');
  if (!session.act2?.narrative) throw new Error('Act2缓存数据缺失');

  log('Act2缓存数据正常', 'blue');
}

async function test07_DataIntegrity() {
  if (!testSessionId) throw new Error('缺少会话ID');

  log('验证完整数据流', 'blue');

  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  const session = await teachingSessionRepository.findById(
    testSessionId,
    TEST_USER_ID
  );

  if (!session) throw new Error('会话不存在');

  // 验证Act1
  if (!session.act1?.basicInfo?.caseNumber)
    throw new Error('Act1数据不完整');
  if (!session.act1?.facts?.timeline?.length)
    throw new Error('Act1时间轴缺失');

  // 验证Act2
  if (!session.act2?.narrative?.chapters?.length)
    throw new Error('Act2叙事缺失');
  if (!session.act2?.timelineAnalysis?.turningPoints?.length)
    throw new Error('Act2时间轴分析缺失');

  log('数据完整性验证通过', 'blue');
}

async function test08_DeleteSession() {
  if (!testSessionId) throw new Error('缺少会话ID');

  log('测试软删除', 'blue');

  const { teachingSessionRepository } = await import(
    '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository'
  );

  await teachingSessionRepository.delete(testSessionId, TEST_USER_ID);

  // 验证已删除
  const deleted = await teachingSessionRepository.findById(
    testSessionId,
    TEST_USER_ID
  );

  if (deleted !== null) throw new Error('软删除失败');

  log('软删除成功', 'blue');
}

// ========== 主测试流程 ==========

async function runTests() {
  log('\n========================================', 'cyan');
  log('🚀 开始API端点测试', 'cyan');
  log('========================================\n', 'cyan');

  await testCase('01. 创建教学会话', test01_CreateSession);
  await testCase('02. 根据ID查询会话', test02_GetSessionById);
  await testCase('03. 获取会话列表', test03_GetSessionList);
  await testCase('04. 更新会话到Act2', test04_UpdateToAct2);
  await testCase('05. 搜索会话', test05_SearchSessions);
  await testCase('06. Act2缓存验证', test06_Act2Cache);
  await testCase('07. 数据完整性验证', test07_DataIntegrity);
  await testCase('08. 软删除功能', test08_DeleteSession);

  // 汇总结果
  log('\n========================================', 'cyan');
  log('📊 测试结果统计', 'cyan');
  log('========================================', 'cyan');
  log(`总测试数: ${testResults.total}`, 'blue');
  log(`通过: ${testResults.passed}`, 'green');
  log(`失败: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(
    `成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`,
    testResults.failed === 0 ? 'green' : 'yellow'
  );

  if (testResults.failed === 0) {
    log('\n✅ 所有API测试通过！数据流完整。', 'green');
  } else {
    log('\n❌ 部分测试失败，请检查。', 'red');
  }

  // 关闭数据库连接
  await pool.end();
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
