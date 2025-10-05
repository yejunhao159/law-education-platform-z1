/**
 * 课堂数据存储模块 - 全局单例版本
 *
 * 🔧 架构说明：
 * - 使用 globalThis 实现跨 Serverless 实例的共享存储
 * - 适用于开发环境和单机部署
 * - 生产环境建议切换为 Vercel KV 或 Redis
 *
 * 🚨 矛盾分析：
 * - 对立面A：Next.js Serverless 架构（每个API路由独立实例）
 * - 对立面B：内存存储需要状态共享
 * - 解决方案：globalThis 全局单例，强制所有实例共享同一存储
 */

export interface Question {
  id: string;
  content: string;
  type: 'vote' | 'text';
  options?: string[];
  timestamp: string;
}

export interface Answer {
  questionId: string;
  answer: string;
  timestamp: string;
  studentId?: string;
}

// 🔐 全局单例存储 - 关键修复！
// 使用 globalThis 确保所有 Serverless 实例共享同一个 Map
const globalForStorage = globalThis as unknown as {
  classroomQuestions: Map<string, Question>;
  classroomAnswers: Map<string, Answer[]>;
  storageInitTime?: string;
};

// 初始化全局存储（只在第一次时）
if (!globalForStorage.classroomQuestions) {
  globalForStorage.classroomQuestions = new Map();
  globalForStorage.classroomAnswers = new Map();
  globalForStorage.storageInitTime = new Date().toISOString();
  console.log('🚀 [Storage] 全局单例初始化完成 @', globalForStorage.storageInitTime);
}

// 辅助函数：格式化时间戳（便于日志阅读）
const formatTime = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

// 辅助函数：生成调用栈标识（便于追踪API调用）
const getCallerId = () => {
  const stack = new Error().stack || '';
  const match = stack.match(/\/api\/classroom\/[^/]+\/(\w+)/);
  return match ? match[1] : 'unknown';
};

export const storage = {
  // 📝 问题存储
  setQuestion(code: string, question: Question) {
    const caller = getCallerId();
    globalForStorage.classroomQuestions.set(code, question);

    console.log(`💾 [Storage.setQuestion] [${formatTime()}] [${caller}]`);
    console.log(`   课堂码: ${code}`);
    console.log(`   问题ID: ${question.id}`);
    console.log(`   内容: ${question.content.substring(0, 50)}...`);
    console.log(`   当前存储: ${globalForStorage.classroomQuestions.size} 个课堂`);
  },

  // 🔍 问题读取
  getQuestion(code: string): Question | undefined {
    const caller = getCallerId();
    const question = globalForStorage.classroomQuestions.get(code);

    console.log(`🔍 [Storage.getQuestion] [${formatTime()}] [${caller}]`);
    console.log(`   课堂码: ${code}`);
    console.log(`   结果: ${question ? `✅ 找到 (ID: ${question.id})` : '❌ 未找到'}`);

    if (!question) {
      // 列出所有存储的课堂码，帮助调试
      const allCodes = Array.from(globalForStorage.classroomQuestions.keys());
      console.log(`   📋 当前存储的课堂码: [${allCodes.join(', ') || '无'}]`);
    }

    return question;
  },

  // 📥 答案存储
  addAnswer(code: string, answer: Answer) {
    const caller = getCallerId();
    const answers = globalForStorage.classroomAnswers.get(code) || [];
    answers.push(answer);
    globalForStorage.classroomAnswers.set(code, answers);

    console.log(`📥 [Storage.addAnswer] [${formatTime()}] [${caller}]`);
    console.log(`   课堂码: ${code}`);
    console.log(`   问题ID: ${answer.questionId}`);
    console.log(`   答案: ${answer.answer.substring(0, 30)}...`);
    console.log(`   该课堂答案数: ${answers.length}`);
  },

  // 📤 答案读取
  getAnswers(code: string, questionId?: string): Answer[] {
    const caller = getCallerId();
    const answers = globalForStorage.classroomAnswers.get(code) || [];

    const filtered = questionId
      ? answers.filter(a => a.questionId === questionId)
      : answers;

    console.log(`📤 [Storage.getAnswers] [${formatTime()}] [${caller}]`);
    console.log(`   课堂码: ${code}`);
    console.log(`   问题ID过滤: ${questionId || '无'}`);
    console.log(`   返回答案数: ${filtered.length}`);

    return filtered;
  },

  // 🗑️ 清理课堂
  clearClassroom(code: string) {
    const caller = getCallerId();
    globalForStorage.classroomQuestions.delete(code);
    globalForStorage.classroomAnswers.delete(code);

    console.log(`🗑️  [Storage.clearClassroom] [${formatTime()}] [${caller}]`);
    console.log(`   课堂码: ${code}`);
    console.log(`   已清理`);
  },

  // 📊 调试信息
  debug() {
    console.log('═══════════════════════════════════════');
    console.log('📊 [Storage Debug] 全局存储状态');
    console.log('═══════════════════════════════════════');
    console.log(`⏰ 初始化时间: ${globalForStorage.storageInitTime}`);
    console.log(`📝 问题总数: ${globalForStorage.classroomQuestions.size}`);

    // 列出所有课堂
    console.log('\n📚 所有课堂:');
    globalForStorage.classroomQuestions.forEach((q, code) => {
      const answerCount = (globalForStorage.classroomAnswers.get(code) || []).length;
      console.log(`   - ${code}: ${q.content.substring(0, 30)}... (${answerCount} 个答案)`);
    });

    const totalAnswers = Array.from(globalForStorage.classroomAnswers.values())
      .reduce((sum, arr) => sum + arr.length, 0);
    console.log(`\n📝 答案总数: ${totalAnswers}`);
    console.log('═══════════════════════════════════════');
  },

  // 🔬 内部状态检查（用于排查问题）
  inspect(code: string) {
    console.log(`🔬 [Storage.inspect] 课堂 ${code} 详细状态:`);
    console.log('   - 问题:', globalForStorage.classroomQuestions.get(code));
    console.log('   - 答案:', globalForStorage.classroomAnswers.get(code));
    console.log('   - 所有课堂码:', Array.from(globalForStorage.classroomQuestions.keys()));
  }
};
