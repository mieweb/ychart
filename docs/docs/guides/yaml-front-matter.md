---
sidebar_position: 1
---

# YAML Front Matter

YChart supports YAML front matter to configure options, define schemas, and create custom card templates directly in your data file.

## Basic Structure

YAML front matter is enclosed between `---` markers at the beginning of your YAML file:

```yaml
---
# Front matter section
options:
  nodeWidth: 220
  nodeHeight: 110
schema:
  id: number | required
  name: string | required
---
# Your actual data starts here
- id: 1
  name: CEO
```

## Three Front Matter Sections

### 1. Options Section

Configure chart layout and appearance:

```yaml
---
options:
  nodeWidth: 250
  nodeHeight: 120
  siblingSeparation: 120
  subtreeSeparation: 150
  levelSeparation: 120
  editorTheme: light
  initialZoom: 0.9
---
```

**Available Options:**
- `nodeWidth`: Width of nodes (pixels)
- `nodeHeight`: Height of nodes (pixels)
- `siblingSeparation`: Horizontal spacing between siblings (pixels)
- `subtreeSeparation`: Horizontal spacing between subtrees (pixels)
- `levelSeparation`: Vertical spacing between levels (pixels)
- `editorTheme`: `light` or `dark`
- `editorWidth`: Width of editor sidebar (pixels)
- `initialZoom`: Initial zoom level (0.1 - 3.0)
- `minZoom`: Minimum zoom level
- `maxZoom`: Maximum zoom level

### 2. Schema Section

Define data validation rules:

```yaml
---
schema:
  id: number | required
  name: string | required
  role: string
  email: string
  department: string
  phone: string
  hireDate: date
---
```

**Schema Types:**
- `string`: Text values
- `number`: Numeric values
- `boolean`: True/false values
- `date`: Date values
- `array`: Array of values
- `object`: Nested object

**Schema Modifiers:**
- `required`: Field must be present
- `optional`: Field is optional (default)

**Example:**
```yaml
schema:
  id: number | required
  name: string | required
  role: string
  email: string
  age: number
  isActive: boolean
  tags: array
```

### 3. Card Template Section

Define custom HTML structure for node cards:

```yaml
---
card:
  - div:
      class: card-wrapper
      style: "padding: 20px; background: white; border-radius: 8px;"
      children:
        - h2:
            class: card-title
            content: $name$
        - p:
            class: card-subtitle
            content: $role$
        - div:
            class: card-footer
            children:
              - span:
                  content: $email$
---
```

**Template Variables:**

Use `$fieldName$` to reference data fields:
- `$name$` - Will be replaced with `data.name`
- `$role$` - Will be replaced with `data.role`
- `$email$` - Will be replaced with `data.email`

**Template Structure:**

```yaml
card:
  - element:
      class: css-class-name
      style: inline-styles
      content: $fieldName$  # For text content
      children:             # For nested elements
        - childElement:
            # ... child element definition
```

## Complete Example

Here's a complete example using all three sections:

```yaml
---
options:
  nodeWidth: 280
  nodeHeight: 160
  siblingSeparation: 120
  levelSeparation: 140
  editorTheme: light
  initialZoom: 0.85

schema:
  id: number | required
  name: string | required
  role: string | required
  email: string
  department: string
  phone: string
  avatar: string
  status: string

card:
  - div:
      class: employee-card
      style: >
        padding: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      children:
        - div:
            class: card-header
            style: "display: flex; align-items: center; margin-bottom: 16px;"
            children:
              - img:
                  class: avatar
                  src: $avatar$
                  style: >
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    margin-right: 12px;
                    border: 2px solid white;
              - div:
                  children:
                    - h3:
                        style: "margin: 0; font-size: 18px; font-weight: 600;"
                        content: $name$
                    - p:
                        style: "margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;"
                        content: $role$
        - div:
            class: card-body
            style: "border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px;"
            children:
              - div:
                  style: "margin: 8px 0; font-size: 13px;"
                  children:
                    - i:
                        class: icon-mail
                        style: "margin-right: 8px;"
                    - span:
                        content: $email$
              - div:
                  style: "margin: 8px 0; font-size: 13px;"
                  children:
                    - i:
                        class: icon-dept
                        style: "margin-right: 8px;"
                    - span:
                        content: $department$
              - div:
                  style: "margin: 8px 0; font-size: 13px;"
                  children:
                    - i:
                        class: icon-phone
                        style: "margin-right: 8px;"
                    - span:
                        content: $phone$
        - div:
            class: card-status
            style: >
              margin-top: 12px;
              padding: 6px 12px;
              background: rgba(255,255,255,0.2);
              border-radius: 20px;
              font-size: 12px;
              text-align: center;
            content: $status$
---
# Actual organizational data
- id: 1
  name: Sarah Johnson
  role: Chief Executive Officer
  email: sarah.johnson@company.com
  department: Executive
  phone: +1 (555) 0100
  avatar: https://i.pravatar.cc/150?img=1
  status: Active
  children:
    - id: 2
      name: Mike Chen
      role: Chief Technology Officer
      email: mike.chen@company.com
      department: Technology
      phone: +1 (555) 0101
      avatar: https://i.pravatar.cc/150?img=12
      status: Active
      children:
        - id: 4
          name: Alex Kim
          role: Senior Developer
          email: alex.kim@company.com
          department: Engineering
          phone: +1 (555) 0103
          avatar: https://i.pravatar.cc/150?img=33
          status: Active
        - id: 5
          name: Emma Davis
          role: DevOps Engineer
          email: emma.davis@company.com
          department: Operations
          phone: +1 (555) 0104
          avatar: https://i.pravatar.cc/150?img=47
          status: Active
    - id: 3
      name: Rachel Brown
      role: Chief Financial Officer
      email: rachel.brown@company.com
      department: Finance
      phone: +1 (555) 0102
      avatar: https://i.pravatar.cc/150?img=20
      status: Active
      children:
        - id: 6
          name: Tom Wilson
          role: Senior Accountant
          email: tom.wilson@company.com
          department: Accounting
          phone: +1 (555) 0105
          avatar: https://i.pravatar.cc/150?img=52
          status: Active
```

## Priority Order

When rendering nodes, YChart uses this priority:

1. **Custom Template** (set via `.template()` method) - Highest priority
2. **Card Template** (from YAML front matter `card:` section)
3. **Default Template** (built-in fallback) - Lowest priority

## Conditional Fields

You can use conditional rendering in your templates:

```yaml
card:
  - div:
      children:
        - h3:
            content: $name$
        - p:
            content: $role$
        # Email will only render if it exists
        - p:
            class: email
            content: $email$
            # Empty if email doesn't exist
```

## Best Practices

### 1. Keep It Readable

Use YAML's block scalar style for long inline styles:

```yaml
style: >
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
```

### 2. Organize Your Schema

List required fields first:

```yaml
schema:
  id: number | required
  name: string | required
  role: string | required
  email: string
  phone: string
```

### 3. Use Semantic Class Names

```yaml
card:
  - div:
      class: employee-card
      children:
        - div:
            class: card-header
        - div:
            class: card-body
        - div:
            class: card-footer
```

### 4. Validate Your YAML

Use a YAML validator to check syntax before using:
- [YAML Lint](http://www.yamllint.com/)
- VS Code YAML extension

## Troubleshooting

### Front Matter Not Recognized

Make sure:
1. Front matter starts at the very beginning of the file
2. Both opening and closing `---` markers are present
3. No spaces before the `---` markers
4. YAML syntax is valid

### Template Variables Not Replaced

Check that:
1. Variable names match your data fields exactly
2. Variables use `$fieldName$` syntax (with dollar signs)
3. Field names are case-sensitive

### Schema Validation Issues

Remember:
1. Schema is for documentation and validation hints
2. Data can still contain fields not in schema
3. Required fields will show warnings if missing

## Next Steps

- [Custom Templates](./custom-templates) - Advanced template customization
- [Configuration Options](../api/configuration) - All available options
- [Basic Example](../examples/basic-org-chart) - See YAML front matter in action
