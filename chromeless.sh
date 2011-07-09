#!/bin/sh -efu

CUDDLEFISH_ROOT="/usr/local/lib/chromeless"
export CUDDLEFISH_ROOT

"$CUDDLEFISH_ROOT/chromeless" "$@"
