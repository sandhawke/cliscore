# Self-Test: Pattern Matching

Test all pattern matching capabilities.

## Regex Patterns

```cliscore
$ cliscore fixtures/patterns.md 2>&1 | grep -c "passed"
1
```

## All Patterns Pass

The fixture tests regex, glob, and ellipsis:

```cliscore
$ cliscore fixtures/patterns.md
...
✓ All tests passed! (3/3)
```

## Enhanced Syntax

Test bracketed syntax:

```cliscore
$ echo '```cliscore' > /tmp/enhanced-test.md
$ echo '$ echo "test123"' >> /tmp/enhanced-test.md
$ echo '[Matching: /test\d+/]' >> /tmp/enhanced-test.md
$ echo '$ echo "file.txt"' >> /tmp/enhanced-test.md
$ echo '[Matching glob: *.txt]' >> /tmp/enhanced-test.md
$ echo '$ echo "[literal]"' >> /tmp/enhanced-test.md
$ echo '[Literal text: "[literal]"]' >> /tmp/enhanced-test.md
$ echo '```' >> /tmp/enhanced-test.md
$ cliscore /tmp/enhanced-test.md
✓ All tests passed! (3/3)
```
