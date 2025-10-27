# Self-Test: File Formats

Test that cliscore supports different file formats.

## Markdown Format

```console
$ cliscore --run fixtures/basic.md
...
✓ All tests passed! (1/1)
```

## UTF Format (.t files)

```console
$ cliscore --run fixtures/utf.t
...
✓ All tests passed! (2/2)
```

## Multiple Files

```console
$ cliscore --run fixtures/basic.md fixtures/utf.t
...
✓ All tests passed! (3/3)
```
