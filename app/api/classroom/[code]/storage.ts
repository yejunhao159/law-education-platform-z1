/**
 * 课堂数据存储模块
 * 统一管理课堂问题和答案的存储
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

// 内存存储（后续会替换为Vercel KV）
const classroomQuestions = new Map<string, Question>();
const classroomAnswers = new Map<string, Answer[]>();

export const storage = {
  // 问题相关
  setQuestion(code: string, question: Question) {
    classroomQuestions.set(code, question);
  },

  getQuestion(code: string): Question | undefined {
    return classroomQuestions.get(code);
  },

  // 答案相关
  addAnswer(code: string, answer: Answer) {
    const answers = classroomAnswers.get(code) || [];
    answers.push(answer);
    classroomAnswers.set(code, answers);
  },

  getAnswers(code: string, questionId?: string): Answer[] {
    const answers = classroomAnswers.get(code) || [];
    if (questionId) {
      return answers.filter(a => a.questionId === questionId);
    }
    return answers;
  },

  // 清理（可选）
  clearClassroom(code: string) {
    classroomQuestions.delete(code);
    classroomAnswers.delete(code);
  },

  // 调试
  debug() {
    console.log('📦 存储状态:');
    console.log('  问题数:', classroomQuestions.size);
    console.log('  答案总数:', Array.from(classroomAnswers.values()).reduce((sum, arr) => sum + arr.length, 0));
  }
};
