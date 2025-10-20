# Important Note About cliscore.sh Location

## TL;DR

**cliscore.sh is loaded from your current working directory (CWD), not from "project root".**

## Why This Matters

When you run:
```bash
cd examples/find-demo
cliscore test-find.md
```

cliscore looks for `cliscore.sh` in the directory you're currently in (`examples/find-demo/`), not at the project root.

## The Code

From `src/executor.js`:

```javascript
async loadSetupScript() {
    try {
      const setupPath = resolve(process.cwd(), 'cliscore.sh');
      //                          ^^^^^^^^^^^ Current working directory
      await access(setupPath);
      const content = await readFile(setupPath, 'utf-8');
      return content;
    } catch {
      return null;
    }
  }
```

## Examples

### ✅ Works
```bash
cd examples/find-demo
cliscore test-find.md
# Loads: ./cliscore.sh
```

### ✅ Also Works
```bash
cd examples/find-demo
cliscore ../other-demo/test.md
# Loads: ./cliscore.sh (from find-demo)
```

### ✗ Won't Find Our cliscore.sh
```bash
cd /home/sandro/cliscore  # Project root
cliscore examples/find-demo/test-find.md
# Looks for: /home/sandro/cliscore/cliscore.sh (doesn't exist)
# Won't find: /home/sandro/cliscore/examples/find-demo/cliscore.sh
```

## Design Philosophy

This behavior is intentional and useful:

1. **Per-directory configuration** - Different test directories can have different setups
2. **Test isolation** - Each test suite can have its own lifecycle functions
3. **Simple and predictable** - Just put cliscore.sh in the same directory you run from

## For This Demo

Always run from the `examples/find-demo/` directory:

```bash
cd examples/find-demo
./demo.sh           # ✓ Works
cliscore test-*.md  # ✓ Works
```

## Verification

Run the verification test to confirm cliscore.sh is being loaded:

```bash
cd examples/find-demo
cliscore test-verify-setup.md
```

This test explicitly checks:
- TEST_TMPDIR is set (from before_each_file)
- We're in the temp directory (from cd $TEST_TMPDIR)
- Helper functions are available (from cliscore.sh)
- Helper functions work correctly

If all tests pass, cliscore.sh is loading correctly!
