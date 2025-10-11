# Step Mode

Interactive mode for debugging and exploring tests.

## Usage

```bash
cliscore --step test.md
```

## Behavior

For each command in the test file:

1. **Prompt**: Shows the command to be executed
   ```
   About to run: echo "hello"
   Run test / skip as Pass / skip as Fail? [R/p/f]
   ```

2. **Wait for input**:
   - Press Enter, 'r', or 'run' → Run the command
   - Type 'p' or 'pass' → Skip command, mark test as passed
   - Type 'f' or 'fail' → Skip command, mark test as failed

3. **Show output** (if run): After execution, displays:
   ```
   --- Output ---
   stdout:
     hello
   Exit code: 0
   --- End Output ---

   ✓ Test PASSED
   ```

   Or if it fails:
   ```
   --- Output ---
   stdout:
     goodbye
   Exit code: 0
   --- End Output ---

   ✗ Test FAILED

   Failure details:
   Line 1 (stdout): Literal mismatch
     Expected: hello
     Got: goodbye
   ```

4. **Repeat** for next command

## Use Cases

- **Debugging failing tests**: See exactly which command fails and why with detailed mismatch info
- **Exploring test behavior**: Run commands one at a time to understand what they do
- **Verifying test correctness**: Check that each command produces expected output
- **Skipping slow tests**: Mark known-good tests as pass without running them
- **Learning**: Understand how tests work by stepping through them

## Example Session

```
$ cliscore --step test/fixtures/example.md

About to run: echo "Hello from markdown"
Run test / skip as Pass / skip as Fail? [R/p/f] r

--- Output ---
stdout:
  Hello from markdown
Exit code: 0
--- End Output ---

✓ Test PASSED

About to run: pwd
Run test / skip as Pass / skip as Fail? [R/p/f] p

✓ Test marked as PASS (skipped)

About to run: some-slow-command
Run test / skip as Pass / skip as Fail? [R/p/f] f

✗ Test marked as FAIL (skipped)

...
```

## Detailed Failure Information

When a test fails, step mode shows:
- Which line didn't match (line number and stream)
- What was expected (pattern type and value)
- What was actually received
- For regex/glob: why it didn't match
- For ellipsis: which pattern couldn't be found

This makes debugging much faster than reading raw test output.

## Notes

- Step mode forces `--jobs 1` (sequential execution)
- Each command waits for user action
- Skipped-as-pass: Test counts as passed without running
- Skipped-as-fail: Test counts as failed without running
- Output is shown immediately after each command runs
- Pass/fail determination happens immediately after execution
- Final summary shows total passed/failed including skipped tests
