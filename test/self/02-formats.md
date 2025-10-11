# Self-Test: File Formats

Test that cliscore supports different file formats.

## Markdown Format

```cliscore
$ cliscore fixtures/basic.md
✓ All tests passed! (1/1)
```

## UTF Format (.t files)

```cliscore
$ cliscore fixtures/utf.t
✓ All tests passed! (2/2)
```

## Multiple Files

```cliscore
$ cliscore fixtures/basic.md fixtures/utf.t
...
✓ All tests passed! (3/3)
```
