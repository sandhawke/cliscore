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
   Continue? [Y/n]
   ```

2. **Wait for input**:
   - Press Enter or type 'y' → Run the command
   - Type 'n' → Skip the command (marks test as failed)

3. **Show output**: After execution, displays:
   ```
   --- Output ---
   stdout:
     hello
   Exit code: 0
   --- End Output ---
   ```

4. **Repeat** for next command

## Use Cases

- **Debugging failing tests**: See exactly which command fails and why
- **Exploring test behavior**: Run commands one at a time to understand what they do
- **Verifying test correctness**: Check that each command produces expected output
- **Learning**: Understand how tests work by stepping through them

## Example Session

```
$ cliscore --step test/fixtures/example.md

About to run: echo "Hello from markdown"
Continue? [Y/n] y

--- Output ---
stdout:
  Hello from markdown
Exit code: 0
--- End Output ---

About to run: pwd
Continue? [Y/n] y

--- Output ---
stdout:
  /home/user/project/test/fixtures
Exit code: 0
--- End Output ---

...
```

## Notes

- Step mode forces `--jobs 1` (sequential execution)
- Each command waits for user confirmation
- Skipped commands (answered 'n') are marked as failed
- Output is shown immediately after each command runs
- Test matching still happens at the end (normal pass/fail reporting)
