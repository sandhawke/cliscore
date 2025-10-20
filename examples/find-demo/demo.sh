#!/bin/bash
# Demonstration script for the find-demo lifecycle example

echo "=============================================="
echo "cliscore Lifecycle Demo"
echo "=============================================="
echo

# Step 1: Show we're in the demo directory
echo "📍 Step 1: We're in examples/find-demo/"
pwd
echo

# Step 2: Create a leftover directory to show run_first() cleanup
echo "📍 Step 2: Creating a leftover directory (simulating previous run)"
mkdir -p /tmp/cliscore-find-demo.leftover.123
echo "   Created: /tmp/cliscore-find-demo.leftover.123"
echo

# Step 3: Run the tests
echo "📍 Step 3: Running tests (watch for lifecycle functions)"
echo "   run_first() will detect and clean the leftover"
echo "   before_each_file() will create fresh temp directory"
echo "   after_each_file() will clean up"
echo "   run_last() will verify all clean"
echo
echo "Running: cliscore test-find.md"
echo "----------------------------------------"
../../src/cli.js test-find.md
echo "----------------------------------------"
echo

# Step 4: Verify cleanup
echo "📍 Step 4: Verify all temp directories were cleaned up"
if ls -d /tmp/cliscore-find-demo* 2>/dev/null; then
    echo "   ⚠️  WARNING: Found leftover directories!"
else
    echo "   ✅ All clean! Lifecycle functions worked perfectly."
fi
echo

# Step 5: Show what the lifecycle functions do
echo "📍 Step 5: What each lifecycle function does"
echo
echo "   run_first() (ran in separate shell before tests):"
echo "     - Checked for leftover /tmp/cliscore-find-demo* directories"
echo "     - Cleaned up the leftover.123 directory we created"
echo
echo "   before_each_file() (ran in test shell before tests):"
echo "     - Created fresh temp directory with mktemp -d"
echo "     - Set TEST_TMPDIR environment variable"
echo "     - Changed to temp directory (cd \$TEST_TMPDIR)"
echo
echo "   Tests ran..."
echo "     - All 17 tests executed in the temp directory"
echo "     - Tests used helper functions (setup_test_files, etc)"
echo "     - Tests verified temp directory isolation"
echo
echo "   after_each_file() (ran in test shell after tests):"
echo "     - Removed the temp directory"
echo
echo "   run_last() (ran in separate shell after tests):"
echo "     - Verified no temp directories remain"
echo "     - Would clean up any that existed (safety net)"

echo
echo "=============================================="
echo "Demo complete!"
echo "=============================================="
