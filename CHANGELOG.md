# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-01-19

### Added
- Core stack-submit functionality
- Branch detection and ordering by commit count
- Multi-strategy push support
- GitHub CLI integration for PR creation
- PR title generation from first commit message
- PR body with commit list

### Features
- **Stack Detection**: Automatically identifies all branches in the current stack
- **Branch Ordering**: Sorts branches by commit count for correct PR chaining
- **Smart Pushing**: Tries regular push, then upstream setting, then force-with-lease
- **PR Creation**: Creates properly chained PRs with descriptive titles and bodies
- **Idempotent**: Safe to run multiple times - skips existing PRs

[Unreleased]: https://github.com/n3rdK1ng/gt-ss/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/n3rdK1ng/gt-ss/releases/tag/v1.0.0
