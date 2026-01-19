#!/bin/bash

# Get the current branch and base branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Try to get the trunk branch (usually main or master)
BASE_BRANCH=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null | sed 's|origin/||' || echo "")
if [ -z "$BASE_BRANCH" ]; then
	# Try common trunk branch names
	for TRUNK in main master; do
		if git show-ref --verify --quiet refs/heads/"$TRUNK" 2>/dev/null || git ls-remote --exit-code --heads origin "$TRUNK" &>/dev/null; then
			BASE_BRANCH="$TRUNK"
			break
		fi
	done
	# Default fallback
	[ -z "$BASE_BRANCH" ] && BASE_BRANCH="master"
fi

# Get all branches in the stack
echo "🔍 Getting branches in stack..."
BRANCH_ARRAY=()

# Find ALL branches that are ancestors of the current branch and have unique commits
ALL_BRANCHES=$(git branch --format='%(refname:short)' | grep -v "^$BASE_BRANCH$" || echo "")

# Collect all candidate branches (ancestors of current branch with unique commits)
CANDIDATE_BRANCHES=()

# Always include current branch
CANDIDATE_BRANCHES+=("$CURRENT_BRANCH")

# Find all other branches that are ancestors of current branch
for OTHER_BRANCH in $ALL_BRANCHES; do
	# Skip current branch (already added)
	[ "$OTHER_BRANCH" = "$CURRENT_BRANCH" ] && continue
	
	# Check if OTHER_BRANCH is an ancestor of CURRENT_BRANCH
	if git merge-base --is-ancestor "$OTHER_BRANCH" "$CURRENT_BRANCH" 2>/dev/null; then
		# Check if OTHER_BRANCH has commits not in base (it's part of the stack)
		COMMITS_NOT_IN_BASE=$(git rev-list --count "$BASE_BRANCH".."$OTHER_BRANCH" 2>/dev/null || echo "0")
		if [ "$COMMITS_NOT_IN_BASE" -gt 0 ]; then
			# This branch is part of the stack
			CANDIDATE_BRANCHES+=("$OTHER_BRANCH")
		fi
	fi
done

# Sort branches by number of commits from base (fewest first = earliest in stack)
# This gives us the order: base -> branch1 -> branch2 -> ... -> current
# Create a temporary file to store branch:commit_count pairs for sorting
TEMP_FILE=$(mktemp)
for BRANCH in "${CANDIDATE_BRANCHES[@]}"; do
	COMMIT_COUNT=$(git rev-list --count "$BASE_BRANCH".."$BRANCH" 2>/dev/null || echo "999999")
	printf "%05d %s\n" "$COMMIT_COUNT" "$BRANCH" >> "$TEMP_FILE"
done

# Sort by commit count and extract branch names
SORTED_BRANCHES=$(sort -n "$TEMP_FILE" | awk '{print $2}')
rm -f "$TEMP_FILE"

# Convert to array
BRANCH_ARRAY=()
while IFS= read -r BRANCH; do
	[ -n "$BRANCH" ] && BRANCH_ARRAY+=("$BRANCH")
done <<< "$SORTED_BRANCHES"

echo "📋 Found ${#BRANCH_ARRAY[@]} branch(es) in stack:"
for BRANCH in "${BRANCH_ARRAY[@]}"; do
	COMMIT_COUNT=$(git rev-list --count "$BASE_BRANCH".."$BRANCH" 2>/dev/null || echo "?")
	echo "  - $BRANCH ($COMMIT_COUNT commits from $BASE_BRANCH)"
done

# Push all branches in the stack
echo ""
echo "📤 Pushing branches to remote..."
PUSH_FAILED=0
for BRANCH in "${BRANCH_ARRAY[@]}"; do
	# Check if branch exists locally
	if git show-ref --verify --quiet refs/heads/"$BRANCH" 2>/dev/null; then
		echo "📤 Pushing $BRANCH..."
		
		# Check if branch exists remotely
		BRANCH_EXISTS_REMOTELY=$(git ls-remote --exit-code --heads origin "$BRANCH" 2>/dev/null && echo "yes" || echo "no")
		
		# Try regular push first
		if git push origin "$BRANCH" 2>/dev/null; then
			echo "   ✅ Pushed $BRANCH"
		elif [ "$BRANCH_EXISTS_REMOTELY" = "no" ]; then
			# Branch doesn't exist remotely, try to set upstream
			if git push -u origin "$BRANCH" 2>/dev/null; then
				echo "   ✅ Pushed $BRANCH (set upstream)"
			else
				echo "   ⚠️  Failed to push $BRANCH"
				PUSH_FAILED=1
			fi
		else
			# Branch exists remotely but push failed - likely needs force push
			# Try force-with-lease first (safer - only force if remote hasn't changed)
			if git push --force-with-lease origin "$BRANCH" 2>/dev/null; then
				echo "   ✅ Force-pushed $BRANCH (with lease)"
			else
				# Force-with-lease failed, try regular force push
				if git push --force origin "$BRANCH" 2>/dev/null; then
					echo "   ✅ Force-pushed $BRANCH"
				else
					echo "   ⚠️  Failed to push $BRANCH (even with force)"
					PUSH_FAILED=1
				fi
			fi
		fi
	else
		echo "   ⏭️  Skipping $BRANCH (branch doesn't exist locally)"
	fi
done

if [ $PUSH_FAILED -eq 1 ]; then
	echo ""
	echo "⚠️  Some branches failed to push. Continuing with PR creation..."
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
	echo "⚠️  GitHub CLI (gh) is not installed."
	echo "   Install it with: brew install gh"
	echo "   Or create PRs manually at: https://github.com/$(git config --get remote.origin.url | sed -E 's/.*github.com[:/]([^/]+\/[^/]+)\.git/\1/')"
	exit 0
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
	echo "⚠️  Not authenticated with GitHub CLI."
	echo "   Run: gh auth login"
	exit 0
fi

# Get the repository name
REPO=$(git config --get remote.origin.url | sed -E 's/.*github.com[:/]([^/]+\/[^/]+)(\.git)?/\1/')

echo ""
echo "🚀 Creating PRs for each branch in the stack..."

# Create PRs for each branch
PREV_BRANCH=""
for BRANCH in "${BRANCH_ARRAY[@]}"; do
	# Skip if branch doesn't exist remotely
	if ! git ls-remote --exit-code --heads origin "$BRANCH" &> /dev/null; then
		echo "⏭️  Skipping $BRANCH (not pushed yet)"
		continue
	fi

	# Determine the base branch for this PR
	# First branch in stack goes to trunk, others chain to previous branch
	if [ -z "$PREV_BRANCH" ]; then
		PR_BASE="$BASE_BRANCH"
	else
		PR_BASE="$PREV_BRANCH"
	fi
	
	# Skip if trying to create PR from base branch to itself
	if [ "$BRANCH" = "$PR_BASE" ]; then
		echo "⏭️  Skipping $BRANCH (same as base branch)"
		continue
	fi

	# Check if PR already exists
	EXISTING_PR=$(gh pr view "$BRANCH" --repo "$REPO" --json number,url 2>/dev/null || echo "")
	if [ -n "$EXISTING_PR" ]; then
		PR_NUMBER=$(echo "$EXISTING_PR" | jq -r '.number' 2>/dev/null || echo "")
		PR_URL=$(echo "$EXISTING_PR" | jq -r '.url' 2>/dev/null || echo "")
		if [ -n "$PR_NUMBER" ] && [ "$PR_NUMBER" != "null" ]; then
			echo "✅ PR #$PR_NUMBER already exists for $BRANCH -> $PR_BASE"
			if [ -n "$PR_URL" ] && [ "$PR_URL" != "null" ]; then
				echo "   $PR_URL"
			fi
		else
			echo "✅ PR already exists for $BRANCH"
		fi
	else
		# Get commits that are ONLY in this branch, not in the base
		# This ensures each PR only shows commits unique to that branch
		COMMITS=$(git log "$PR_BASE".."$BRANCH" --oneline --format="%H" 2>/dev/null || echo "")
		COMMIT_COUNT=$(echo "$COMMITS" | grep -c . || echo "0")
		
		if [ "$COMMIT_COUNT" -eq 0 ]; then
			echo "⏭️  Skipping $BRANCH (no commits compared to $PR_BASE)"
		else
			# Get the first commit message as PR title (only from this branch's commits)
			PR_TITLE=$(git log "$PR_BASE".."$BRANCH" --oneline --format="%s" | head -n1)
			
			# Fallback title if empty
			if [ -z "$PR_TITLE" ]; then
				PR_TITLE="$BRANCH"
			fi
			
			# Get commit messages ONLY from this branch (not from parent branches)
			PR_BODY=$(git log "$PR_BASE".."$BRANCH" --oneline --format="- %s" 2>/dev/null || echo "")
			
			# Add a header if we have commits
			if [ -n "$PR_BODY" ]; then
				PR_BODY="## Commits

$PR_BODY"
			fi
			
			echo "📝 Creating PR for $BRANCH -> $PR_BASE ($COMMIT_COUNT commit(s))"
			PR_OUTPUT=$(gh pr create \
				--base "$PR_BASE" \
				--head "$BRANCH" \
				--title "$PR_TITLE" \
				--body "$PR_BODY" \
				--repo "$REPO" 2>&1)
			
			if [ $? -eq 0 ]; then
				echo "   ✅ Created PR for $BRANCH"
				echo "   $PR_OUTPUT"
			else
				echo "   ⚠️  Failed to create PR for $BRANCH"
				echo "   Error: $PR_OUTPUT"
			fi
		fi
	fi

	PREV_BRANCH="$BRANCH"
done

echo ""
echo "✅ Done! Stack pushed and PRs created."
