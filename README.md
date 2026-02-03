# gt-ss

A TypeScript CLI tool (using Bun runtime) that automates the process of pushing all branches in a git stack and creating chained pull requests for each branch using GitHub CLI.

## What it does

The `gt-ss` tool:

- Finds all branches in your git stack (branches that are ancestors of the current branch)
- Pushes all branches in the stack to the remote repository
- Creates pull requests for each branch, chained together (first branch → base, subsequent branches → previous branch)
- Handles existing PRs gracefully (skips creation if PR already exists)

## Prerequisites

- **Bun** - Runtime for executing TypeScript
  - Install with: `curl -fsSL https://bun.sh/install | bash` or `brew install bun`
- **Git** - Must be installed and configured
- **GitHub CLI (gh)** - Required for PR creation
  - Install with: `brew install gh` (macOS) or your package manager
  - Authenticate with: `gh auth login`

## Setup

### 1. Clone this repository

```bash
git clone <repository-url>
cd gt-ss
```

### 2. Install dependencies

```bash
bun install
```

### 3. Add the alias function to your `.zshrc`

Add the following function to your `~/.zshrc` file to intercept `gt ss` commands:

```bash
gt() {
  if [ "$1" = "ss" ]; then
    bun run /path/to/gt-ss/src/index.ts
  else
    command gt "$@"
  fi
}
```

**Important:** Replace `/path/to/gt-ss` with the actual absolute path to this repository.

### 4. Reload your shell configuration

After adding the function, either:

- Restart your terminal, or
- Run: `source ~/.zshrc`

## Usage

Once set up, simply run:

```bash
gt ss
```

You can also run it directly:

```bash
# Using npm script
bun run start

# Or directly
bun run src/index.ts
```

The tool will:

1. Detect all branches in your current stack
2. Push them to the remote repository
3. Create PRs for each branch (or skip if they already exist)

### Example workflow

```bash
# You're on branch feature-c
# Your stack looks like:
# main -> feature-a -> feature-b -> feature-c (current)

gt ss

# Output:
# 🔍 Getting branches in stack...
# 📋 Found 3 branch(es) in stack:
#   - feature-a (5 commits from main)
#   - feature-b (3 commits from main)
#   - feature-c (2 commits from main)
# 📤 Pushing branches to remote...
# ...
# 🚀 Creating PRs for each branch in the stack...
# ✅ Created PR for feature-a -> main
# ✅ Created PR for feature-b -> feature-a
# ✅ Created PR for feature-c -> feature-b
```

## How it works

1. **Branch Detection**: The tool finds all branches that are ancestors of the current branch and have unique commits compared to the base branch (usually `main` or `master`).

2. **Branch Ordering**: Branches are sorted by the number of commits from the base branch, ensuring the correct order for chained PRs.

3. **Pushing**: Each branch is pushed to the remote. The tool tries:

   - Regular push first
   - Setting upstream if branch doesn't exist remotely
   - Force-with-lease (safer force push)
   - Regular force push as last resort (requires `ALLOW_FORCE_PUSH=1` environment variable)

4. **PR Creation**: For each branch:
   - First branch in stack → base branch (main/master)
   - Subsequent branches → previous branch in stack
   - PR title uses the first commit message
   - PR body lists all commits in that branch
   - Skips if PR already exists

## Development

```bash
bun test        # Run all tests
bun run lint    # Check for linting issues
bun run lint:fix  # Auto-fix linting issues
bun run format  # Format code
```

## Environment Variables

- `ALLOW_FORCE_PUSH=1` - Enable regular force push as last resort (disabled by default for safety)

## Troubleshooting

### Bun not installed

```text
⚠️  Bun is not installed.
   Install it with: curl -fsSL https://bun.sh/install | bash
   Or: brew install bun
```

### GitHub CLI not installed

```text
⚠️  GitHub CLI (gh) is not installed.
   Install it with: brew install gh
```

### Not authenticated with GitHub

```text
⚠️  Not authenticated with GitHub CLI.
   Run: gh auth login
```

### Some branches failed to push

The tool will continue with PR creation even if some branches fail to push. Check the output for specific error messages.
