#!/usr/bin/env bash

set -e

if [ -z "$INDEX_GCS_BUCKET_NAME" ] || [ -z "$INDEX_GCS_DIR" ]; then
  echo "INDEX_GCS_BUCKET_NAME and INDEX_GCS_DIR are required."
  exit 1
fi

mkdir -p "$GCS_MNT_DIR"

echo "Mounting GCS Fuse."
gcsfuse --implicit-dirs -o ro "$INDEX_GCS_BUCKET_NAME" "$GCS_MNT_DIR"
echo "Mounting completed."

echo "Copying dataset to a temporary directory."
time cp -r "$GCS_MNT_DIR/$INDEX_GCS_DIR" /tmp/dataset
echo "Copying completed."

echo "Unmounting GCS Fuse."
fusermount -u "$GCS_MNT_DIR"
echo "Unmounting completed."

HWR_INDEX_PATH=/tmp/dataset npm start
