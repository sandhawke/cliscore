# Self-Test: Sanity Check

Verify the test environment is set up correctly.

## Check if cliscore.sh was loaded

```cliscore
$ echo $CLISCORE_SELF_TEST
1
```

## Check if PATH contains our src

```cliscore
$ echo $PATH | grep -o "/src" | head -1
/src
```

## Can we find cliscore?

```cliscore
$ which cliscore
[Matching: /src/cliscore$/]
```
