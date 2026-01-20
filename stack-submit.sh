#!/bin/bash

# =============================================================================
# stack-submit.sh - Automated stacked PR creation tool
# =============================================================================
# This script automates the process of pushing branches and creating chained
# pull requests for git stacks.
#
# Usage: ./stack-submit.sh
#
# Requirements:
#   - git: Must be installed and configured
#   - gh (GitHub CLI): Required for PR creation, must be authenticated
#
# Environment Variables:
#   - ALLOW_FORCE_PUSH: Set to "1" to allow regular force push as last resort
#                       (default: disabled for safety)
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
readonly SCRIPT_NAME="stack-submit"
readonly VERSION="1.0.0"

# =============================================================================
# Utility Functions
# =============================================================================

# Print an informational message
log_info() {
    echo "$1"
}

# Print a success message
log_success() {
    echo "   ✅ $1"
}

# Print a warning message
log_warning() {
    echo "   ⚠️  $1"
}

# Print a skip message
log_skip() {
    echo "   ⏭️  $1"
}

# =============================================================================
# Git Helper Functions
# =============================================================================

# Get the current branch name
# Returns: branch name on stdout, exits with error if not in a git repository
get_current_branch() {
    local branch
    if ! branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); then
        log_info "❌ Error: Not in a git repository or git is not installed"
        exit 1
    fi
    echo "$branch"
}

# Check if a branch exists locally
# Arguments:
#   $1 - branch: The branch name to check
# Returns: 0 if exists, 1 if not
branch_exists_locally() {
    local branch="$1"
    git show-ref --verify --quiet "refs/heads/$branch" 2>/dev/null
}

# Check if a branch exists on the remote (origin)
# Arguments:
#   $1 - branch: The branch name to check
# Returns: 0 if exists on remote, 1 if not
branch_exists_remotely() {
    local branch="$1"
    git ls-remote --exit-code --heads origin "$branch" &>/dev/null
}

# Get the number of commits between two branches
# Arguments:
#   $1 - base: The base branch
#   $2 - branch: The target branch
# Returns: Number of commits on stdout (0 if error)
get_commit_count() {
    local base="$1"
    local branch="$2"
    git rev-list --count "$base".."$branch" 2>/dev/null || echo "0"
}

# Check if one branch is an ancestor of another
# Arguments:
#   $1 - ancestor: The potential ancestor branch
#   $2 - descendant: The potential descendant branch
# Returns: 0 if ancestor is an ancestor of descendant, 1 otherwise
is_ancestor() {
    local ancestor="$1"
    local descendant="$2"
    git merge-base --is-ancestor "$ancestor" "$descendant" 2>/dev/null
}

# =============================================================================
# Core Functions
# =============================================================================

# Detect the base/trunk branch (usually main or master)
# Tries in order: remote HEAD, common trunk names (main, master), fallback to master
# Returns: Branch name on stdout
detect_base_branch() {
    local base_branch=""
    
    # First, try to get the remote default branch using symbolic-ref
    # This is the most reliable way to determine the true default branch
    base_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo "")
    
    if [ -z "$base_branch" ]; then
        # Try common trunk branch names
        for trunk in main master; do
            if branch_exists_locally "$trunk" || branch_exists_remotely "$trunk"; then
                base_branch="$trunk"
                break
            fi
        done
    fi
    
    # Default fallback
    [ -z "$base_branch" ] && base_branch="master"
    
    echo "$base_branch"
}

# Find all branches in the current stack
# Arguments:
#   $1 - current_branch: The branch we're currently on
#   $2 - base_branch: The trunk branch (main/master)
# Returns: Branch names sorted by commit count (earliest in stack first), one per line
find_stack_branches() {
    local current_branch="$1"
    local base_branch="$2"
    local candidate_branches=()
    local temp_file

    # Always include current branch
    candidate_branches+=("$current_branch")

    # Get all branches except base branch into an array to handle spaces safely
    local all_branches=()
    while IFS= read -r branch; do
        [ -n "$branch" ] && all_branches+=("$branch")
    done < <(git branch --format='%(refname:short)' | grep -vxF "$base_branch" || true)

    # Find branches that are ancestors of current branch with unique commits
    for other_branch in "${all_branches[@]}"; do
        # Skip current branch (already added)
        [ "$other_branch" = "$current_branch" ] && continue

        # Check if other_branch is an ancestor of current_branch
        if is_ancestor "$other_branch" "$current_branch"; then
            local commits_not_in_base
            commits_not_in_base=$(get_commit_count "$base_branch" "$other_branch")
            if [ "$commits_not_in_base" -gt 0 ]; then
                candidate_branches+=("$other_branch")
            fi
        fi
    done
    
    # Sort branches by commit count (fewest first = earliest in stack)
    temp_file=$(mktemp)
    trap 'rm -f "$temp_file"' EXIT
    for branch in "${candidate_branches[@]}"; do
        local commit_count
        commit_count=$(get_commit_count "$base_branch" "$branch")
        printf "%05d %s\n" "$commit_count" "$branch" >> "$temp_file"
    done
    
    # Sort and output branch names
    sort -n "$temp_file" | awk '{print $2}'
    rm -f "$temp_file"
    trap - EXIT
}

# Push a single branch to remote with fallback strategies
# Tries: regular push -> set upstream -> force-with-lease -> force (if enabled)
# Arguments:
#   $1 - branch: The branch name to push
# Returns: 0 on success, 1 on failure
push_branch() {
    local branch="$1"
    
    if ! branch_exists_locally "$branch"; then
        log_skip "Skipping $branch (branch doesn't exist locally)"
        return 1
    fi
    
    log_info "📤 Pushing $branch..."
    
    local exists_remotely="no"
    if branch_exists_remotely "$branch"; then
        exists_remotely="yes"
    fi
    
    # Try regular push first
    if git push origin "$branch" 2>/dev/null; then
        log_success "Pushed $branch"
        return 0
    fi
    
    # If branch doesn't exist remotely, try setting upstream
    if [ "$exists_remotely" = "no" ]; then
        if git push -u origin "$branch" 2>/dev/null; then
            log_success "Pushed $branch (set upstream)"
            return 0
        fi
        log_warning "Failed to push $branch"
        return 1
    fi
    
    # Try force-with-lease (safer force push)
    if git push --force-with-lease origin "$branch" 2>/dev/null; then
        log_success "Force-pushed $branch (with lease)"
        return 0
    fi
    
    # Last resort: regular force push (requires explicit opt-in)
    if [ "${ALLOW_FORCE_PUSH:-0}" = "1" ]; then
        if git push --force origin "$branch" 2>/dev/null; then
            log_success "Force-pushed $branch"
            return 0
        fi
        log_warning "Failed to push $branch (even with force)"
        return 1
    fi
    
    log_warning "Failed to push $branch (force-with-lease failed; set ALLOW_FORCE_PUSH=1 to allow regular force push)"
    return 1
}

# Push all branches in the stack to remote
# Arguments:
#   $@ - branches: Array of branch names to push
# Returns: 0 if all succeeded, 1 if any failed
push_all_branches() {
    local branches=("$@")
    local push_failed=0
    
    log_info ""
    log_info "📤 Pushing branches to remote..."
    
    for branch in "${branches[@]}"; do
        if ! push_branch "$branch"; then
            push_failed=1
        fi
    done
    
    if [ $push_failed -eq 1 ]; then
        log_info ""
        log_info "⚠️  Some branches failed to push. Continuing with PR creation..."
    fi
    
    return $push_failed
}

# Check GitHub CLI prerequisites (installed and authenticated)
# Returns: 0 if prerequisites met, 1 otherwise (with user-friendly messages)
check_gh_prerequisites() {
    # Check if GitHub CLI is available
    if ! command -v gh &> /dev/null; then
        log_info "⚠️  GitHub CLI (gh) is not installed."
        log_info "   Install it with: brew install gh"
        local repo_url=""
        repo_url=$(git config --get remote.origin.url 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+\/[^/]+)\.git/\1/' || true)
        if [ -n "$repo_url" ]; then
            log_info "   Or create PRs manually at: https://github.com/$repo_url"
        fi
        return 1
    fi
    
    # Check if authenticated with GitHub
    if ! gh auth status &> /dev/null; then
        log_info "⚠️  Not authenticated with GitHub CLI."
        log_info "   Run: gh auth login"
        return 1
    fi
    
    return 0
}

# Get the repository name from remote URL (owner/repo format)
# Returns: Repository name on stdout (e.g., "owner/repo")
get_repo_name() {
    local repo_url=""
    repo_url=$(git config --get remote.origin.url 2>/dev/null || true)
    if [ -n "$repo_url" ]; then
        # Extract owner/repo and explicitly strip .git suffix
        local repo_name
        repo_name=$(echo "$repo_url" | sed -E 's/.*github.com[:/]([^/]+\/[^/]+)$/\1/' 2>/dev/null || echo "")
        # Remove .git suffix if present
        repo_name="${repo_name%.git}"
        echo "$repo_name"
    else
        # Fallback to GITHUB_REPOSITORY env var if available
        echo "${GITHUB_REPOSITORY:-}"
    fi
}

# Create a PR for a single branch
# Return codes:
#   0 - Success (PR created or already exists)
#   1 - Error (failed to create PR)
#   2 - Skipped (branch not pushed or same as base - should not update prev_branch)
#   3 - Skipped (no commits compared to base - should still update prev_branch)
create_pr_for_branch() {
    local branch="$1"
    local pr_base="$2"
    local repo="$3"
    
    # Skip if branch doesn't exist remotely
    if ! branch_exists_remotely "$branch"; then
        log_skip "Skipping $branch (not pushed yet)"
        return 2
    fi
    
    # Skip if branch equals base
    if [ "$branch" = "$pr_base" ]; then
        log_skip "Skipping $branch (same as base branch)"
        return 2
    fi
    
    # Check if PR already exists
    local pr_number pr_url
    pr_number=$(gh pr view "$branch" --repo "$repo" --jq '.number' 2>/dev/null || echo "")
    pr_url=$(gh pr view "$branch" --repo "$repo" --jq '.url' 2>/dev/null || echo "")
    
    if [ -n "$pr_number" ] && [ "$pr_number" != "null" ] && [ "$pr_number" != "" ]; then
        log_info "✅ PR #$pr_number already exists for $branch -> $pr_base"
        [ -n "$pr_url" ] && [ "$pr_url" != "null" ] && log_info "   $pr_url"
        return 0
    fi
    
    # Get commits unique to this branch
    local commit_count
    commit_count=$(get_commit_count "$pr_base" "$branch")
    
    if [ "$commit_count" -eq 0 ]; then
        log_skip "Skipping $branch (no commits compared to $pr_base)"
        # Return 3 to indicate "no commits" skip - prev_branch should still be updated
        # to maintain the PR chain structure for subsequent branches
        return 3
    fi
    
    # Generate PR title from first commit message
    local pr_title
    pr_title=$(git log "$pr_base".."$branch" --oneline --format="%s" 2>/dev/null | head -n1 || echo "")
    [ -z "$pr_title" ] && pr_title="$branch"
    
    # Generate PR body from commit messages
    local pr_body
    pr_body=$(git log "$pr_base".."$branch" --oneline --format="- %s" 2>/dev/null || echo "")
    
    if [ -n "$pr_body" ]; then
        pr_body="## Commits

$pr_body"
    fi
    
    # Create the PR
    log_info "📝 Creating PR for $branch -> $pr_base ($commit_count commit(s))"
    
    local pr_output
    if pr_output=$(gh pr create \
        --base "$pr_base" \
        --head "$branch" \
        --title "$pr_title" \
        --body "$pr_body" \
        --repo "$repo" 2>&1); then
        log_success "Created PR for $branch"
        log_info "   $pr_output"
    else
        log_warning "Failed to create PR for $branch"
        log_info "   Error: $pr_output"
        return 1
    fi
}

# Create PRs for all branches in the stack
# Creates chained PRs where each branch targets the previous one in the stack
# Arguments:
#   $1 - base_branch: The trunk branch (first PR targets this)
#   $@ - branches: Array of branch names in stack order
# Returns: 0 if all PRs created/exist, 1 if any failed
create_all_prs() {
    local base_branch="$1"
    shift
    local branches=("$@")
    local repo
    local pr_failed=0
    
    repo=$(get_repo_name)
    
    log_info ""
    log_info "🚀 Creating PRs for each branch in the stack..."
    
    local prev_branch=""
    for branch in "${branches[@]}"; do
        local pr_base
        if [ -z "$prev_branch" ]; then
            pr_base="$base_branch"
        else
            pr_base="$prev_branch"
        fi
        
        local result=0
        create_pr_for_branch "$branch" "$pr_base" "$repo" || result=$?
        
        # Track PR creation failures (return code 1)
        if [ $result -eq 1 ]; then
            pr_failed=1
        fi
        
        # Update prev_branch to maintain PR chain structure
        # Return code 2 means the branch was skipped (not pushed or same as base) - don't update chain
        # Return code 3 means no commits but branch exists - still update chain to preserve structure
        # This ensures subsequent branches target the correct base in the stack
        if [ $result -ne 2 ]; then
            prev_branch="$branch"
        fi
    done
    
    if [ $pr_failed -eq 1 ]; then
        log_info ""
        log_info "⚠️  Some PRs failed to create."
    fi
    
    return $pr_failed
}

# Display the stack summary showing all branches and their commit counts
# Arguments:
#   $1 - base_branch: The trunk branch
#   $@ - branches: Array of branch names in the stack
display_stack_summary() {
    local base_branch="$1"
    shift
    local branches=("$@")
    
    log_info "📋 Found ${#branches[@]} branch(es) in stack:"
    for branch in "${branches[@]}"; do
        local commit_count
        commit_count=$(get_commit_count "$base_branch" "$branch")
        log_info "  - $branch ($commit_count commits from $base_branch)"
    done
}

# =============================================================================
# Main Execution
# =============================================================================

# Main entry point - orchestrates the stack submission workflow
# 1. Detects branches in the stack
# 2. Pushes all branches to remote
# 3. Creates chained PRs for each branch
main() {
    log_info "$SCRIPT_NAME v$VERSION"
    
    # Get current and base branches
    local current_branch base_branch
    current_branch=$(get_current_branch)
    base_branch=$(detect_base_branch)

    # Find all branches in the stack
    log_info "🔍 Getting branches in stack..."

    local branch_array=()
    while IFS= read -r branch; do
        [ -n "$branch" ] && branch_array+=("$branch")
    done <<< "$(find_stack_branches "$current_branch" "$base_branch")"

    # Display stack summary
    display_stack_summary "$base_branch" "${branch_array[@]}"

    # Track overall status
    local push_status=0
    local pr_status=0

    # Push all branches
    push_all_branches "${branch_array[@]}" || push_status=$?

    # Check prerequisites and create PRs
    if check_gh_prerequisites; then
        create_all_prs "$base_branch" "${branch_array[@]}" || pr_status=$?
    else
        pr_status=1
    fi

    # Display appropriate final message based on results
    log_info ""
    if [ $push_status -eq 0 ] && [ $pr_status -eq 0 ]; then
        log_info "✅ Done! Stack pushed and PRs created successfully."
    elif [ $push_status -ne 0 ] && [ $pr_status -ne 0 ]; then
        log_info "⚠️  Done with issues: Some branches failed to push and some PRs failed to create."
    elif [ $push_status -ne 0 ]; then
        log_info "⚠️  Done with issues: Some branches failed to push."
    else
        log_info "⚠️  Done with issues: Some PRs failed to create."
    fi
}

# Run main function
main "$@"
