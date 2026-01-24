---
"gt-ss": patch
---

- Migrated from bash script to TypeScript CLI tool using Bun runtime
- Replaced stack-submit.sh with modular TypeScript architecture organized by feature domains
- Added comprehensive test suite with unit and integration tests
- Implemented Result<T, E> pattern for explicit error handling throughout the codebase
- Added Biome for linting and formatting
- Added Zod for runtime validation and TypeScript type inference
- Created modular structure with separate modules for git operations, GitHub CLI integration, stack detection, logging, shell execution, and utilities
- Added TypeScript configuration and proper type definitions
- Improved error handling with custom error types and Result pattern
- Added comprehensive logging with emoji indicators for better UX
- Maintained all original functionality: stack detection, branch pushing with fallback chain, and chained PR creation
- Added development tooling: test runner, linter, formatter, and proper project structure
