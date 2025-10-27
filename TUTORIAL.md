# cliscore Tutorial

Write tests that look like shell sessions.

## Basic Test (.md file)

````markdown
```console
$ echo "hello"
hello
```
````

Commands start with `$` or `#`. Lines after are expected output.

## Multiple Commands

````markdown
```console
$ echo "first"
first
$ echo "second"
second
```
````

New prompt = new test. No blank lines needed between tests.

## Multiline Commands

````markdown
```console
$ echo "line1" && \
> echo "line2"
line1
line2
```
````

Continuation with `> `.

## Pattern Matching

### Regex (with flags)
```console
$ echo "teSt123"
te[Matching: /st\d+/i]
```

### Ellipsis (skip lines)
```console
$ printf "first\nsecond\nthird\nlast"
first
...
las
```

## Stderr

```console
$ (echo stdout line); (echo "error message" 1>&2)
stdout line
[stderr: error message]
```

Stdout and stderr can be interleaved in any order.

## Empty Lines

Empty lines in output must match exactly:

```console
$ printf "a\n\nb"
a

b
```

## Edge Cases

```console
$ echo "[literal brackets]"
[Literal text: "[literal brackets]"]
$ echo -n "no newline"
no newline (no-eol)
```

## Setup/Teardown (cliscore.sh)

Optional file in the directory where cliscore is run:

```sh
before_each_file() {
    export MY_VAR="value"
}

after_each_file() {
    # cleanup
}

helper_function() {
    echo "usable in tests"
}
```

Functions are sourced but their output is discarded.

## Running Tests

```bash
cliscore test.md                    # single file
cliscore tests/**/*.md              # glob pattern
cliscore --run                      # non-interactive
cliscore --fast tests/**/*.md       # parallel execution run mode
cliscore --percent                  # run all matching files and just report %
cliscore --debug / --json / --trace / ...etc
```

Exit code 0 = all passed, 1 = failures.

## That's It

Write shell commands. Write expected output. Run `cliscore`.
