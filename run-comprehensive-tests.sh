#!/bin/bash

echo "🧪 Running Comprehensive YChart Editor Feature Tests"
echo "=================================================="
echo ""

# Run tests with timeout and proper configuration
timeout 300 pnpm exec playwright test comprehensive-features.spec.ts \
  --project=chromium \
  --reporter=list \
  --max-failures=5 \
  --timeout=30000 \
  --retries=0 \
  --workers=1

EXIT_CODE=$?

echo ""
echo "=================================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All tests completed successfully!"
elif [ $EXIT_CODE -eq 124 ]; then
  echo "⏱️  Tests timed out after 5 minutes"
else
  echo "❌ Tests failed with exit code: $EXIT_CODE"
fi

exit $EXIT_CODE
