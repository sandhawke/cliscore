# Self-Test: Stderr Handling

Test stderr matching with [stderr:] syntax.

## Basic Stderr

```console
$ cliscore fixtures/stderr.md
...
✓ All tests passed! (1/1)
```

## Multiple Stderr Lines

```console
$ echo "out1" && echo "err1" >&2 && echo "out2" && echo "err2" >&2
out1
out2
[stderr: err1]
[stderr: err2]
```
