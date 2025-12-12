# YChart CSS Variable System

This directory contains the complete CSS variable system for YChart, including framework integration bridges for Bootstrap and Tailwind CSS.

## 📁 Files

- **`_variables.scss`** - Core CSS custom properties with `--yc-` prefix
- **`style.scss`** - Main stylesheet using the CSS variables
- **`bootstrap-variables.scss`** - Bootstrap integration bridge
- **`tailwind-variables.scss`** - Tailwind CSS integration bridge

## 🎨 Variable Naming Convention

All YChart variables use the `--yc-` prefix followed by a semantic name:

```scss
--yc-{category}-{subcategory}-{variant}
```

### Examples:
- `--yc-color-primary` - Primary brand color
- `--yc-spacing-md` - Medium spacing unit
- `--yc-font-size-lg` - Large font size
- `--yc-border-radius-sm` - Small border radius

## 📚 Variable Categories

### Colors
- **Primary/Secondary**: Brand colors
- **Gray Scale**: 50-900 neutral tones
- **Text**: Primary, secondary, tertiary, muted
- **Background**: Primary, secondary, tertiary
- **State**: Error, warning, success
- **Interactive**: Button, icon colors

### Typography
- **Font Families**: Base (sans-serif), Mono
- **Font Sizes**: xs, sm, base, md, lg, xl, 2xl, 3xl, 4xl
- **Font Weights**: Normal (400), Medium (500), Semibold (600), Bold (700)
- **Line Heights**: Tight (1.3), Normal (1.5), Relaxed (1.75)

### Spacing
- **Scale**: xxs (2px) through 6xl (32px)
- **Component-specific**: Toolbar gaps, button padding

### Borders
- **Widths**: Thin (1px), Medium (2px), Thick (3px), Heavy (4px)
- **Radius**: sm (4px), md (6px), lg (8px), xl (12px), pill, full

### Shadows
- **Scale**: xs through 4xl
- **Component-specific**: Button shadows, node selection shadows

### Layout
- **Z-index**: Layered system (1-1001)
- **Sizing**: Common widths and heights

### Motion
- **Transitions**: Fast (200ms), Normal (300ms), Slow (400ms)
- **Transforms**: Button hover effects
- **Opacity**: States for hover, disabled, dragging

## 🚀 Usage

### Standalone Usage

Simply import the main stylesheet:

```typescript
// In your main.ts or component
import './styles/style.scss';
```

The CSS variables are automatically available throughout your application.

### Using Variables in Your Custom Styles

```scss
// In your custom SCSS file
@use 'variables' as *;

.my-component {
  background: var(--yc-color-primary);
  padding: var(--yc-spacing-md);
  border-radius: var(--yc-border-radius-lg);
  box-shadow: var(--yc-shadow-md);
  transition: all var(--yc-transition-normal);
  
  &:hover {
    background: var(--yc-color-primary-dark);
    transform: var(--yc-transform-button-hover);
  }
}
```

### Using in Inline Styles (TypeScript)

```typescript
// In your TypeScript files
element.style.cssText = `
  background: var(--yc-color-primary);
  padding: var(--yc-spacing-md);
  border-radius: var(--yc-border-radius-lg);
`;
```

## 🔗 Framework Integration

### Bootstrap Integration

To use YChart variables with Bootstrap:

1. Import the Bootstrap bridge **before** Bootstrap:

```scss
// In your main SCSS file
@use 'styles/bootstrap-variables';
@import 'bootstrap/scss/bootstrap';
```

This maps YChart variables to Bootstrap's variable names, giving you a consistent design system.

### Tailwind CSS Integration

#### Option 1: Extend Tailwind Config

Copy the configuration from `tailwind-variables.scss` into your `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        yc: {
          'primary': 'var(--yc-color-primary)',
          'secondary': 'var(--yc-color-secondary)',
          // ... more colors
        },
      },
      // ... more extensions
    },
  },
};
```

Then use in your HTML/JSX:

```html
<div class="bg-yc-primary text-yc-text-primary p-yc-md rounded-yc-lg">
  YChart styled with Tailwind
</div>
```

#### Option 2: Use Utility Classes

Import the Tailwind bridge to get pre-built utility classes:

```scss
// In your main SCSS
@import 'styles/tailwind-variables';
```

Then use the utility classes:

```html
<div class="bg-yc-primary text-yc-primary p-yc-md rounded-yc-lg">
  YChart utilities
</div>
```

## 🎯 Benefits

### 1. **Consistency**
All colors, spacing, and styling decisions are centralized.

### 2. **Maintainability**
Change one variable to update the entire application.

### 3. **Theming**
Easily create themes by overriding CSS variables:

```css
[data-theme="dark"] {
  --yc-color-bg-primary: #1a1a1a;
  --yc-color-text-primary: #ffffff;
  /* ... more dark theme overrides */
}
```

### 4. **Framework Flexibility**
Use YChart with Bootstrap, Tailwind, or standalone - same design system.

### 5. **Type Safety**
Variable names are semantic and self-documenting.

## 📝 Variable Reference

### Quick Reference Table

| Category | Variable Example | Value |
|----------|-----------------|-------|
| **Colors** |
| Primary | `--yc-color-primary` | `#667eea` |
| Secondary | `--yc-color-secondary` | `#4A90E2` |
| Gray | `--yc-color-gray-500` | `#ccc` |
| Text | `--yc-color-text-primary` | `#333` |
| Error | `--yc-color-error-red` | `#ff4444` |
| **Typography** |
| Base Font | `--yc-font-family-base` | System fonts |
| Base Size | `--yc-font-size-base` | `0.8125rem (13px)` |
| Bold | `--yc-font-weight-bold` | `700` |
| **Spacing** |
| Small | `--yc-spacing-sm` | `0.375rem (6px)` |
| Medium | `--yc-spacing-md` | `0.5rem (8px)` |
| Large | `--yc-spacing-lg` | `0.625rem (10px)` |
| **Borders** |
| Thin | `--yc-border-width-thin` | `1px` |
| Radius MD | `--yc-border-radius-md` | `0.375rem (6px)` |
| **Shadows** |
| Small | `--yc-shadow-sm` | `0 2px 4px rgba(0,0,0,0.1)` |
| Medium | `--yc-shadow-md` | `0 2px 5px rgba(0,0,0,0.1)` |
| **Transitions** |
| Fast | `--yc-transition-fast` | `0.2s ease` |
| Normal | `--yc-transition-normal` | `0.3s ease` |

## 🔧 Customization

### Override Variables

Create a custom theme file:

```scss
// _custom-theme.scss
:root {
  // Override primary color
  --yc-color-primary: #ff6b6b;
  --yc-color-primary-dark: #ee5a5a;
  
  // Override spacing
  --yc-spacing-unit: 0.625rem; // 10px instead of 8px
  
  // Override border radius
  --yc-border-radius-md: 0.5rem; // 8px instead of 6px
}
```

Import after the variables file:

```scss
@use 'variables';
@use 'custom-theme';
@use 'style';
```

### Add New Variables

Add to `_variables.scss` following the naming convention:

```scss
:root {
  // Custom feature color
  --yc-color-feature-highlight: #ffd700;
  
  // Custom spacing for specific component
  --yc-spacing-custom-gap: 1.25rem;
}
```

## 🐛 Troubleshooting

### Variables not working?

1. **Check import order**: Variables must be imported before use
2. **Use `var()` syntax**: `var(--yc-color-primary)` not `--yc-color-primary`
3. **Browser support**: CSS custom properties require modern browsers (IE11 not supported)

### SASS deprecation warnings?

Use `@use` instead of `@import`:

```scss
// ✅ Good
@use 'variables' as *;

// ❌ Deprecated
@import 'variables';
```

## 📖 Additional Resources

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [SASS @use Rule](https://sass-lang.com/documentation/at-rules/use)
- [Bootstrap Theming](https://getbootstrap.com/docs/5.3/customize/sass/)
- [Tailwind Configuration](https://tailwindcss.com/docs/configuration)

## 🤝 Contributing

When adding new hardcoded values:

1. Add the variable to `_variables.scss` with proper naming
2. Update `style.scss` to use the variable
3. Add corresponding Bootstrap mapping (if applicable)
4. Add corresponding Tailwind mapping (if applicable)
5. Update this README with the new variable

## ✅ Complete Migration Status

✓ Colors - All hardcoded colors converted to variables
✓ Typography - All font sizes, weights, families converted
✓ Spacing - All padding, margin, gaps converted
✓ Borders - All widths, radius, colors converted
✓ Shadows - All box-shadows converted
✓ Transitions - All durations and timings converted
✓ Bootstrap Bridge - Complete mapping created
✓ Tailwind Bridge - Complete mapping and utilities created

---

**Last Updated**: December 11, 2025  
**YChart Version**: 1.0.0
