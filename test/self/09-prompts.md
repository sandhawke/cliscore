# Self-Test: Prompt Styles

Test different prompt styles (user@host).

## User Prompts

```cliscore
$ cat > /tmp/user-prompt.md << 'EOF'
```cliscore
alice$ echo "user"
user

bob$ echo "another"
another
EOF
```

```cliscore
$ cliscore /tmp/user-prompt.md
✓ All tests passed! (2/2)
```

## User@Host Prompts

```cliscore
$ cat > /tmp/host-prompt.md << 'EOF'
```cliscore
alice@server$ echo "remote"
remote

bob@localhost$ echo "local"
local
EOF
```

```cliscore
$ cliscore /tmp/host-prompt.md
✓ All tests passed! (2/2)
```

## Mixed Prompts

```cliscore
$ cat > /tmp/mixed-prompt.md << 'EOF'
```cliscore
$ echo "standard"
standard

alice$ echo "user"
user

alice@host$ echo "user@host"
user@host
EOF
```

```cliscore
$ cliscore /tmp/mixed-prompt.md
✓ All tests passed! (3/3)
```
