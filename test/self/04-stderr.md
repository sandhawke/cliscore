# Self-Test: Stderr Handling

Test stderr matching with [stderr:] syntax.

## Basic Stderr

```cliscore
$ cliscore fixtures/stderr.md
✓ All tests passed! (1/1)
```

## Multiple Stderr Lines

```cliscore
$ cat > /tmp/multi-stderr.md << 'EOF'
```cliscore
$ echo "out1" && echo "err1" >&2 && echo "out2" && echo "err2" >&2
out1
out2
[stderr: err1]
[stderr: err2]
EOF
```

```cliscore
$ cliscore /tmp/multi-stderr.md
✓ All tests passed! (1/1)
```

## Unexpected Stderr Detection

When stderr is not expected, test should fail:

```cliscore
$ cat > /tmp/unexpected-stderr.md << 'EOF'
```cliscore
$ echo "out" && echo "err" >&2
out
EOF
```

```cliscore
$ cliscore /tmp/unexpected-stderr.md
[stderr: ✗ 1 test]
```
