// 抽象基类 - 提供通用实现
export class BaseTokenizerStrategy {
    constructor(provider) {
        this.modelConfig = new Map();
        this.provider = provider;
        this.initializeModels();
    }
    // 可选的编码/解码方法（默认抛出错误）
    encode(text, model) {
        throw new Error(`Encode not implemented for ${this.provider} provider`);
    }
    decode(tokens, model) {
        throw new Error(`Decode not implemented for ${this.provider} provider`);
    }
    // 获取支持的模型列表
    getSupportedModels() {
        return Array.from(this.modelConfig.keys());
    }
    // 获取厂商名称
    getProviderName() {
        return this.provider;
    }
    // 获取模型信息
    getModelInfo(model) {
        return this.modelConfig.get(model);
    }
    // 工具方法：验证模型是否支持
    validateModel(model) {
        if (!this.modelConfig.has(model)) {
            console.warn(`Model ${model} not explicitly supported by ${this.provider}, using default settings`);
        }
    }
    // 工具方法：文本预处理
    preprocessText(text) {
        // 移除多余空格，统一换行符
        return text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
}
//# sourceMappingURL=base.js.map