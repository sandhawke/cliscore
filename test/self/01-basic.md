# Self-Test: Basic Functionality

Test that cliscore can run simple tests and report results correctly.

## Passing Test

```console
$ cliscore --run fixtures/basic.md
...
✓ All tests passed! (1/1)
```

## Help Output

```console
$ cliscore --run --help | grep "Usage:"
Usage: cliscore [options] <test-files...>
```

## Version Info

The CLI should be executable:

```console
$ cliscore --run fixtures/basic.md 2>&1 | tail -1
✓ All tests passed! (1/1)
```
