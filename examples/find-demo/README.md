# Find Command Demo - Complete Lifecycle Example

This example demonstrates **all four cliscore lifecycle functions** working together to test the `find` command with proper temporary directory management.

## What This Demo Shows

1. **run_first()** - Checks for leftover directories before starting
2. **before_each_file()** - Creates a fresh temp directory for each test file
3. **Test execution** - All tests run in isolation in the temp directory
4. **after_each_file()** - Cleans up the temp directory
5. **run_last()** - Verifies cleanup and handles any remaining directories

## Files

- **cliscore.sh** - Lifecycle functions with detailed comments
- **test-find.md** - Tests for the `find` command
- **test-verify-setup.md** - Verification that cliscore.sh loads correctly
- **demo.sh** - Interactive demonstration script
- **README.md** - This file

## Important: cliscore.sh Location

**cliscore.sh is loaded from your current working directory**, not from "project root"!

This means:
- ✅ Run from `examples/find-demo/` → Loads `examples/find-demo/cliscore.sh`
- ✅ Run from project root with `examples/find-demo/test-find.md` → Loads `./cliscore.sh` (if it exists)
- ✅ Each subdirectory can have its own cliscore.sh with custom lifecycle functions

**For this demo to work, you must run from the examples/find-demo/ directory:**
```bash
cd examples/find-demo
cliscore test-find.md  # ✓ Finds ./cliscore.sh
```

Not from project root:
```bash
cliscore examples/find-demo/test-find.md  # ✗ Won't find examples/find-demo/cliscore.sh
```

## Running the Demo

### Quick Start

The easiest way to see everything in action:

```bash
./demo.sh
```

This script will:
1. Create a leftover temp directory (simulating a previous run)
2. Run the tests (showing lifecycle cleanup in action)
3. Verify all directories were cleaned up
4. Explain what each lifecycle function did

### Manual Testing

From this directory:

```bash
# Run the tests
cliscore test-find.md

# Run with verbose output to see test details
cliscore test-find.md -vv

# Create a leftover to see run_first() cleanup in action
mkdir /tmp/cliscore-find-demo.test
cliscore test-find.md
ls /tmp/cliscore-find-demo* # Should be empty!
```

## Lifecycle Flow

Here's what happens when you run the tests:

```
1. run_first() executes in a separate shell
   ├─ Checks for leftover /tmp/cliscore-find-demo* directories
   └─ Cleans them up if found

2. Test shell starts
   └─ cliscore.sh is sourced

3. before_each_file() executes in test shell
   ├─ Creates /tmp/cliscore-find-demo.XXXXXX
   ├─ Sets TEST_TMPDIR environment variable
   └─ Changes to the temp directory

4. All tests execute in the test shell
   ├─ Test 1: Find *.txt files
   ├─ Test 2: Find directories
   ├─ Test 3: Depth limits
   └─ ... etc ...

5. after_each_file() executes in test shell
   └─ Removes the temp directory

6. Test shell exits

7. run_last() executes in a separate shell
   ├─ Verifies all temp directories are gone
   └─ Cleans up any remaining directories (safety net)
```

## Key Concepts Demonstrated

### Separate Shells vs Test Shell

- **run_first()** and **run_last()** run in separate shells
  - Cannot set variables for tests
  - Always execute (even if test shell crashes)
  - Perfect for cleanup that MUST happen

- **before_each_file()** and **after_each_file()** run in test shell
  - Can set environment variables for tests
  - Can change working directory
  - Won't run if shell crashes (use run_last for critical cleanup)

### Environment Variables

The `TEST_TMPDIR` variable is set in `before_each_file()` and available to all tests:

```console
$ echo $TEST_TMPDIR
/tmp/cliscore-find-demo.Xaf7Qz
```

### Helper Functions

The `setup_test_files()` and `create_files_by_ext()` functions are defined in cliscore.sh and available to tests:

```console
$ setup_test_files
$ find . -name "*.txt"
./file1.txt
./dir1/file3.txt
```

### Safety Net Pattern

Notice the pattern:
- `after_each_file()` does normal cleanup
- `run_last()` provides a safety net in case `after_each_file()` didn't run

This is the recommended pattern for robust test suites.

## Viewing Lifecycle Output

To see the run_first/run_last output:

```bash
# Verbose mode shows some lifecycle info
cliscore test-find.md -vv

# JSON mode captures everything
cliscore test-find.md --json | jq '.results[0] | {
  runFirst: .runFirst,
  runLast: .runLast
}'
```

## Try It Yourself

1. Run the tests normally:
   ```bash
   cd examples/find-demo
   cliscore test-find.md
   ```

2. Manually create a leftover directory to see run_first() in action:
   ```bash
   mkdir /tmp/cliscore-find-demo.test123
   cliscore test-find.md -vv
   # You'll see run_first() detect and clean it up
   ```

3. Check that temp directories are cleaned up:
   ```bash
   ls -d /tmp/cliscore-find-demo* 2>/dev/null || echo "All clean!"
   ```

## Best Practices Shown

1. **Use a consistent naming pattern** - Makes cleanup easier
2. **Check for leftovers in run_first()** - Prevents test pollution
3. **Always clean up in run_last()** - Safety net for critical resources
4. **Use TEST_TMPDIR** - Standard way to pass temp directory to tests
5. **Provide helper functions** - DRY principle for test setup

## Learn More

See [SETUP.md](../../SETUP.md) for complete documentation on lifecycle functions.
