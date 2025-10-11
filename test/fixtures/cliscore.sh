#!/bin/sh
# Example cliscore.sh setup/teardown file
#
# This file is sourced at the start of each test shell.
# You can define two special functions:
#   - cliscore_setup: Called after sourcing, before any tests run
#   - cliscore_teardown: Called before the shell exits
#
# Use these for invisible setup/teardown that shouldn't appear in test output.

# Setup function - runs once at shell start
cliscore_setup() {
    # Set up test environment
    export TEST_VAR="cliscore_test"
    export PATH="/custom/test/path:$PATH"

    # Create temporary directories if needed
    # mkdir -p /tmp/test-workspace
}

# Teardown function - runs once at shell end
cliscore_teardown() {
    # Clean up test environment
    # rm -rf /tmp/test-workspace
    true  # Ensure success even if cleanup fails
}

# Helper functions that tests can use
test_helper() {
    echo "Helper function called: $1"
}
