// 创建一个简单的测试DOCX文件，用于测试上传功能
const fs = require('fs');

// 创建一个最小的DOCX文件内容（ZIP格式）
// 这是一个包含"Hello World"文本的最简单的DOCX文件

const docxData = {
  '[Content_Types].xml': `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,

  '_rels/.rels': `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,

  'word/document.xml': `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p>
<w:r>
<w:t>张某诉李某房屋买卖合同纠纷案判决书

基本信息：
案号：（2023）京0108民初12345号
法院：北京市海淀区人民法院
审判员：王法官

当事人：
原告：张某，男，汉族，1980年5月生
被告：李某，女，汉族，1985年3月生

案件事实：
2023年1月15日，张某（出卖人）与李某（买受人）签订《房屋买卖合同》，约定房屋总价200万元。李某依约支付首付款50万元。后因房价上涨，张某拒绝履行过户义务。

证据材料：
1. 房屋买卖合同原件
2. 银行转账凭证
3. 房产评估报告

法院认为：
根据《民法典》第509条规定，当事人应当按照约定全面履行自己的义务。房价正常波动不构成情势变更，不能免除合同义务。

判决结果：
判决被告张某于本判决生效后30日内配合原告李某办理房屋过户登记手续。</w:t>
</w:r>
</w:p>
</w:body>
</w:document>`
};

console.log('✅ 测试DOCX内容已准备');
console.log('📄 包含典型判决书内容：案号、当事人、事实、证据、法院意见、判决结果');
console.log('💡 可手动创建DOCX文件，或使用在线工具将以上内容保存为test.docx');

// 输出纯文本版本供测试
const textContent = `张某诉李某房屋买卖合同纠纷案判决书

基本信息：
案号：（2023）京0108民初12345号
法院：北京市海淀区人民法院
审判员：王法官

当事人：
原告：张某，男，汉族，1980年5月生
被告：李某，女，汉族，1985年3月生

案件事实：
2023年1月15日，张某（出卖人）与李某（买受人）签订《房屋买卖合同》，约定房屋总价200万元。李某依约支付首付款50万元。后因房价上涨，张某拒绝履行过户义务。

证据材料：
1. 房屋买卖合同原件
2. 银行转账凭证
3. 房产评估报告

法院认为：
根据《民法典》第509条规定，当事人应当按照约定全面履行自己的义务。房价正常波动不构成情势变更，不能免除合同义务。

判决结果：
判决被告张某于本判决生效后30日内配合原告李某办理房屋过户登记手续。`;

fs.writeFileSync('test-judgment.txt', textContent, 'utf8');
console.log('📝 已创建 test-judgment.txt 文件用于测试');