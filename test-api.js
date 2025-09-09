const testText = `
上海市第一中级人民法院
民事判决书

（2023）沪01民终1234号

上诉人（原审被告）：张三，男，1985年3月15日出生，汉族，住上海市浦东新区。
被上诉人（原审原告）：李四，男，1978年8月20日出生，汉族，住上海市静安区。

本院查明：2022年5月10日，李四与张三签订《房屋买卖合同》，约定张三将其所有的位于上海市浦东新区某路123号房屋出售给李四，总价款人民币500万元。合同签订后，李四按约支付定金50万元。但张三未按期交付房屋，构成违约。

本院认为：张三的行为构成根本违约，应承担违约责任。

判决如下：
一、张三应返还李四定金50万元；
二、张三应支付违约金10万元。
`;

async function testExtraction() {
  try {
    console.log('测试案例提取API...');
    
    const response = await fetch('http://localhost:3000/api/extract-elements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: testText,
        useAI: true
      })
    });
    
    const data = await response.json();
    console.log('API响应:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ 提取成功！');
      console.log('提取方法:', data.method);
      console.log('置信度:', data.confidence);
    } else {
      console.log('❌ 提取失败:', data.error);
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testExtraction();