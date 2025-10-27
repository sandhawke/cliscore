# Self-Test: Pattern Matching

Test all pattern matching capabilities.

## Regex Patterns

```console
$ cliscore --run fixtures/patterns.md 2>&1 | grep -c "passed"
1
```

## All Patterns Pass

The fixture tests regex, glob, and ellipsis:

```console
$ cliscore --run fixtures/patterns.md
...
✓ All tests passed! (3/3)
```

## Enhanced Syntax

Test bracketed syntax directly:

```console
$ echo "test123"
[Matching: /test\d+/]
$ echo "file.txt"
[Matching glob: *.txt]
$ echo "[literal]"
[Literal text: "[literal]"]
```
