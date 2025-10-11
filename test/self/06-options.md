# Self-Test: Command Line Options

Test various command line options.

## JSON Output

```cliscore
$ cliscore --json fixtures/basic.md | head -1
{
```

JSON should be valid:

```cliscore
$ cliscore --json fixtures/basic.md > /tmp/cliscore-json.txt
$ cat /tmp/cliscore-json.txt | node -e "JSON.parse(require('fs').readFileSync(0)); console.log('valid')"
valid
```

## Dry Run

```cliscore
$ cliscore --dry-run fixtures/basic.md
Parsed 1 test file(s):
```

## JSON + Dry Run

```cliscore
$ cliscore --json --dry-run fixtures/basic.md | head -1
[
```

## Custom Language

```cliscore
$ echo '```shell-session' > /tmp/shell-session.md
$ echo '$ echo "custom lang"' >> /tmp/shell-session.md
$ echo 'custom lang' >> /tmp/shell-session.md
$ echo '```' >> /tmp/shell-session.md
$ cliscore --allow-lang shell-session /tmp/shell-session.md
✓ All tests passed! (1/1)
```
