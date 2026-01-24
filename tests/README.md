# Tests for stack-submit.sh

This directory contains the test suite for the `stack-submit.sh` script.

## Test Framework

Tests are written using [BATS (Bash Automated Testing System)](https://github.com/bats-core/bats-core), a testing framework for Bash scripts.

## Prerequisites

### Installing BATS

**macOS:**
```bash
brew install bats-core
```

**Ubuntu/Debian:**
```bash
sudo apt-get install bats
```

**From source:**
```bash
git clone https://github.com/bats-core/bats-core.git
cd bats-core
./install.sh /usr/local
```

## Running Tests

### Using the test runner script

```bash
./tests/run-tests.sh           # Run all tests
./tests/run-tests.sh --verbose # Run with verbose output
```

### Using BATS directly

```bash
bats tests/stack-submit.bats
```

### Without BATS installed

The test runner will fall back to basic syntax checking if BATS is not available:

```bash
./tests/run-tests.sh
```

This will run:
- Bash syntax validation (`bash -n`)
- ShellCheck static analysis (if installed)

## Test Structure

The test suite covers:

### Helper Functions
- Script existence and executable permissions
- Bash syntax validation

### Git Helper Functions
- Current branch detection
- Branch existence checks (local and remote)
- Commit count calculations

### Branch Ancestry
- Ancestor detection between branches
- Stack detection for linear branches

### Stack Detection
- Linear stack identification
- Exclusion of branches not in the current stack

### Base Branch Detection
- Detection of `master` as base branch
- Detection of `main` as base branch

### Edge Cases
- Empty branch names
- Branches with no commit difference
- Deeply nested stacks

### Integration Tests
- Basic script execution without errors

## Writing New Tests

Add new tests to `stack-submit.bats` following the BATS format:

```bash
@test "description of what you're testing" {
    # Setup code here
    
    # Run command
    run some_command
    
    # Assertions
    [ "$status" -eq 0 ]
    [ "$output" = "expected output" ]
}
```

### Test Lifecycle

- `setup()`: Runs before each test (creates temporary git repo)
- `teardown()`: Runs after each test (cleans up temporary files)

## Test Coverage

Current coverage includes:
- Git operations (branch detection, ancestry, commit counting)
- Edge cases (empty inputs, identical branches)
- Stack depth handling

Areas for future test expansion:
- GitHub CLI mocking for PR creation tests
- Remote repository simulation
- Error handling paths
