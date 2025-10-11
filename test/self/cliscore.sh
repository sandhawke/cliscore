#!/bin/sh
# Setup for self-testing cliscore
# This ensures the cliscore being tested is the one in the project root

cliscore_setup() {
    # Add the project's src directory to PATH so 'cliscore' resolves to our dev version
    # Assumes we're running from project root or test/self/
    if [ -d "src" ]; then
        # Running from project root
        export PATH="$(pwd)/src:$PATH"
    elif [ -d "../../src" ]; then
        # Running from test/self/
        export PATH="$(cd ../.. && pwd)/src:$PATH"
    else
        echo "Warning: Could not find src directory" >&2
    fi

    # Verify we're using the right cliscore
    export CLISCORE_SELF_TEST=1
}

cliscore_teardown() {
    # No cleanup needed
    true
}
