/**
 * 302.ai PPT生成诊断脚本
 * 用于测试实际的API响应时间和数据结构
 */

const API_KEY = 'sk-AJeqG8UJnqhvwAQP16DGTtb0VIfTuhDjtJID22Lh3yDKQbPz';
const BASE_URL = 'https://api.302.ai';

// 简单的测试大纲
const testOutline = `# 测试PPT

## 第一页：标题
这是测试内容

## 第二页：内容
- 要点1
- 要点2

## 第三页：总结
感谢观看
`;

/**
 * 步骤1: 调用generatecontent接口（异步模式）
 */
async function generatePPT() {
  console.log('🚀 步骤1: 调用302.ai generatecontent接口');
  console.log('⏰ 开始时间:', new Date().toISOString());

  const endpoint = `${BASE_URL}/302/ppt/generatecontent`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        outlineMarkdown: testOutline,
        stream: true,
        asyncGenPptx: true,
        lang: 'zh'
      })
    });

    console.log('📡 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败 (${response.status}): ${errorText}`);
    }

    // 处理流式响应
    const pptId = await handleStreamResponse(response);
    console.log('✅ 获取到pptId:', pptId);
    console.log('⏰ 获取pptId时间:', new Date().toISOString());

    return pptId;

  } catch (error) {
    console.error('❌ 步骤1失败:', error);
    throw error;
  }
}

/**
 * 处理流式响应
 */
async function handleStreamResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let pptId = null;
  let buffer = '';
  let chunkCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunkCount++;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;

        try {
          const dataMatch = line.match(/^data: (.+)$/);
          if (dataMatch) {
            const data = JSON.parse(dataMatch[1]);

            console.log(`📥 流式数据 #${chunkCount}:`, JSON.stringify(data, null, 2));

            if (data.pptId) {
              pptId = data.pptId;
              console.log('✨ 提取到pptId:', pptId);
            }

            if (data.status === 4 && data.result?.pptId) {
              pptId = data.result.pptId;
            }
          }
        } catch (parseError) {
          console.warn('⚠️ 解析失败:', line);
        }
      }
    }

    return pptId;

  } finally {
    reader.releaseLock();
  }
}

/**
 * 步骤2: 轮询查询PPT状态
 */
async function pollPptStatus(pptId, maxAttempts = 60, interval = 2000) {
  console.log('\n🔄 步骤2: 开始轮询PPT状态');
  console.log('⏰ 轮询开始时间:', new Date().toISOString());
  console.log('⚙️  配置: 最多', maxAttempts, '次, 间隔', interval/1000, '秒');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptStart = Date.now();

    try {
      const response = await fetch(
        `${BASE_URL}/302/ppt/asyncpptinfo?pptId=${pptId}`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          }
        }
      );

      const result = await response.json();

      const hasFileUrl = !!result.data?.pptInfo?.fileUrl;
      const progress = result.data?.progress;
      const status = result.data?.status;

      console.log(`📊 轮询 ${attempt}/${maxAttempts} (耗时${Date.now() - attemptStart}ms):`, {
        code: result.code,
        message: result.message,
        status: status,
        progress: progress,
        hasFileUrl: hasFileUrl,
        hasPptInfo: !!result.data?.pptInfo,
        fileUrl: result.data?.pptInfo?.fileUrl?.substring(0, 50) + '...' || null
      });

      // 完整的响应结构（仅第1次和完成时打印）
      if (attempt === 1 || hasFileUrl) {
        console.log('📦 完整响应结构:', JSON.stringify(result, null, 2));
      }

      // 如果已完成
      if (hasFileUrl) {
        console.log('✅ PPT生成完成！');
        console.log('⏰ 完成时间:', new Date().toISOString());
        console.log('📈 总轮询次数:', attempt);
        console.log('⏱️  总耗时:', Math.round(attempt * interval / 1000), '秒');
        return result.data.pptInfo;
      }

      // 等待后继续
      await new Promise(resolve => setTimeout(resolve, interval));

    } catch (error) {
      console.error(`❌ 轮询失败 (${attempt}/${maxAttempts}):`, error);

      if (attempt === maxAttempts) {
        throw new Error('PPT生成超时');
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw new Error('PPT生成超时，请稍后重试');
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 302.ai PPT生成诊断测试');
  console.log('=' .repeat(60));

  try {
    // 步骤1: 生成PPT并获取pptId
    const pptId = await generatePPT();

    if (!pptId) {
      throw new Error('未能获取pptId');
    }

    // 等待2秒，让302.ai开始处理
    console.log('\n⏳ 等待2秒让302.ai开始处理...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 步骤2: 轮询状态
    const pptInfo = await pollPptStatus(pptId);

    console.log('\n🎉 测试成功！');
    console.log('📄 PPT信息:', {
      id: pptInfo.id,
      name: pptInfo.name,
      fileUrl: pptInfo.fileUrl,
      coverUrl: pptInfo.coverUrl
    });

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
main();
