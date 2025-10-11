# Self-Test: Prompt Styles

Test different prompt styles (user@host).

## User Prompts

```cliscore
$ echo '```cliscore' > /tmp/user-prompt.md
$ echo 'alice$ echo "user"' >> /tmp/user-prompt.md
$ echo 'user' >> /tmp/user-prompt.md
$ echo 'bob$ echo "another"' >> /tmp/user-prompt.md
$ echo 'another' >> /tmp/user-prompt.md
$ echo '```' >> /tmp/user-prompt.md
$ cliscore /tmp/user-prompt.md
✓ All tests passed! (2/2)
```

## User@Host Prompts

```cliscore
$ echo '```cliscore' > /tmp/host-prompt.md
$ echo 'alice@server$ echo "remote"' >> /tmp/host-prompt.md
$ echo 'remote' >> /tmp/host-prompt.md
$ echo 'bob@localhost$ echo "local"' >> /tmp/host-prompt.md
$ echo 'local' >> /tmp/host-prompt.md
$ echo '```' >> /tmp/host-prompt.md
$ cliscore /tmp/host-prompt.md
✓ All tests passed! (2/2)
```

## Mixed Prompts

```cliscore
$ echo '```cliscore' > /tmp/mixed-prompt.md
$ echo '$ echo "standard"' >> /tmp/mixed-prompt.md
$ echo 'standard' >> /tmp/mixed-prompt.md
$ echo 'alice$ echo "user"' >> /tmp/mixed-prompt.md
$ echo 'user' >> /tmp/mixed-prompt.md
$ echo 'alice@host$ echo "user@host"' >> /tmp/mixed-prompt.md
$ echo 'user@host' >> /tmp/mixed-prompt.md
$ echo '```' >> /tmp/mixed-prompt.md
$ cliscore /tmp/mixed-prompt.md
✓ All tests passed! (3/3)
```
