#!/usr/bin/env bash

for _ in {1..100}; do
	HOST="http://localhost:3000" "$1"
	sleep 2s
done
