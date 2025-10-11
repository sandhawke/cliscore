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
✓ All tests passed! (3/3)
```

## Enhanced Syntax

Test bracketed syntax:

```cliscore
$ cat > /tmp/enhanced-test.md << 'EOF'
```cliscore
$ echo "test123"
[Matching: /test\d+/]

$ echo "file.txt"
[Matching glob: *.txt]

$ echo "[literal]"
[Literal text: "[literal]"]
EOF
```

```cliscore
$ cliscore /tmp/enhanced-test.md
✓ All tests passed! (3/3)
```
