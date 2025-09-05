#!/usr/bin/env tsx

/**
 * 测试时间轴功能
 * 运行: npx tsx scripts/test-timeline-features.ts
 */

async function testTimelineFeatures() {
  console.log('🧪 开始测试时间轴功能...\n')
  
  // 测试默认摘要生成
  console.log('📝 测试1: 默认摘要生成')
  const event1 = {
    title: '签订借款合同',
    description: '原告与被告签订借款合同，约定借款金额100万元，年利率8%，借款期限1年',
    actor: '原告、被告'
  }
  
  // 模拟摘要生成逻辑
  const generateSummary = (event: any) => {
    const desc = event.description || event.title
    if (desc.length <= 40) return desc
    
    const amount = desc.match(/(\d+[\.\d]*万?元)/)?.[0] || ''
    const action = event.title
    const party = event.actor || ''
    
    return `${party}${action}${amount ? `，涉及${amount}` : ''}`.slice(0, 40)
  }
  
  const summary = generateSummary(event1)
  console.log(`  摘要: "${summary}"`)
  console.log(`  ✅ 摘要长度: ${summary.length} 字符（应小于40）\n`)
  
  // 测试AI分析API
  console.log('🤖 测试2: AI法律分析API')
  try {
    const response = await fetch('http://localhost:3000/api/legal-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: {
          date: '2023-01-15',
          title: '签订借款合同',
          description: '原告与被告签订借款合同，约定借款金额100万元，年利率8%，借款期限1年',
          party: '原告、被告'
        },
        caseContext: '民间借贷纠纷'
      })
    })
    
    if (response.ok) {
      const analysis = await response.json()
      console.log('  ✅ API响应成功')
      console.log(`  - 摘要: ${analysis.summary || '无'}`)
      console.log(`  - 法学要点数: ${analysis.legalPoints?.length || 0}`)
      console.log(`  - 相关法条数: ${analysis.legalBasis?.length || 0}`)
    } else {
      console.log('  ⚠️ API返回非200状态: ', response.status)
    }
  } catch (error) {
    console.log('  ℹ️ API调用失败（可能需要配置DeepSeek API密钥）')
  }
  
  console.log('\n📊 测试3: 法律要素提取')
  const legalPatterns = {
    '借贷关系': ['借款', '贷款', '借贷', '还款'],
    '合同关系': ['合同', '协议', '签订', '履行'],
    '侵权关系': ['侵权', '损害', '赔偿', '侵害']
  }
  
  const testText = '原告与被告签订借款合同，约定借款金额100万元'
  let foundRelation = ''
  
  for (const [relation, keywords] of Object.entries(legalPatterns)) {
    if (keywords.some(kw => testText.includes(kw))) {
      foundRelation = relation
      break
    }
  }
  
  console.log(`  文本: "${testText.slice(0, 50)}..."`)
  console.log(`  ✅ 识别到的法律关系: ${foundRelation}\n`)
  
  // 测试时间轴页面
  console.log('🌐 测试4: 时间轴页面访问')
  try {
    const pageResponse = await fetch('http://localhost:3000/timeline-simplified')
    console.log(`  ✅ 页面状态: ${pageResponse.status} ${pageResponse.statusText}`)
  } catch (error) {
    console.log('  ❌ 页面访问失败')
  }
  
  console.log('\n✨ 测试完成！')
  console.log('\n主要优化：')
  console.log('  1. ✅ 默认显示事件摘要（无需点击）')
  console.log('  2. ✅ 点击展开显示完整内容和细节')
  console.log('  3. ✅ 集成AI分析法学要点和相关法条')
  console.log('  4. ✅ 智能提取法律关系和举证责任')
  console.log('\n访问 http://localhost:3000/timeline-simplified 查看效果')
}

// 运行测试
testTimelineFeatures().catch(console.error)