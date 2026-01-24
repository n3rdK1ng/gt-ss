# gt-ss

[![CI](https://github.com/n3rdK1ng/gt-ss/actions/workflows/ci.yml/badge.svg)](https://github.com/n3rdK1ng/gt-ss/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/n3rdK1ng/gt-ss)](https://github.com/n3rdK1ng/gt-ss/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A bash script that automates the process of pushing all branches in a git stack and creating chained pull requests for each branch using GitHub CLI.

## What it does

The `stack-submit.sh` script:

- Finds all branches in your git stack (branches that are ancestors of the current branch)
- Pushes all branches in the stack to the remote repository
- Creates pull requests for each branch, chained together (first branch → base, subsequent branches → previous branch)
- Handles existing PRs gracefully (skips creation if PR already exists)

## Prerequisites

- **Git** - Must be installed and configured
- **GitHub CLI (gh)** - Required for PR creation
  - Install with: `brew install gh` (macOS) or your package manager
  - Authenticate with: `gh auth login`

## Setup

### 1. Clone or download this repository

Clone this repository to your desired location, or download the `stack-submit.sh` script.

### 2. Add the alias function to your `.zshrc`

Add the following function to your `~/.zshrc` file to intercept `gt ss` commands:

```bash
# Override gt command to intercept 'gt ss' for stack submit with PR creation
gt() {
	if [ "$1" = "ss" ]; then
		bash /path/to/gt-ss/stack-submit.sh
	else
		command gt "$@"
	fi
}
```

**Important:** Replace `/path/to/gt-ss/stack-submit.sh` with the actual absolute path to the `stack-submit.sh` script in this repository.

### 3. Reload your shell configuration

After adding the function, either:

- Restart your terminal, or
- Run: `source ~/.zshrc`

## Usage

Once set up, simply run:

```bash
gt ss
```

The script will:

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

1. **Branch Detection**: The script finds all branches that are ancestors of the current branch and have unique commits compared to the base branch (usually `main` or `master`).

2. **Branch Ordering**: Branches are sorted by the number of commits from the base branch, ensuring the correct order for chained PRs.

3. **Pushing**: Each branch is pushed to the remote. The script tries:

   - Regular push first
   - Setting upstream if branch doesn't exist remotely
   - Force-with-lease (safer force push)
   - Regular force push as last resort

4. **PR Creation**: For each branch:
   - First branch in stack → base branch (main/master)
   - Subsequent branches → previous branch in stack
   - PR title uses the first commit message
   - PR body lists all commits in that branch
   - Skips if PR already exists

## Troubleshooting

### GitHub CLI not installed

```
⚠️  GitHub CLI (gh) is not installed.
   Install it with: brew install gh
```

### Not authenticated with GitHub

```
⚠️  Not authenticated with GitHub CLI.
   Run: gh auth login
```

### Some branches failed to push

The script will continue with PR creation even if some branches fail to push. Check the output for specific error messages.

## Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- **Current Version**: See [VERSION](VERSION) file
- **Release History**: See [CHANGELOG.md](CHANGELOG.md)
- **Releases**: Available on the [Releases page](https://github.com/n3rdK1ng/gt-ss/releases)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development workflow
- Versioning strategy
- Release process
- Commit conventions

## License

This project is licensed under the MIT License.
