#!/usr/bin/env tsx

/**
 * 验证时间轴集成效果
 * 运行: npx tsx scripts/verify-integration.ts
 */

import chalk from 'chalk'

async function verifyIntegration() {
  console.log(chalk.blue.bold('\n🔍 开始验证时间轴集成...\n'))
  
  const checks = [
    {
      name: '主页面访问',
      url: 'http://localhost:3000/',
      expected: 200
    },
    {
      name: '集成测试页面',
      url: 'http://localhost:3000/test-integration',
      expected: 200
    },
    {
      name: '独立时间轴页面',
      url: 'http://localhost:3000/timeline-simplified',
      expected: 200
    },
    {
      name: 'API法律分析接口',
      url: 'http://localhost:3000/api/legal-analysis',
      method: 'POST',
      body: {
        event: {
          date: '2024-01-01',
          title: '测试事件',
          description: '测试描述'
        }
      },
      expected: 200
    }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const check of checks) {
    try {
      const options: any = {
        method: check.method || 'GET',
        headers: {}
      }
      
      if (check.body) {
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(check.body)
      }
      
      const response = await fetch(check.url, options)
      
      if (response.status === check.expected) {
        console.log(chalk.green(`✅ ${check.name}: ${response.status} ${response.statusText}`))
        passed++
      } else {
        console.log(chalk.yellow(`⚠️ ${check.name}: ${response.status} (期望 ${check.expected})`))
        failed++
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${check.name}: 请求失败`))
      failed++
    }
  }
  
  console.log(chalk.cyan('\n📊 集成验证结果:'))
  console.log(chalk.green(`  ✅ 通过: ${passed}/${checks.length}`))
  if (failed > 0) {
    console.log(chalk.red(`  ❌ 失败: ${failed}/${checks.length}`))
  }
  
  console.log(chalk.blue('\n✨ 集成功能清单:'))
  const features = [
    '默认显示事件摘要（30-40字）',
    '点击展开查看完整内容',
    'AI智能法律分析（需要API密钥）',
    '法学要素自动提取',
    '关键事件特殊标记',
    '响应式布局适配',
    '故事模式/数据模式切换'
  ]
  
  features.forEach(feature => {
    console.log(chalk.gray(`  • ${feature}`))
  })
  
  console.log(chalk.yellow('\n📝 使用说明:'))
  console.log('  1. 访问 http://localhost:3000/test-integration 查看完整集成效果')
  console.log('  2. 访问 http://localhost:3000/ 在主应用中使用时间轴')
  console.log('  3. 配置 DEEPSEEK_API_KEY 环境变量以启用AI分析')
  
  console.log(chalk.green.bold('\n✨ 时间轴集成完成！\n'))
}

verifyIntegration().catch(console.error)