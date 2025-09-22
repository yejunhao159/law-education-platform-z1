# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Legal Education Platform (法学AI教学系统) built with Next.js, implementing a four-act teaching methodology based on Professor Su Li's educational philosophy. The system processes legal documents and provides AI-powered case analysis and Socratic dialogue for legal education.

## Architecture

### Core Application Flow
1. **Case Import (案例导入)**: Users upload legal judgment documents
2. **Deep Analysis (深度分析)**: AI extracts facts, disputes, and evidence
3. **Socratic Discussion (苏格拉底讨论)**: Interactive AI-guided dialogue
4. **Summary (总结提升)**: Judgment analysis and learning reports

### Key Architectural Components

- **Frontend**: React with Next.js App Router, TypeScript, Tailwind CSS
- **State Management**: Domain-Driven Design (DDD) with Zustand stores (`src/domains/`)
- **AI Integration**: DeepSeek API for legal intelligence analysis
- **Component Library**: Radix UI components with custom styling (`components/ui/`)
- **Caching**: Multi-layer caching strategy (memory, localStorage, API-level)

### DDD Architecture Overview
```
src/domains/
├── case-management/          # 案例管理域
├── teaching-acts/           # 教学活动域
├── socratic-dialogue/       # 苏格拉底对话域
├── legal-analysis/          # 法律分析域
├── shared/                  # 共享容器组件
├── stores.ts               # 统一导出
└── compatibility.ts        # 向后兼容层
```

### Data Flow Pattern
```
User Upload → File Parser → AI Analysis → Domain Store → Container → Presentation
                ↓                ↓            ↓           ↓
            Cache Layer    WebSocket    Business Logic   Pure UI
```

## Development Commands

```bash
# Development
npm run dev           # Start development server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:legal   # Test legal intelligence modules
npm run test:e2e     # Run Playwright E2E tests
npm run test:batch   # Batch test runner
npm run test:single  # Single test runner
npm run test:unit    # Unit tests for legal intelligence
npm run test:integration # Integration tests for API endpoints
npm run test:all     # Run all test suites
npm run test:tdd     # TDD mode for development

# Build & Production
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## API Configuration

The application requires DeepSeek API credentials. Set these environment variables:
- `DEEPSEEK_API_KEY`: Server-side API key
- `NEXT_PUBLIC_DEEPSEEK_API_KEY`: Client-side API key
- `DEEPSEEK_API_URL`: API endpoint URL

## Key Directories

### Core Application Structure
- `src/domains/`: Domain-Driven Design architecture
  - `case-management/stores/`: 案例管理相关状态
  - `teaching-acts/stores/`: 教学活动流程状态
  - `socratic-dialogue/stores/`: 苏格拉底对话状态
  - `legal-analysis/stores/`: 法律分析结果状态
  - `shared/containers/`: 业务逻辑容器组件
  - `shared/components/`: 展示层组件

### API & Services
- `app/api/`: API routes for legal analysis, evidence quality, dispute analysis
- `lib/legal-intelligence/`: Core legal analysis modules (rule extraction, smart merging, provision mapping)
- `lib/agents/`: AI agent system with dialogue management and caching

### UI Components
- `components/acts/`: Four-act teaching system components
- `components/evidence/`, `components/dispute/`: Specialized legal UI components
- `components/socratic/`: Socratic dialogue components
- `components/ui/`: Reusable UI primitives

### Testing
- `__tests__/`: Comprehensive test suites for all modules
- `src/domains/*/stores/__tests__/`: Domain-specific store tests

## Testing Strategy

- Unit tests for legal intelligence modules
- Integration tests for API endpoints
- E2E tests for critical user flows
- Current coverage: ~51% (target: 80% for critical modules)

## Performance Considerations

- Lazy loading for act components
- Virtual scrolling for long lists
- Debounced API calls
- Intelligent caching with TTL management
- WebSocket for real-time features in classroom mode

## Architecture Guidelines

### State Management Patterns
- Use domain-specific stores: `useCurrentCase()`, `useTeachingStore()`, `useSocraticStore()`, `useAnalysisStore()`
- Import from unified entry point: `import { useCurrentCase } from '@/src/domains/stores'`
- Backward compatibility available for legacy code via `useCaseStore()` from compatibility layer

### Component Structure
- **Container Components**: Handle business logic, data fetching, state management
- **Presentation Components**: Pure UI components, receive props from containers
- **Location**: Containers in `src/domains/shared/containers/`, presentations in `src/domains/shared/components/`

### Development Standards
- Follow DeepPractice TypeScript standards
- Use strict type checking with proper path mapping
- Implement container/presentation separation pattern
- Maintain backward compatibility during refactoring

## Deployment

Deploy to Vercel with required environment variables configured in project settings. See DEPLOYMENT.md for detailed instructions.