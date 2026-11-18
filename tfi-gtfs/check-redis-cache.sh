#!/bin/sh
# Redis cannot load RDB files written by a newer, incompatible version.
# Only discard the cache for that specific error; preserve other failures.
set -eu
rdb_file="${DATA_DIR:-/data}/dump.rdb"
[ -f "$rdb_file" ] || exit 0
check_log=$(mktemp)
trap 'rm -f "$check_log"' EXIT
if redis-check-rdb "$rdb_file" >"$check_log" 2>&1; then
    exit 0
fi
if grep -Fq "Can't handle RDB format version" "$check_log"; then
    backup=$(mktemp "${rdb_file}.incompatible.XXXXXX")
    if ! mv -f "$rdb_file" "$backup"; then
        rm -f "$backup"
        exit 1
    fi
    echo "Redis cache has an unsupported RDB version; moved it to $backup and will rebuild it."
else
    cat "$check_log" >&2
    echo "Redis cache check failed; preserving the file." >&2
    exit 1
fi
