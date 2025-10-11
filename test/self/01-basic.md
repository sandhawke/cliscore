# Self-Test: Basic Functionality

Test that cliscore can run simple tests and report results correctly.

## Passing Test

```cliscore
$ cliscore fixtures/basic.md
...
✓ All tests passed! (1/1)
```

## Help Output

```cliscore
$ cliscore --help | grep "Usage:"
Usage: cliscore [options] <test-files...>
```

## Version Info

The CLI should be executable:

```cliscore
$ cliscore fixtures/basic.md 2>&1 | tail -1
✓ All tests passed! (1/1)
```
