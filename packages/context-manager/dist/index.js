"use strict";
/**
 * @deepracticex/context-manager
 * Context management utility for AI conversation formatting
 * Provides structured XML and JSON formatting for AI prompts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.ContextFormatter = void 0;
/**
 * Context formatter for AI conversations
 * Supports XML, JSON, and Markdown formatting
 */
class ContextFormatter {
    /**
     * Format context data based on specified options
     */
    static format(data, options = {}) {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        switch (opts.format) {
            case 'json':
                return this.formatAsJSON(data, opts);
            case 'markdown':
                return this.formatAsMarkdown(data, opts);
            case 'xml':
            default:
                return this.formatAsXML(data, opts);
        }
    }
    /**
     * Format context as XML
     */
    static formatAsXML(data, options) {
        const sections = [];
        const indent = ' '.repeat(options.indentSize || 2);
        // System prompt section
        if (data.systemPrompt) {
            sections.push(`<system>\n${indent}${this.escapeXml(data.systemPrompt)}\n</system>`);
        }
        // Role section
        if (data.role) {
            sections.push(this.formatXMLSection('role', data.role, indent));
        }
        // Tools section
        if (data.tools) {
            sections.push(this.formatXMLSection('tools', data.tools, indent));
        }
        // Context section
        if (data.context) {
            if (typeof data.context === 'object') {
                sections.push(this.formatXMLObject('context', data.context, indent));
            }
            else {
                sections.push(this.formatXMLSection('context', data.context, indent));
            }
        }
        // Conversation history
        if (data.conversation) {
            sections.push(this.formatXMLSection('conversation', data.conversation, indent));
        }
        // Examples section
        if (data.examples && data.examples.length > 0) {
            const examplesXML = data.examples.map(ex => `${indent}<example>\n${indent}${indent}<input>${this.escapeXml(ex.input)}</input>\n${indent}${indent}<output>${this.escapeXml(ex.output)}</output>\n${indent}</example>`).join('\n');
            sections.push(`<examples>\n${examplesXML}\n</examples>`);
        }
        // Constraints section
        if (data.constraints && data.constraints.length > 0) {
            sections.push(this.formatXMLSection('constraints', data.constraints, indent));
        }
        // Current question/task
        if (data.current) {
            sections.push(`<current>\n${indent}${this.escapeXml(data.current)}\n</current>`);
        }
        // Metadata section
        if (data.metadata) {
            sections.push(this.formatXMLObject('metadata', data.metadata, indent));
        }
        // Custom sections
        Object.entries(data).forEach(([key, value]) => {
            const knownKeys = ['role', 'tools', 'conversation', 'current', 'context',
                'systemPrompt', 'examples', 'constraints', 'metadata'];
            if (!knownKeys.includes(key) && value !== undefined) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    sections.push(this.formatXMLObject(key, value, indent));
                }
                else {
                    sections.push(this.formatXMLSection(key, value, indent));
                }
            }
        });
        return sections.join('\n\n');
    }
    /**
     * Format a section as XML
     */
    static formatXMLSection(name, content, indent) {
        if (Array.isArray(content)) {
            const items = content.map(item => `${indent}<item>${this.escapeXml(item)}</item>`).join('\n');
            return `<${name}>\n${items}\n</${name}>`;
        }
        else {
            return `<${name}>\n${indent}${this.escapeXml(content)}\n</${name}>`;
        }
    }
    /**
     * Format an object as XML
     */
    static formatXMLObject(name, obj, indent) {
        const entries = Object.entries(obj).map(([key, value]) => {
            if (typeof value === 'object' && !Array.isArray(value)) {
                return this.formatXMLObject(key, value, indent + '  ');
            }
            else if (Array.isArray(value)) {
                return this.formatXMLSection(key, value, indent + '  ');
            }
            else {
                return `${indent}<${key}>${this.escapeXml(String(value))}</${key}>`;
            }
        }).join('\n');
        return `<${name}>\n${entries}\n</${name}>`;
    }
    /**
     * Format context as JSON
     */
    static formatAsJSON(data, options) {
        const cleanData = this.cleanData(data);
        return JSON.stringify(cleanData, null, options.indentSize);
    }
    /**
     * Format context as Markdown
     */
    static formatAsMarkdown(data, _options) {
        const sections = [];
        if (data.systemPrompt) {
            sections.push(`## System Prompt\n\n${data.systemPrompt}`);
        }
        if (data.role) {
            const roleText = Array.isArray(data.role) ? data.role.join(', ') : data.role;
            sections.push(`## Role\n\n${roleText}`);
        }
        if (data.tools) {
            const toolsList = Array.isArray(data.tools)
                ? data.tools.map(t => `- ${t}`).join('\n')
                : `- ${data.tools}`;
            sections.push(`## Available Tools\n\n${toolsList}`);
        }
        if (data.context) {
            if (typeof data.context === 'object') {
                sections.push(`## Context\n\n\`\`\`json\n${JSON.stringify(data.context, null, 2)}\n\`\`\``);
            }
            else {
                sections.push(`## Context\n\n${data.context}`);
            }
        }
        if (data.conversation) {
            const convText = Array.isArray(data.conversation)
                ? data.conversation.map((msg, i) => `${i + 1}. ${msg}`).join('\n')
                : data.conversation;
            sections.push(`## Conversation History\n\n${convText}`);
        }
        if (data.examples && data.examples.length > 0) {
            const examplesText = data.examples.map((ex, i) => `### Example ${i + 1}\n\n**Input:** ${ex.input}\n\n**Output:** ${ex.output}`).join('\n\n');
            sections.push(`## Examples\n\n${examplesText}`);
        }
        if (data.constraints && data.constraints.length > 0) {
            const constraintsList = data.constraints.map(c => `- ${c}`).join('\n');
            sections.push(`## Constraints\n\n${constraintsList}`);
        }
        if (data.current) {
            sections.push(`## Current Task\n\n${data.current}`);
        }
        return sections.join('\n\n---\n\n');
    }
    /**
     * Escape XML special characters
     */
    static escapeXml(text) {
        // 防御性检查：确保 text 不是 undefined 或 null
        if (text === undefined || text === null) {
            console.warn('[ContextFormatter] escapeXml received undefined/null, returning empty string');
            return '';
        }
        // 确保是字符串
        const str = String(text);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    /**
     * Clean data for JSON output
     */
    static cleanData(data) {
        const result = {};
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    result[key] = this.cleanData(value);
                }
                else {
                    result[key] = value;
                }
            }
        });
        return result;
    }
    /**
     * Create message array for chat APIs
     */
    static createMessages(data, options = {}) {
        const messages = [];
        // Add system message if present
        if (data.systemPrompt) {
            messages.push({
                role: 'system',
                content: data.systemPrompt,
                timestamp: new Date().toISOString()
            });
        }
        // Add conversation history if present
        if (data.conversation && Array.isArray(data.conversation)) {
            data.conversation.forEach((msg, index) => {
                messages.push({
                    role: index % 2 === 0 ? 'user' : 'assistant',
                    content: msg,
                    timestamp: new Date().toISOString()
                });
            });
        }
        // Add current user message
        const userContent = this.format(data, options);
        messages.push({
            role: 'user',
            content: userContent,
            timestamp: new Date().toISOString()
        });
        return messages;
    }
    /**
     * Parse formatted context back to data object
     */
    static parse(formattedContent, format = 'xml') {
        switch (format) {
            case 'json':
                return JSON.parse(formattedContent);
            case 'xml':
                return this.parseXML(formattedContent);
            case 'markdown':
                return this.parseMarkdown(formattedContent);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    /**
     * Parse XML formatted content
     */
    static parseXML(xml) {
        const data = {};
        // Simple XML parsing using regex (for basic use cases)
        const tagPattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
        let match;
        while ((match = tagPattern.exec(xml)) !== null) {
            const [, tagName, content] = match;
            // Check if content contains nested items
            if (content.includes('<item>')) {
                const items = [];
                const itemPattern = /<item>([\s\S]*?)<\/item>/g;
                let itemMatch;
                while ((itemMatch = itemPattern.exec(content)) !== null) {
                    items.push(this.unescapeXml(itemMatch[1].trim()));
                }
                data[tagName] = items;
            }
            else {
                data[tagName] = this.unescapeXml(content.trim());
            }
        }
        return data;
    }
    /**
     * Parse Markdown formatted content
     */
    static parseMarkdown(markdown) {
        const data = {};
        const sections = markdown.split(/^## /m).filter(s => s.trim());
        sections.forEach(section => {
            const lines = section.split('\n');
            const title = lines[0].trim().toLowerCase().replace(/\s+/g, '_');
            const content = lines.slice(1).join('\n').trim();
            if (content.includes('- ')) {
                // Parse as list
                data[title] = content.split('\n')
                    .filter(line => line.startsWith('- '))
                    .map(line => line.substring(2).trim());
            }
            else {
                data[title] = content;
            }
        });
        return data;
    }
    /**
     * Unescape XML special characters
     */
    static unescapeXml(text) {
        return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
    }
    /**
     * Validate context data structure
     */
    static validate(data) {
        const errors = [];
        // Validate required fields based on use case
        if (data.conversation && !Array.isArray(data.conversation)) {
            errors.push('Conversation must be an array');
        }
        if (data.examples) {
            if (!Array.isArray(data.examples)) {
                errors.push('Examples must be an array');
            }
            else {
                data.examples.forEach((ex, i) => {
                    if (!ex.input || !ex.output) {
                        errors.push(`Example ${i} must have both input and output`);
                    }
                });
            }
        }
        if (data.constraints && !Array.isArray(data.constraints)) {
            errors.push('Constraints must be an array');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
exports.ContextFormatter = ContextFormatter;
exports.default = ContextFormatter;
ContextFormatter.DEFAULT_OPTIONS = {
    format: 'xml',
    escapeSpecialChars: true,
    indentSize: 2,
    maxDepth: 10,
    preserveWhitespace: false
};
