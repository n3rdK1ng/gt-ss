# Contributing to gt-ss

Thank you for your interest in contributing to gt-ss! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Versioning Strategy](#versioning-strategy)
- [Release Process](#release-process)
- [Commit Convention](#commit-convention)
- [Pull Request Guidelines](#pull-request-guidelines)

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/gt-ss.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `./tests/run-tests.sh`
6. Commit your changes using [conventional commits](#commit-convention)
7. Push and create a pull request

## Development Workflow

### Running Tests

```bash
# Install BATS (if not already installed)
# macOS: brew install bats-core
# Ubuntu: sudo apt-get install bats

# Run all tests
./tests/run-tests.sh

# Run with verbose output
./tests/run-tests.sh --verbose

# Run specific test file
bats tests/stack-submit.bats
```

### Code Quality

Before submitting a PR, ensure:

1. All tests pass: `./tests/run-tests.sh`
2. Syntax is valid: `bash -n stack-submit.sh`
3. ShellCheck passes (optional but recommended): `shellcheck stack-submit.sh`

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (SemVer):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Incompatible API changes (breaking changes)
- **MINOR**: New functionality in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

### Version Files

- `VERSION`: Contains the current version number
- `stack-submit.sh`: Contains version in header comment
- `CHANGELOG.md`: Documents all changes per version

### Examples

| Change Type | Before | After | Example |
|-------------|--------|-------|---------|
| Bug fix | 1.0.0 | 1.0.1 | Fixed edge case in branch detection |
| New feature | 1.0.1 | 1.1.0 | Added --dry-run option |
| Breaking change | 1.1.0 | 2.0.0 | Changed output format |

## Release Process

### For Maintainers

1. **Update version files**:
   ```bash
   # Update VERSION file
   echo "1.2.3" > VERSION
   
   # Update version in stack-submit.sh header
   # (Edit the Version: line in the header comment)
   ```

2. **Update CHANGELOG.md**:
   - Move items from `[Unreleased]` to new version section
   - Add release date
   - Update comparison links at bottom

3. **Commit the release**:
   ```bash
   git add VERSION CHANGELOG.md stack-submit.sh
   git commit -m "chore: release v1.2.3"
   ```

4. **Create and push tag**:
   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin main --tags
   ```

5. **Automated release**: The GitHub Action will automatically:
   - Verify VERSION matches the tag
   - Extract changelog for this version
   - Create a GitHub Release with release notes
   - Attach relevant files

### Pre-release Versions

For pre-releases, use suffixes:
- Alpha: `1.2.3-alpha.1`
- Beta: `1.2.3-beta.1`
- Release candidate: `1.2.3-rc.1`

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

### Examples

```bash
feat: add --dry-run option to preview changes
fix: handle branch names with slashes
docs: update installation instructions
refactor: extract push logic into separate function
test: add tests for edge cases
ci: add macOS to test matrix
chore: release v1.2.3
```

## Pull Request Guidelines

### Before Submitting

- [ ] Tests pass locally
- [ ] Code follows existing style
- [ ] Commit messages follow conventional commits
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Documentation updated (if applicable)

### PR Title

Use the same format as commits:
```
feat: add new awesome feature
fix: resolve issue with branch detection
```

### PR Description

Include:
- **What**: Brief description of changes
- **Why**: Motivation for the change
- **How**: Technical approach (if complex)
- **Testing**: How you tested the changes

### Review Process

1. CI must pass
2. At least one maintainer approval required
3. All comments addressed
4. Squash merge preferred for clean history

## Questions?

Feel free to open an issue for any questions or suggestions!
