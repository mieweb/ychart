# Card Template Syntax

## Overview

You can define custom card templates directly in your YAML front matter using the `card` property. The card template is an array of DOM elements that will be rendered for each node.

## Basic Syntax

### Simple Content (String)

```yaml
card:
  - div: "Hello World"
  - h1: $name$
```

When the value is a string:
- It can be plain text
- Use `$fieldName$` to insert data from your YAML (e.g., `$name$`, `$title$`)

### Complex Content (Object)

```yaml
card:
  - div:
      class: my-class
      style: font-size:14px;color:red;
      content: $name$
```

When the value is an object, you can specify:
- `class`: CSS class name(s)
- `style`: Inline CSS styles
- `content`: Text content (supports `$variable$` substitution)
- `children`: Array of nested elements

## Examples

### Example 1: Simple Card

```yaml
---
schema:
  id: number | required
  name: string | required
  title: string | optional
card:
  - div:
      class: title-header
      style: font-size:14px;font-weight:bold;
      content: $name$
  - div:
      style: font-size:12px;color:#666;
      content: $title$
---
```

### Example 2: Nested Structure

```yaml
---
schema:
  id: number | required
  name: string | required
  email: string | required
card:
  - div:
      class: card-wrapper
      children:
        - h1: $name$
        - div:
            class: email-section
            children:
              - span: "Email: "
              - span:
                  style: color:#667eea;
                  content: $email$
---
```

### Example 3: Mixed Content

```yaml
---
card:
  - div:
      class: header
      children:
        - h2:
            style: margin:0;
            content: $name$
        - small: $department$
  - div:
      class: body
      style: margin-top:8px;
      content: $title$
---
```

## Variable Substitution

Use `$fieldName$` syntax to insert values from your data:
- `$name$` → replaced with data.name
- `$title$` → replaced with data.title
- `$email$` → replaced with data.email
- etc.

If the field doesn't exist, it will be replaced with an empty string.

## Priority

The template rendering follows this priority:
1. **`.template()` method** - Programmatic template function (highest priority)
2. **`card` in YAML** - Template defined in front matter
3. **Default template** - Built-in fallback template

## Complete Example

```yaml
---
options:
  nodeWidth: 200
  nodeHeight: 100
schema:
  id: number | required
  name: string | required
  title: string | optional
  department: string | optional
  email: string | required
card:
  - div:
      class: title-header
      style: font-size:14px;font-weight:bold;color:#333;margin-bottom:4px;
      content: $name$
  - div:
      style: font-size:12px;color:#666;margin-bottom:2px;
      content: $title$
  - div:
      class: department-section
      style: font-size:11px;color:#999;
      children:
        - span:
            style: font-weight:bold;
            content: "Dept: "
        - span: $department$
---

- id: 1
  name: John Doe
  title: CEO
  department: Executive
  email: john@example.com
```

## Notes

- The card template is wrapped in a container div with the node's width, height, padding, border, and border-radius
- All HTML tags are supported (div, span, h1-h6, p, etc.)
- You can nest elements as deeply as needed using the `children` property
- Inline styles follow standard CSS syntax
