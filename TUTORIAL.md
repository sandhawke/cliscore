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

New prompt = new test. No blank lines between tests.

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
last
```

### Mid-line ellipsis (skip parts of a line)
```console
$ echo "Processed 12 of 20 files"
Processed ... files
```

Need a literal `...`? Escape it: `Wait \... please`.

### Capture values for later commands
```console
$ echo "Version: 1.2.3"
[Matching: /Version:\s*(?<VERSION>\d+\.\d+\.\d+)/]
$ echo "$VERSION"
1.2.3
```

Captured group names must be valid shell identifiers (`A-Z`, numbers, `_` after the first character). Values are exported into the test shell after the command succeeds, so later commands in the same file can reuse them. The global `/g` flag cannot be combined with named captures yet.

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

Optional file in or recursively above the directory with each test file:

```sh
before_each_file() {
    export MY_VAR="value"
}

after_each_file() {
    # cleanup
}

helper_function() {
    echo "usable as a command in test files"
}
```

Output from these functions is sent to the console (or buffered for
--json output), not matched as output in the tests.

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

Write shell commands. Write expected output patterns. Run `cliscore`.
