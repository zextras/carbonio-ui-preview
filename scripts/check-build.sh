#!/bin/sh

if [ ! -f ../lib/index.js ] || [ ! -f ../lib-esm/index.js ]; then
    echo "index.js is not directly contained inside build package";
    exit 1;
fi
