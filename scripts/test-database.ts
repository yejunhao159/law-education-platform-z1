/**
 * 数据库完整性测试脚本
 * 测试所有数据库操作，确保可以安全部署到生产环境
 */

import { pool } from '../lib/db';
import { teachingSessionRepository } from '../src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository';
import type { TeachingSessionSnapshot } from '../src/domains/teaching-acts/repositories/TeachingSessionRepository';

// 测试用户ID（假设users表中有ID为1的用户）
const TEST_USER_ID = 1;

// 颜色输出辅助
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

// ========== 测试数据准备 ==========

const mockAct1Snapshot = {
  basicInfo: {
    caseNumber: '(2024)京01民终9999号',
    court: '北京市第一中级人民法院',
    judgeDate: '2024-01-15',
    caseType: '民事',
    level: '二审',
    nature: '合同纠纷',
    parties: {
      plaintiff: ['测试原告公司'],
      defendant: ['测试被告公司'],
    },
  },
  facts: {
    summary: '这是一个测试案例的事实摘要',
    timeline: [
      {
        date: '2023-06-01',
        event: '签订合同',
        description: '双方签订买卖合同',
        importance: 'critical' as const,
        category: '合同签订',
      },
    ],
    keyFacts: ['合同签订', '货物交付争议'],
    disputedFacts: ['交付时间争议'],
  },
  evidence: {
    summary: '双方提交了合同、发票等证据',
    items: [
      {
        id: 'E001',
        type: 'documentary' as const,
        description: '买卖合同原件',
        source: '原告提供',
        relevance: '证明合同关系成立',
        credibility: 'high' as const,
        party: 'plaintiff' as const,
      },
    ],
    chainAnalysis: {
      complete: false,
      missingLinks: ['交付凭证缺失'],
      strength: 'moderate' as const,
    },
  },
  reasoning: {
    summary: '法院认为合同有效',
    legalBasis: [
      {
        law: '中华人民共和国民法典',
        article: '第464条',
        content: '合同是民事主体之间设立、变更、终止民事法律关系的协议。',
        application: '本案合同符合法律规定',
      },
    ],
    logicChain: [
      {
        premise: '双方签订了书面合同',
        inference: '合同关系成立',
        conclusion: '双方应履行合同义务',
        supportingEvidence: ['E001'],
      },
    ],
    keyArguments: ['合同有效', '应按约履行'],
    judgment: '驳回上诉，维持原判',
    strength: 'strong' as const,
  },
  metadata: {
    extractedAt: new Date().toISOString(),
    confidence: 0.95,
    processingTime: 1200,
    aiModel: 'test-model',
    extractionMethod: 'ai' as const,
  },
  originalFileName: 'test-case.pdf',
  uploadedAt: new Date().toISOString(),
};

const mockAct2Data = {
  narrative: {
    chapters: [
      {
        id: 'chapter-1',
        title: '测试章节',
        content: '这是测试章节内容',
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
        date: '2023-06-01',
        event: '合同签订',
        description: '关键转折点',
        impact: 'major' as const,
        perspective: 'plaintiff' as const,
      },
    ],
    timeline: mockAct1Snapshot.facts.timeline,
    metadata: {
      analyzedAt: new Date().toISOString(),
      confidence: 0.9,
      method: 'ai-analysis',
    },
    additionalData: {},
  },
  evidenceQuestions: [
    {
      id: 'q1',
      evidenceId: 'E001',
      question: '该证据的证据类型是？',
      questionType: 'type' as const,
      options: ['书证', '物证', '证人证言', '鉴定意见'],
      correctAnswer: 0,
      explanation: '书证是指以文字、符号、图形等记载的内容证明案件事实的证据。',
      difficulty: 'beginner' as const,
      points: 10,
    },
  ],
  claimAnalysis: {
    claims: [
      {
        id: 'claim-1',
        type: '合同履行请求权',
        party: 'plaintiff' as const,
        status: 'supported' as const,
        basis: ['民法典第464条'],
        facts: ['合同有效', '被告未履行'],
        reasoning: '原告有权要求被告履行合同',
      },
    ],
    analysisAt: new Date().toISOString(),
  },
  completedAt: new Date().toISOString(),
};

// ========== 测试用例 ==========

async function test01_DatabaseConnection() {
  const result = await pool.query('SELECT NOW() as current_time');
  if (!result.rows[0].current_time) {
    throw new Error('数据库连接失败');
  }
  log(`数据库时间: ${result.rows[0].current_time}`, 'blue');
}

async function test02_TableExists() {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'teaching_sessions'
    ) as exists
  `);
  if (!result.rows[0].exists) {
    throw new Error('teaching_sessions表不存在');
  }
}

async function test03_SaveSnapshot() {
  const snapshot: TeachingSessionSnapshot = {
    schemaVersion: 1,
    version: '1.0.0',
    sessionState: 'act1',
    caseTitle: '测试案例 - 合同纠纷',
    caseNumber: '(2024)京01民终9999号',
    courtName: '北京市第一中级人民法院',
    act1: mockAct1Snapshot,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await teachingSessionRepository.saveSnapshot(
    TEST_USER_ID,
    snapshot
  );

  if (!saved.id) throw new Error('保存快照失败：没有返回ID');
  if (saved.caseTitle !== snapshot.caseTitle)
    throw new Error('案例标题不匹配');

  log(`已保存会话ID: ${saved.id}`, 'blue');

  // 保存到全局变量供后续测试使用
  (global as any).testSessionId = saved.id;
}

async function test04_FindById() {
  const sessionId = (global as any).testSessionId;
  if (!sessionId) throw new Error('缺少测试会话ID');

  const found = await teachingSessionRepository.findById(
    sessionId,
    TEST_USER_ID
  );
  if (!found) throw new Error('找不到会话');
  if (found.id !== sessionId) throw new Error('会话ID不匹配');
  if (!found.act1) throw new Error('Act1数据丢失');

  log(`找到会话: ${found.caseTitle}`, 'blue');
}

async function test05_UpdateSnapshot() {
  const sessionId = (global as any).testSessionId;
  if (!sessionId) throw new Error('缺少测试会话ID');

  const existing = await teachingSessionRepository.findById(
    sessionId,
    TEST_USER_ID
  );
  if (!existing) throw new Error('找不到会话');

  const updated: TeachingSessionSnapshot = {
    schemaVersion: existing.schemaVersion,
    version: existing.dataVersion,
    sessionState: 'act2',
    caseTitle: existing.caseTitle,
    caseNumber: existing.caseNumber,
    courtName: existing.courtName,
    act1: existing.act1,
    act2: mockAct2Data,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const saved = await teachingSessionRepository.saveSnapshot(
    TEST_USER_ID,
    updated,
    sessionId
  );

  if (saved.sessionState !== 'act2') throw new Error('状态未更新');
  if (!saved.act2) throw new Error('Act2数据未保存');

  log(`已更新到Act2，章节数: ${saved.act2.narrative?.chapters?.length}`, 'blue');
}

async function test06_JSONBQuery() {
  const sessionId = (global as any).testSessionId;

  // 测试JSONB查询
  const result = await pool.query(
    `
    SELECT
      id,
      case_title,
      act1_data->'basicInfo'->>'caseNumber' as case_number_from_jsonb,
      act2_data->'narrative'->'chapters' as chapters
    FROM teaching_sessions
    WHERE id = $1
  `,
    [sessionId]
  );

  if (!result.rows[0]) throw new Error('JSONB查询失败');
  if (result.rows[0].case_number_from_jsonb !== '(2024)京01民终9999号') {
    throw new Error('JSONB字段提取失败');
  }

  log(`JSONB查询成功，案号: ${result.rows[0].case_number_from_jsonb}`, 'blue');
}

async function test07_FindByUserId() {
  const result = await teachingSessionRepository.findByUserId(TEST_USER_ID, {
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  if (result.total === 0) throw new Error('找不到用户的会话');
  if (result.sessions.length === 0) throw new Error('会话列表为空');

  log(`找到${result.total}个会话`, 'blue');
}

async function test08_Search() {
  const results = await teachingSessionRepository.search(
    TEST_USER_ID,
    '合同纠纷'
  );

  if (results.length === 0) throw new Error('搜索结果为空');

  log(`搜索到${results.length}个匹配案例`, 'blue');
}

async function test09_DataIntegrity() {
  const sessionId = (global as any).testSessionId;
  const session = await teachingSessionRepository.findById(
    sessionId,
    TEST_USER_ID
  );

  if (!session) throw new Error('会话不存在');

  // 验证Act1数据完整性
  if (!session.act1?.basicInfo?.caseNumber)
    throw new Error('Act1基本信息缺失');
  if (!session.act1?.facts?.timeline?.length)
    throw new Error('Act1时间轴缺失');
  if (!session.act1?.evidence?.items?.length) throw new Error('Act1证据缺失');

  // 验证Act2数据完整性
  if (!session.act2?.narrative?.chapters?.length)
    throw new Error('Act2叙事章节缺失');
  if (!session.act2?.timelineAnalysis?.turningPoints?.length)
    throw new Error('Act2时间轴分析缺失');
  if (!session.act2?.evidenceQuestions?.length)
    throw new Error('Act2证据问题缺失');

  log('数据完整性验证通过', 'blue');
}

async function test10_Delete() {
  const sessionId = (global as any).testSessionId;

  await teachingSessionRepository.delete(sessionId, TEST_USER_ID);

  // 验证已软删除
  const deleted = await teachingSessionRepository.findById(
    sessionId,
    TEST_USER_ID
  );

  if (deleted !== null) throw new Error('软删除失败');

  log('软删除成功', 'blue');
}

// ========== 主测试流程 ==========

async function runTests() {
  log('\n========================================', 'cyan');
  log('🚀 开始数据库完整性测试', 'cyan');
  log('========================================\n', 'cyan');

  await testCase('01. 数据库连接测试', test01_DatabaseConnection);
  await testCase('02. 表结构验证', test02_TableExists);
  await testCase('03. 保存快照 (Act1)', test03_SaveSnapshot);
  await testCase('04. 根据ID查询', test04_FindById);
  await testCase('05. 更新快照 (Act2)', test05_UpdateSnapshot);
  await testCase('06. JSONB字段查询', test06_JSONBQuery);
  await testCase('07. 用户会话列表', test07_FindByUserId);
  await testCase('08. 搜索功能', test08_Search);
  await testCase('09. 数据完整性验证', test09_DataIntegrity);
  await testCase('10. 软删除功能', test10_Delete);

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
    log('\n✅ 所有测试通过！可以安全部署到生产环境。', 'green');
  } else {
    log('\n❌ 部分测试失败，请修复后再部署。', 'red');
  }

  // 关闭数据库连接
  await pool.end();
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
