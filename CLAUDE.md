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
- **State Management**: Zustand stores (`lib/stores/`)
- **AI Integration**: DeepSeek API for legal intelligence analysis
- **Component Library**: Radix UI components with custom styling (`components/ui/`)
- **Caching**: Multi-layer caching strategy (memory, localStorage, API-level)

### Data Flow Pattern
```
User Upload → File Parser → AI Analysis → Store → UI Components
                ↓                ↓           ↓
            Cache Layer    WebSocket    Performance Monitor
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

- `app/api/`: API routes for legal analysis, evidence quality, dispute analysis
- `lib/legal-intelligence/`: Core legal analysis modules (rule extraction, smart merging, provision mapping)
- `lib/stores/`: Zustand stores for application state
- `lib/agents/`: AI agent system with dialogue management and caching
- `components/acts/`: Four-act teaching system components
- `components/evidence/`, `components/dispute/`: Specialized legal UI components
- `__tests__/`: Comprehensive test suites for all modules

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

## Deployment

Deploy to Vercel with required environment variables configured in project settings. See DEPLOYMENT.md for detailed instructions.