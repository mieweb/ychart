#!/bin/bash

# Script to replace hardcoded CSS values with CSS variables in ychartEditor.ts and forceGraph.ts
# This script uses sed to perform find-and-replace operations

FILES=("src/ychartEditor.ts" "src/forceGraph.ts")

for file in "${FILES[@]}"; do
  echo "Processing $file..."
  
  # Colors
  sed -i '' 's/#667eea/var(--yc-color-primary)/g' "$file"
  sed -i '' 's/#5568d3/var(--yc-color-primary-dark)/g' "$file"
  sed -i '' 's/#764ba2/var(--yc-color-primary-light)/g' "$file"
  sed -i '' 's/#4A90E2/var(--yc-color-secondary)/g' "$file"
  sed -i '' 's/#f7fafc/var(--yc-color-button-bg)/g' "$file"
  sed -i '' 's/#edf2f7/var(--yc-color-button-bg-hover)/g' "$file"
  sed -i '' 's/#e2e8f0/var(--yc-color-button-border)/g' "$file"
  sed -i '' 's/#cbd5e0/var(--yc-color-button-border-hover)/g' "$file"
  sed -i '' 's/#4a5568/var(--yc-color-icon)/g' "$file"
  sed -i '' 's/#1a202c/var(--yc-color-gray-900)/g' "$file"
  sed -i '' 's/#2d3748/var(--yc-color-text-heading)/g' "$file"
  sed -i '' 's/#718096/var(--yc-color-text-muted)/g' "$file"
  sed -i '' 's/#a0aec0/var(--yc-color-text-light)/g' "$file"
  sed -i '' 's/#e74c3c/var(--yc-color-accent-red)/g' "$file"
  sed -i '' 's/#9b59b6/var(--yc-color-accent-purple)/g' "$file"
  sed -i '' 's/#f59e0b/var(--yc-color-warning-amber)/g' "$file"
  sed -i '' 's/#c53030/var(--yc-color-error-red-accent)/g' "$file"
  sed -i '' 's/#fc8181/var(--yc-color-error-red-border)/g' "$file"
  sed -i '' 's/#feb2b2/var(--yc-color-error-red-hover)/g' "$file"
  sed -i '' 's/#fee/var(--yc-color-error-light)/g' "$file"
  sed -i '' 's/#fff/var(--yc-color-text-inverse)/g' "$file"
  sed -i '' 's/#999/var(--yc-color-gray-600)/g' "$file"
  sed -i '' 's/#333/var(--yc-color-text-primary)/g' "$file"
  sed -i '' 's/#fafbfc/var(--yc-color-gray-50)/g' "$file"
  sed -i '' 's/#f5f7fa/var(--yc-color-gray-200)/g' "$file"
  
  # Font sizes (px to variables)
  sed -i '' 's/font-size: 9px/font-size: var(--yc-font-size-xs)/g' "$file"
  sed -i '' 's/font-size: 10px/font-size: var(--yc-font-size-xs)/g' "$file"
  sed -i '' 's/font-size: 11px/font-size: var(--yc-font-size-xs)/g' "$file"
  sed -i '' 's/font-size: 12px/font-size: var(--yc-font-size-sm)/g' "$file"
  sed -i '' 's/font-size: 13px/font-size: var(--yc-font-size-base)/g' "$file"
  sed -i '' 's/font-size: 14px/font-size: var(--yc-font-size-md)/g' "$file"
  sed -i '' 's/font-size: 18px/font-size: var(--yc-font-size-2xl)/g' "$file"
  sed -i '' 's/font-size: 22px/font-size: var(--yc-font-size-3xl)/g' "$file"
  
  # Font weights
  sed -i '' 's/font-weight: bold/font-weight: var(--yc-font-weight-bold)/g' "$file"
  sed -i '' 's/font-weight: 600/font-weight: var(--yc-font-weight-semibold)/g' "$file"
  
  # Border radius
  sed -i '' 's/border-radius: 4px/border-radius: var(--yc-border-radius-sm)/g' "$file"
  sed -i '' 's/border-radius: 6px/border-radius: var(--yc-border-radius-md)/g' "$file"
  sed -i '' 's/border-radius: 8px/border-radius: var(--yc-border-radius-lg)/g' "$file"
  sed -i '' 's/border-radius: 50%/border-radius: var(--yc-border-radius-full)/g' "$file"
  
  # Padding (common patterns)
  sed -i '' 's/padding: 4px 8px/padding: var(--yc-spacing-button-padding-sm)/g' "$file"
  sed -i '' 's/padding: 6px 10px/padding: var(--yc-spacing-sm) var(--yc-spacing-lg)/g' "$file"
  sed -i '' 's/padding: 6px 12px/padding: var(--yc-spacing-sm) var(--yc-spacing-xl)/g' "$file"
  sed -i '' 's/padding: 7px 10px/padding: var(--yc-spacing-sm) var(--yc-spacing-lg)/g' "$file"
  
  # Line height
  sed -i '' 's/line-height: 1\.3/line-height: var(--yc-line-height-tight)/g' "$file"
  
  echo "Completed $file"
done

echo "All replacements complete!"
