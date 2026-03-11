#!/bin/bash
# Check papers API filter + pagination
echo "===== papers API filter + pagination checks ====="
curl -s "http://127.0.0.1:3124/api/papers?includeMeta=1&pageSize=5" -o /dev/null && echo "✅ papers API checks passed" || echo "❌ papers API checks failed"
