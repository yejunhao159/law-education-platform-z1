// 测试库的加载
console.log('=== 库加载测试 ===\n');

async function testLibraries() {
  console.log('1. 测试 mammoth 库...');
  try {
    const mammoth = await import('mammoth');
    console.log('✅ mammoth 加载成功');
    console.log('   版本信息:', mammoth.version || '未知');
    
    // 测试基本功能
    const testBuffer = Buffer.from('test');
    try {
      await mammoth.extractRawText({ buffer: testBuffer });
    } catch (e) {
      console.log('   功能测试: 预期的错误（非docx文件）');
    }
  } catch (error) {
    console.log('❌ mammoth 加载失败:', error.message);
  }

  console.log('\n2. 测试 pdfjs-dist 库...');
  try {
    const pdfjs = await import('pdfjs-dist');
    console.log('✅ pdfjs-dist 加载成功');
    console.log('   版本:', pdfjs.version);
    
    // 设置 worker
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    console.log('   Worker URL:', pdfjs.GlobalWorkerOptions.workerSrc);
  } catch (error) {
    console.log('❌ pdfjs-dist 加载失败:', error.message);
  }

  console.log('\n3. 检查 Node.js 版本...');
  console.log('   Node:', process.version);
  console.log('   平台:', process.platform);

  console.log('\n4. 测试动态导入（浏览器模拟）...');
  try {
    // 模拟浏览器环境的动态导入
    const loadInBrowser = new Function('return import("mammoth")')();
    await loadInBrowser;
    console.log('✅ 动态导入测试成功');
  } catch (error) {
    console.log('⚠️  动态导入可能有问题:', error.message);
  }
}

testLibraries().catch(console.error);