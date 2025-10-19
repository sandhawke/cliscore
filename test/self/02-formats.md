# Self-Test: File Formats

Test that cliscore supports different file formats.

## Markdown Format

```console
$ cliscore fixtures/basic.md
...
✓ All tests passed! (1/1)
```

## UTF Format (.t files)

```console
$ cliscore fixtures/utf.t
...
✓ All tests passed! (2/2)
```

## Multiple Files

```console
$ cliscore fixtures/basic.md fixtures/utf.t
...
✓ All tests passed! (3/3)
```
