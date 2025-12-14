#!/bin/bash
# Create minimal placeholder assets
PNG_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
mkdir -p assets
echo "$PNG_BASE64" | base64 -d > assets/icon.png
echo "$PNG_BASE64" | base64 -d > assets/splash.png
echo "✅ Created placeholder assets"
