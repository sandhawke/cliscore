# Self-Test: Sanity Check

Verify the test environment is set up correctly.

## Check if cliscore.sh was loaded

```console
$ echo $CLISCORE_SELF_TEST
1
```

## Check if PATH contains our src

```console
$ echo $PATH | grep -o "/src" | head -1
/src
```

## Can we find cliscore?

```console
$ which cliscore
[Matching: /src/cliscore$/]
```
