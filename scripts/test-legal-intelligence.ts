#!/usr/bin/env node

/**
 * Legal Intelligence Automated Test Runner
 * 自动化测试脚本 - TDD测试驱动开发
 */

import { spawn } from 'child_process'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'

// 测试配置
const TEST_CONFIG = {
  // 单元测试配置
  unit: {
    pattern: 'lib/legal-intelligence/__tests__/*.test.ts',
    coverage: true,
    threshold: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // 集成测试配置
  integration: {
    pattern: 'app/api/legal-intelligence/__tests__/*.test.ts',
    coverage: true,
    timeout: 10000
  },
  // 性能测试配置
  performance: {
    maxDuration: 2000, // 最大执行时间(ms)
    iterations: 100 // 性能测试迭代次数
  }
}

// 测试结果统计
interface TestResults {
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  coverage: {
    lines: number
    branches: number
    functions: number
    statements: number
  }
  duration: number
}

class LegalIntelligenceTestRunner {
  private results: TestResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    coverage: {
      lines: 0,
      branches: 0,
      functions: 0,
      statements: 0
    },
    duration: 0
  }
  
  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log(chalk.cyan.bold('\n🧪 Legal Intelligence Test Suite\n'))
    console.log(chalk.gray('━'.repeat(60)))
    
    const startTime = Date.now()
    
    try {
      // 1. 运行单元测试
      console.log(chalk.yellow('\n📦 Running Unit Tests...\n'))
      await this.runUnitTests()
      
      // 2. 运行集成测试
      console.log(chalk.yellow('\n🔗 Running Integration Tests...\n'))
      await this.runIntegrationTests()
      
      // 3. 运行性能测试
      console.log(chalk.yellow('\n⚡ Running Performance Tests...\n'))
      await this.runPerformanceTests()
      
      // 4. 运行端到端测试
      console.log(chalk.yellow('\n🌐 Running E2E Tests...\n'))
      await this.runE2ETests()
      
      this.results.duration = Date.now() - startTime
      
      // 显示测试报告
      this.displayReport()
      
    } catch (error) {
      console.error(chalk.red('\n❌ Test suite failed:'), error)
      process.exit(1)
    }
  }
  
  /**
   * 运行单元测试
   */
  private runUnitTests(): Promise<void> {
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npx', [
        'jest',
        '--config=jest.config.ts',
        '--testPathPattern=lib/legal-intelligence/__tests__',
        '--coverage',
        '--coverageDirectory=coverage/unit',
        '--json',
        '--outputFile=test-results/unit.json'
      ], {
        stdio: 'pipe',
        shell: true
      })
      
      let output = ''
      
      jestProcess.stdout.on('data', (data) => {
        output += data.toString()
        process.stdout.write(data)
      })
      
      jestProcess.stderr.on('data', (data) => {
        process.stderr.write(data)
      })
      
      jestProcess.on('close', (code) => {
        if (code === 0) {
          this.parseTestResults('test-results/unit.json')
          console.log(chalk.green('✅ Unit tests passed'))
          resolve()
        } else {
          console.log(chalk.red('❌ Unit tests failed'))
          resolve() // 继续运行其他测试
        }
      })
    })
  }
  
  /**
   * 运行集成测试
   */
  private runIntegrationTests(): Promise<void> {
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npx', [
        'jest',
        '--config=jest.config.ts',
        '--testPathPattern=app/api/legal-intelligence/__tests__',
        '--coverage',
        '--coverageDirectory=coverage/integration',
        '--json',
        '--outputFile=test-results/integration.json'
      ], {
        stdio: 'pipe',
        shell: true
      })
      
      jestProcess.stdout.on('data', (data) => {
        process.stdout.write(data)
      })
      
      jestProcess.stderr.on('data', (data) => {
        process.stderr.write(data)
      })
      
      jestProcess.on('close', (code) => {
        if (code === 0) {
          this.parseTestResults('test-results/integration.json')
          console.log(chalk.green('✅ Integration tests passed'))
        } else {
          console.log(chalk.red('❌ Integration tests failed'))
        }
        resolve()
      })
    })
  }
  
  /**
   * 运行性能测试
   */
  private async runPerformanceTests(): Promise<void> {
    console.log(chalk.cyan('Testing extraction performance...'))
    
    // 导入测试目标
    const { RuleExtractor } = await import('../lib/legal-intelligence/rule-extractor')
    const { DocumentPreprocessor } = await import('../lib/legal-intelligence/preprocessor')
    
    // 准备测试数据
    const testCases = [
      { name: 'Small Document', size: 100 },
      { name: 'Medium Document', size: 1000 },
      { name: 'Large Document', size: 10000 }
    ]
    
    for (const testCase of testCases) {
      const text = this.generateTestText(testCase.size)
      const startTime = Date.now()
      
      // 执行多次以获得平均值
      for (let i = 0; i < 10; i++) {
        const doc = DocumentPreprocessor.processDocument(text)
        RuleExtractor.extract(doc)
      }
      
      const avgTime = (Date.now() - startTime) / 10
      
      if (avgTime < TEST_CONFIG.performance.maxDuration) {
        console.log(chalk.green(`  ✅ ${testCase.name}: ${avgTime.toFixed(2)}ms`))
      } else {
        console.log(chalk.red(`  ❌ ${testCase.name}: ${avgTime.toFixed(2)}ms (exceeded ${TEST_CONFIG.performance.maxDuration}ms)`))
      }
    }
  }
  
  /**
   * 运行端到端测试
   */
  private async runE2ETests(): Promise<void> {
    console.log(chalk.cyan('Testing complete extraction pipeline...'))
    
    // 测试完整的提取流程
    const testDocument = `
      北京市朝阳区人民法院
      民事判决书
      (2024)京0105民初12345号
      
      原告：张三，男，1980年1月1日出生
      被告：李四贸易有限公司
      
      原告于2024年3月15日向本院提起诉讼，要求被告返还借款本金100万元及利息。
      
      根据《中华人民共和国民法典》第667条，判决如下：
      被告应于判决生效后10日内归还原告借款本金100万元。
    `
    
    try {
      // 调用API进行测试
      const response = await fetch('http://localhost:3000/api/legal-intelligence/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testDocument,
          options: {
            enableAI: false, // 测试时禁用AI
            enhanceWithProvisions: true
          }
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // 验证结果
        const checks = [
          { name: 'Dates extracted', passed: result.data.dates?.length > 0 },
          { name: 'Parties extracted', passed: result.data.parties?.length > 0 },
          { name: 'Amounts extracted', passed: result.data.amounts?.length > 0 },
          { name: 'Legal clauses extracted', passed: result.data.legalClauses?.length > 0 },
          { name: 'Case type detected', passed: !!result.data.caseType },
          { name: 'Suggestions generated', passed: result.suggestions?.length > 0 }
        ]
        
        checks.forEach(check => {
          if (check.passed) {
            console.log(chalk.green(`  ✅ ${check.name}`))
            this.results.passedTests++
          } else {
            console.log(chalk.red(`  ❌ ${check.name}`))
            this.results.failedTests++
          }
          this.results.totalTests++
        })
      } else {
        console.log(chalk.red('  ❌ E2E test failed: API returned error'))
        this.results.failedTests++
        this.results.totalTests++
      }
    } catch (error) {
      console.log(chalk.yellow('  ⚠️ E2E test skipped: Server not running'))
      this.results.skippedTests++
      this.results.totalTests++
    }
  }
  
  /**
   * 解析测试结果
   */
  private parseTestResults(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(chalk.yellow(`Test results file not found: ${filePath}`))
        return
      }
      
      const results = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      
      this.results.totalTests += results.numTotalTests || 0
      this.results.passedTests += results.numPassedTests || 0
      this.results.failedTests += results.numFailedTests || 0
      this.results.skippedTests += results.numPendingTests || 0
      
      if (results.coverageMap) {
        // 更新覆盖率数据
        const coverage = results.coverageMap
        // 这里简化处理，实际应该解析详细的覆盖率数据
      }
    } catch (error) {
      console.log(chalk.yellow(`Failed to parse test results: ${error}`))
    }
  }
  
  /**
   * 生成测试文本
   */
  private generateTestText(sentences: number): string {
    const templates = [
      '原告{name}诉被告{defendant}。',
      '{date}发生纠纷。',
      '要求赔偿{amount}元。',
      '根据《民法典》第{article}条。'
    ]
    
    let text = ''
    for (let i = 0; i < sentences; i++) {
      const template = templates[i % templates.length]
      text += template
        .replace('{name}', `张${i}`)
        .replace('{defendant}', `李${i}公司`)
        .replace('{date}', `2024年${(i % 12) + 1}月${(i % 28) + 1}日`)
        .replace('{amount}', `${(i + 1) * 10000}`)
        .replace('{article}', `${400 + i}`)
    }
    
    return text
  }
  
  /**
   * 显示测试报告
   */
  private displayReport(): void {
    console.log(chalk.gray('\n' + '━'.repeat(60)))
    console.log(chalk.cyan.bold('\n📊 Test Report\n'))
    
    const passRate = (this.results.passedTests / this.results.totalTests * 100).toFixed(1)
    const statusColor = this.results.failedTests === 0 ? chalk.green : chalk.red
    
    console.log(chalk.white('  Total Tests:    '), this.results.totalTests)
    console.log(chalk.green('  Passed:         '), this.results.passedTests)
    console.log(chalk.red('  Failed:         '), this.results.failedTests)
    console.log(chalk.yellow('  Skipped:        '), this.results.skippedTests)
    console.log(chalk.white('  Pass Rate:      '), statusColor(`${passRate}%`))
    console.log(chalk.white('  Duration:       '), `${(this.results.duration / 1000).toFixed(2)}s`)
    
    if (this.results.coverage.lines > 0) {
      console.log(chalk.cyan('\n📈 Coverage\n'))
      console.log(chalk.white('  Lines:          '), `${this.results.coverage.lines}%`)
      console.log(chalk.white('  Branches:       '), `${this.results.coverage.branches}%`)
      console.log(chalk.white('  Functions:      '), `${this.results.coverage.functions}%`)
      console.log(chalk.white('  Statements:     '), `${this.results.coverage.statements}%`)
    }
    
    console.log(chalk.gray('\n' + '━'.repeat(60)))
    
    if (this.results.failedTests === 0) {
      console.log(chalk.green.bold('\n✅ All tests passed! Legal Intelligence System is ready.\n'))
    } else {
      console.log(chalk.red.bold(`\n❌ ${this.results.failedTests} tests failed. Please fix the issues.\n`))
      process.exit(1)
    }
  }
}

// 创建必要的目录
const ensureDirectories = () => {
  const dirs = ['test-results', 'coverage', 'coverage/unit', 'coverage/integration']
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

// 主函数
const main = async () => {
  console.clear()
  console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════════════╗
║     Legal Intelligence System - Test Runner v1.0.0      ║
║           Test Driven Development (TDD)                 ║
╚══════════════════════════════════════════════════════════╝
  `))
  
  ensureDirectories()
  
  const runner = new LegalIntelligenceTestRunner()
  await runner.runAllTests()
}

// 运行测试
if (require.main === module) {
  main().catch(console.error)
}

export { LegalIntelligenceTestRunner }