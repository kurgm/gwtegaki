#!/usr/bin/env bash

set -e

if [ -z "$INDEX_GCS_DIR" ]; then
  echo "INDEX_GCS_DIR are required."
  exit 1
fi

echo "Copying dataset to a temporary directory."
time cp -r "$GCS_MNT_DIR/$INDEX_GCS_DIR" /tmp/dataset
echo "Copying completed."

HWR_INDEX_PATH=/tmp/dataset npm start
