import { ContextFormatter, type ContextData } from '@/packages/context-manager/src';

describe('ContextFormatter.fromTemplateAsMessages - standard template', () => {
  const baseData: ContextData = {
    systemPrompt: 'You are a Socratic tutor. Always ask probing questions.',
    conversation: [
      '学生: 我认为本案涉及合同效力问题。',
      '导师: 很好，请继续分析具体条款。'
    ],
    current: '请针对买卖合同中未成年人签订的问题提出进一步问题。',
    context: {
      mode: 'exploration',
      level: 'intermediate',
      topic: '合同效力',
      sessionId: 'session-001'
    },
    metadata: {
      caseId: 'case-123'
    }
  };

  it('produces a system message followed by normalized history and a structured user payload', () => {
    const messages = ContextFormatter.fromTemplateAsMessages('standard', baseData);

    expect(messages).toHaveLength(4);

    const [systemMessage, firstHistory, secondHistory, userMessage] = messages;

    expect(systemMessage).toMatchObject({
      role: 'system',
      content: baseData.systemPrompt
    });

    expect(firstHistory).toMatchObject({
      role: 'user',
      content: '我认为本案涉及合同效力问题。'
    });

    expect(secondHistory).toMatchObject({
      role: 'assistant',
      content: '很好，请继续分析具体条款。'
    });

    expect(userMessage.role).toBe('user');
    expect(userMessage.metadata).toEqual({ template: 'standard', caseId: 'case-123' });
    expect(userMessage.content).toMatch(
      /<current>\s*请针对买卖合同中未成年人签订的问题提出进一步问题。\s*<\/current>/
    );
    expect(userMessage.content).toContain('<context>');
    expect(userMessage.content).toContain('<mode>exploration</mode>');
  });

  it('falls back to role metadata when systemPrompt is missing', () => {
    const messages = ContextFormatter.fromTemplateAsMessages('standard', {
      ...baseData,
      systemPrompt: undefined,
      role: ['DeepPractice 苏格拉底教学导师', '法律教育助手']
    });

    expect(messages[0]).toMatchObject({
      role: 'system',
      content: 'DeepPractice 苏格拉底教学导师\n法律教育助手'
    });
  });
});
