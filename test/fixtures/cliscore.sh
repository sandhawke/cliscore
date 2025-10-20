#!/bin/sh
# Example cliscore.sh setup/teardown file
#
# This file is sourced at the start of each test shell.
# You can define two special functions:
#   - before_each_file: Called after sourcing, before any tests run
#   - after_each_file: Called before the shell exits
#
# Use these for invisible setup/teardown that shouldn't appear in test output.

# Setup function - runs once at shell start
before_each_file() {
    # Set up test environment
    export TEST_VAR="cliscore_test"
    export PATH="/custom/test/path:$PATH"

    # Create temporary directories if needed
    # mkdir -p /tmp/test-workspace
}

# Teardown function - runs once at shell end
after_each_file() {
    # Clean up test environment
    # rm -rf /tmp/test-workspace
    true  # Ensure success even if cleanup fails
}

# Helper functions that tests can use
test_helper() {
    echo "Helper function called: $1"
}
