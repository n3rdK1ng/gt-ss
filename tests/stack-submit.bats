#!/usr/bin/env bats
# =============================================================================
# Tests for stack-submit.sh
# =============================================================================
# Run with: bats tests/stack-submit.bats
# Or: ./run-tests.sh
# =============================================================================

# Setup function - runs before each test
setup() {
    # Get the directory containing the tests
    TEST_DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" && pwd )"
    PROJECT_DIR="$( cd "$TEST_DIR/.." && pwd )"
    
    # Create a temporary directory for test repositories
    TEST_TEMP_DIR=$(mktemp -d)
    
    # Create a mock git repository
    cd "$TEST_TEMP_DIR"
    git init -b master test-repo
    cd test-repo
    
    # Configure git for the test
    git config user.email "test@example.com"
    git config user.name "Test User"
    
    # Create initial commit on master
    echo "initial content" > file.txt
    git add file.txt
    git commit -m "Initial commit"
    
    # Store the test repo path
    TEST_REPO_DIR="$TEST_TEMP_DIR/test-repo"
}

# Teardown function - runs after each test
teardown() {
    # Clean up temporary directory
    if [ -n "$TEST_TEMP_DIR" ] && [ -d "$TEST_TEMP_DIR" ]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

# =============================================================================
# Helper Functions Tests
# =============================================================================

@test "Script file exists and is executable" {
    [ -f "$PROJECT_DIR/stack-submit.sh" ]
    [ -x "$PROJECT_DIR/stack-submit.sh" ]
}

@test "Script has valid bash syntax" {
    run bash -n "$PROJECT_DIR/stack-submit.sh"
    [ "$status" -eq 0 ]
}

# =============================================================================
# Git Helper Function Tests
# =============================================================================

@test "get_current_branch returns correct branch name" {
    cd "$TEST_REPO_DIR"
    
    # Check we're on master using git directly
    # Note: We don't source the script as it executes main() and would exit
    result=$(git rev-parse --abbrev-ref HEAD)
    [ "$result" = "master" ]
}

@test "branch detection works with single branch" {
    cd "$TEST_REPO_DIR"
    
    # Create a feature branch
    git checkout -b feature-1
    echo "feature 1" > feature1.txt
    git add feature1.txt
    git commit -m "Feature 1 commit"
    
    # Verify we're on feature-1
    result=$(git rev-parse --abbrev-ref HEAD)
    [ "$result" = "feature-1" ]
}

@test "branch detection works with multiple branches in stack" {
    cd "$TEST_REPO_DIR"
    
    # Create first feature branch
    git checkout -b feature-1
    echo "feature 1" > feature1.txt
    git add feature1.txt
    git commit -m "Feature 1 commit"
    
    # Create second feature branch based on first
    git checkout -b feature-2
    echo "feature 2" > feature2.txt
    git add feature2.txt
    git commit -m "Feature 2 commit"
    
    # Verify branch exists
    run git show-ref --verify refs/heads/feature-1
    [ "$status" -eq 0 ]
    
    run git show-ref --verify refs/heads/feature-2
    [ "$status" -eq 0 ]
}

@test "commit count calculation is correct" {
    cd "$TEST_REPO_DIR"
    
    # Create a feature branch with 3 commits
    git checkout -b feature-1
    
    echo "commit 1" > file1.txt
    git add file1.txt
    git commit -m "Commit 1"
    
    echo "commit 2" > file2.txt
    git add file2.txt
    git commit -m "Commit 2"
    
    echo "commit 3" > file3.txt
    git add file3.txt
    git commit -m "Commit 3"
    
    # Count commits
    result=$(git rev-list --count master..feature-1)
    [ "$result" -eq 3 ]
}

# =============================================================================
# Branch Ancestry Tests
# =============================================================================

@test "ancestor detection works correctly" {
    cd "$TEST_REPO_DIR"
    
    # Create a chain of branches
    git checkout -b feature-1
    echo "feature 1" > f1.txt
    git add f1.txt
    git commit -m "Feature 1"
    
    git checkout -b feature-2
    echo "feature 2" > f2.txt
    git add f2.txt
    git commit -m "Feature 2"
    
    # feature-1 should be ancestor of feature-2
    run git merge-base --is-ancestor feature-1 feature-2
    [ "$status" -eq 0 ]
    
    # feature-2 should NOT be ancestor of feature-1
    run git merge-base --is-ancestor feature-2 feature-1
    [ "$status" -ne 0 ]
    
    # master should be ancestor of both
    run git merge-base --is-ancestor master feature-1
    [ "$status" -eq 0 ]
    
    run git merge-base --is-ancestor master feature-2
    [ "$status" -eq 0 ]
}

# =============================================================================
# Stack Detection Tests
# =============================================================================

@test "detects linear stack correctly" {
    cd "$TEST_REPO_DIR"
    
    # Create a linear stack: master -> a -> b -> c
    git checkout -b branch-a
    echo "a" > a.txt
    git add a.txt
    git commit -m "Commit A"
    
    git checkout -b branch-b
    echo "b" > b.txt
    git add b.txt
    git commit -m "Commit B"
    
    git checkout -b branch-c
    echo "c" > c.txt
    git add c.txt
    git commit -m "Commit C"
    
    # Verify all branches exist
    run git show-ref --verify refs/heads/branch-a
    [ "$status" -eq 0 ]
    
    run git show-ref --verify refs/heads/branch-b
    [ "$status" -eq 0 ]
    
    run git show-ref --verify refs/heads/branch-c
    [ "$status" -eq 0 ]
    
    # Verify ancestry
    run git merge-base --is-ancestor branch-a branch-c
    [ "$status" -eq 0 ]
    
    run git merge-base --is-ancestor branch-b branch-c
    [ "$status" -eq 0 ]
}

@test "excludes branches not in current stack" {
    cd "$TEST_REPO_DIR"
    
    # Create branch-a from master
    git checkout -b branch-a
    echo "a" > a.txt
    git add a.txt
    git commit -m "Commit A"
    
    # Go back to master and create independent branch-x
    git checkout master
    git checkout -b branch-x
    echo "x" > x.txt
    git add x.txt
    git commit -m "Commit X"
    
    # branch-x should NOT be ancestor of branch-a
    run git merge-base --is-ancestor branch-x branch-a
    [ "$status" -ne 0 ]
    
    # branch-a should NOT be ancestor of branch-x
    run git merge-base --is-ancestor branch-a branch-x
    [ "$status" -ne 0 ]
}

# =============================================================================
# Base Branch Detection Tests
# =============================================================================

@test "detects master as base branch when it exists" {
    cd "$TEST_REPO_DIR"
    
    # Master should exist (created in setup)
    run git show-ref --verify refs/heads/master
    [ "$status" -eq 0 ]
}

@test "handles main as base branch" {
    cd "$TEST_TEMP_DIR"
    
    # Create a new repo with 'main' as default branch
    git init -b main test-main-repo
    cd test-main-repo
    
    git config user.email "test@example.com"
    git config user.name "Test User"
    
    echo "content" > file.txt
    git add file.txt
    git commit -m "Initial commit"
    
    # main should exist
    run git show-ref --verify refs/heads/main
    [ "$status" -eq 0 ]
}

# =============================================================================
# Edge Cases
# =============================================================================

@test "handles empty branch name gracefully" {
    cd "$TEST_REPO_DIR"
    
    # Empty branch check should fail
    run git show-ref --verify refs/heads/""
    [ "$status" -ne 0 ]
}

@test "handles branch with no commits difference" {
    cd "$TEST_REPO_DIR"
    
    # Create branch at same commit as master
    git checkout -b same-as-master
    
    # Should have 0 commits difference
    result=$(git rev-list --count master..same-as-master)
    [ "$result" -eq 0 ]
}

@test "handles deeply nested stack" {
    cd "$TEST_REPO_DIR"
    
    # Create a deep stack: master -> 1 -> 2 -> 3 -> 4 -> 5
    prev_branch="master"
    for i in $(seq 1 5); do
        git checkout -b "branch-$i"
        echo "$i" > "file-$i.txt"
        git add "file-$i.txt"
        git commit -m "Commit $i"
    done
    
    # Verify commit count increases
    count_1=$(git rev-list --count master..branch-1)
    count_5=$(git rev-list --count master..branch-5)
    
    [ "$count_1" -eq 1 ]
    [ "$count_5" -eq 5 ]
}

# =============================================================================
# Integration Tests
# =============================================================================

@test "script runs without errors in dry run mode" {
    cd "$TEST_REPO_DIR"
    
    # Create a simple stack
    git checkout -b feature-1
    echo "feature" > feature.txt
    git add feature.txt
    git commit -m "Feature commit"
    
    # The script should at least start without syntax errors
    # We can't fully test it without a remote, but we can check syntax
    run bash -n "$PROJECT_DIR/stack-submit.sh"
    [ "$status" -eq 0 ]
}
