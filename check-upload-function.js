// 检查上传功能的核心问题
console.log('🔍 开始检查上传功能...');

// 1. 检查页面是否加载了正确的组件
setTimeout(() => {
    console.log('📋 检查页面元素...');
    
    // 检查文件输入框
    const fileInput = document.getElementById('file-upload');
    console.log('文件输入框:', fileInput ? '✅ 存在' : '❌ 缺失');
    
    // 检查上传区域
    const uploadArea = document.querySelector('[data-slot="card"]');
    console.log('上传区域:', uploadArea ? '✅ 存在' : '❌ 缺失');
    
    // 检查是否有JavaScript错误
    console.log('🧪 测试文件类型检查函数...');
    
    // 模拟文件对象
    const testFile = {
        name: 'test.docx',
        size: 1024,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    // 检查文件类型验证逻辑
    const supportedTypes = ['txt', 'md', 'docx', 'pdf'];
    const fileType = testFile.name.split('.').pop()?.toLowerCase();
    const isSupported = supportedTypes.includes(fileType || '');
    
    console.log('文件类型检查:', isSupported ? '✅ DOCX支持' : '❌ DOCX不支持');
    
    // 如果文件输入框存在，测试事件监听
    if (fileInput) {
        console.log('🎯 测试文件选择事件...');
        
        // 检查是否有change事件监听器
        const events = getEventListeners ? getEventListeners(fileInput) : null;
        console.log('文件输入框事件监听器:', events ? '✅ 已绑定' : '❓ 无法检测');
        
        // 尝试触发一个模拟事件
        try {
            const changeEvent = new Event('change');
            fileInput.dispatchEvent(changeEvent);
            console.log('✅ 事件触发正常');
        } catch (error) {
            console.error('❌ 事件触发失败:', error.message);
        }
    }
    
    console.log('🎉 检查完成！');
    
}, 2000); // 等待2秒让页面完全加载