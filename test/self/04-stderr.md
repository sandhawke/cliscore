# Self-Test: Stderr Handling

Test stderr matching with [stderr:] syntax.

## Basic Stderr

```cliscore
$ cliscore fixtures/stderr.md
✓ All tests passed! (1/1)
```

## Multiple Stderr Lines

```cliscore
$ echo '```cliscore' > /tmp/multi-stderr.md
$ echo '$ echo "out1" && echo "err1" >&2 && echo "out2" && echo "err2" >&2' >> /tmp/multi-stderr.md
$ echo 'out1' >> /tmp/multi-stderr.md
$ echo 'out2' >> /tmp/multi-stderr.md
$ echo '[stderr: err1]' >> /tmp/multi-stderr.md
$ echo '[stderr: err2]' >> /tmp/multi-stderr.md
$ echo '```' >> /tmp/multi-stderr.md
$ cliscore /tmp/multi-stderr.md
✓ All tests passed! (1/1)
```

## Unexpected Stderr Detection

When stderr is not expected, test should fail:

```cliscore
$ echo '```cliscore' > /tmp/unexpected-stderr.md
$ echo '$ echo "out" && echo "err" >&2' >> /tmp/unexpected-stderr.md
$ echo 'out' >> /tmp/unexpected-stderr.md
$ echo '```' >> /tmp/unexpected-stderr.md
$ cliscore /tmp/unexpected-stderr.md
[stderr: ✗ 1 test]
```
