---
sidebar_position: 2
---

# Custom Templates

Learn how to create beautiful custom node designs with YChart templates.

## Overview

YChart supports three ways to customize node appearance:
1. **Programmatic Template** - JavaScript/TypeScript function
2. **YAML Card Template** - Declarative YAML structure
3. **Default Template** - Built-in fallback

## Method 1: Programmatic Template

Use the `.template()` method to define a custom rendering function:

```javascript
chart.template((data, schema) => {
  return `
    <div style="
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    ">
      <h3 style="margin: 0 0 8px 0;">${data.name}</h3>
      <p style="margin: 0; color: #666;">${data.role}</p>
    </div>
  `;
});
```

### Advanced Example with Gradient

```javascript
chart.template((data, schema) => {
  const gradientColors = {
    CEO: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    CTO: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    CFO: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    default: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  };

  const gradient = gradientColors[data.role] || gradientColors.default;

  return `
    <div style="
      padding: 24px;
      background: ${gradient};
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 200px;
    ">
      <div style="
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      ">
        <div style="
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          font-size: 20px;
          font-weight: bold;
        ">
          ${data.name.charAt(0)}
        </div>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 600;">
            ${data.name}
          </h3>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">
            ${data.role}
          </p>
        </div>
      </div>
      ${data.email ? `
        <div style="
          border-top: 1px solid rgba(255,255,255,0.2);
          padding-top: 8px;
          font-size: 13px;
          opacity: 0.9;
        ">
          📧 ${data.email}
        </div>
      ` : ''}
    </div>
  `;
});
```

### With Avatar Images

```javascript
chart.template((data, schema) => {
  const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`;
  
  return `
    <div style="
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      text-align: center;
      min-width: 180px;
    ">
      <img 
        src="${avatarUrl}"
        alt="${data.name}"
        style="
          width: 64px;
          height: 64px;
          border-radius: 50%;
          margin-bottom: 12px;
          border: 3px solid #667eea;
        "
      />
      <h3 style="
        margin: 0 0 4px 0;
        font-size: 16px;
        color: #333;
      ">
        ${data.name}
      </h3>
      <p style="
        margin: 0 0 8px 0;
        color: #666;
        font-size: 13px;
      ">
        ${data.role}
      </p>
      ${data.department ? `
        <div style="
          display: inline-block;
          padding: 4px 12px;
          background: #f0f0f0;
          border-radius: 12px;
          font-size: 11px;
          color: #666;
        ">
          ${data.department}
        </div>
      ` : ''}
    </div>
  `;
});
```

## Method 2: YAML Card Template

Define templates declaratively in YAML front matter:

```yaml
---
card:
  - div:
      class: employee-card
      style: "padding: 20px; background: white; border-radius: 8px;"
      children:
        - h3:
            style: "margin: 0 0 8px 0; color: #333;"
            content: $name$
        - p:
            style: "margin: 0; color: #666;"
            content: $role$
        - p:
            style: "margin: 8px 0 0 0; font-size: 12px; color: #999;"
            content: $email$
---
- id: 1
  name: Sarah Johnson
  role: CEO
  email: sarah@company.com
```

### Complex YAML Template

```yaml
---
options:
  nodeWidth: 280
  nodeHeight: 180

card:
  - div:
      class: card-container
      style: >
        padding: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      children:
        # Header with avatar
        - div:
            class: card-header
            style: "display: flex; align-items: center; margin-bottom: 16px;"
            children:
              - div:
                  class: avatar-circle
                  style: >
                    width: 48px;
                    height: 48px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    font-size: 20px;
                    font-weight: bold;
                  content: ${name.charAt(0)}
              - div:
                  class: header-text
                  children:
                    - h3:
                        style: "margin: 0; font-size: 18px; font-weight: 600;"
                        content: $name$
                    - p:
                        style: "margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;"
                        content: $role$
        
        # Body with details
        - div:
            class: card-body
            style: "border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px;"
            children:
              - div:
                  style: "margin: 6px 0; font-size: 13px;"
                  content: "📧 $email$"
              - div:
                  style: "margin: 6px 0; font-size: 13px;"
                  content: "🏢 $department$"
              - div:
                  style: "margin: 6px 0; font-size: 13px;"
                  content: "📞 $phone$"
---
# Data
- id: 1
  name: Sarah Johnson
  role: CEO
  email: sarah@company.com
  department: Executive
  phone: +1 (555) 0100
```

## Styling Best Practices

### 1. Consistent Sizing

Always specify width and height for predictable layouts:

```javascript
chart.template((data) => {
  return `
    <div style="
      width: 200px;
      height: 100px;
      padding: 15px;
      box-sizing: border-box;
    ">
      ${data.name}
    </div>
  `;
});
```

### 2. Responsive Text

Use relative units and text overflow handling:

```javascript
style: `
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
```

### 3. Color Schemes

Define a color palette for consistency:

```javascript
const colors = {
  primary: '#667eea',
  secondary: '#764ba2',
  text: '#333',
  textLight: '#666',
  border: '#e0e0e0'
};

chart.template((data) => {
  return `
    <div style="
      background: ${colors.primary};
      color: white;
      border: 2px solid ${colors.border};
    ">
      <!-- content -->
    </div>
  `;
});
```

### 4. Accessibility

Ensure good contrast and semantic HTML:

```javascript
chart.template((data) => {
  return `
    <article role="article" aria-label="Employee: ${data.name}">
      <h3 style="color: #000; background: #fff;">
        ${data.name}
      </h3>
      <p style="color: #333;">
        ${data.role}
      </p>
    </article>
  `;
});
```

## Real-World Examples

### Corporate Theme

```javascript
chart.template((data) => {
  return `
    <div style="
      padding: 20px;
      background: #ffffff;
      border-left: 4px solid #0066cc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        font-size: 16px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 4px;
      ">
        ${data.name}
      </div>
      <div style="
        font-size: 14px;
        color: #0066cc;
        margin-bottom: 8px;
      ">
        ${data.role}
      </div>
      <div style="
        font-size: 12px;
        color: #666666;
      ">
        ${data.department || 'N/A'}
      </div>
    </div>
  `;
});
```

### Creative/Startup Theme

```javascript
chart.template((data) => {
  const emoji = {
    CEO: '👑',
    CTO: '💻',
    CFO: '💰',
    default: '🚀'
  };

  return `
    <div style="
      padding: 20px;
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      border-radius: 20px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      text-align: center;
    ">
      <div style="font-size: 32px; margin-bottom: 8px;">
        ${emoji[data.role] || emoji.default}
      </div>
      <div style="
        font-size: 16px;
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
      ">
        ${data.name}
      </div>
      <div style="
        font-size: 13px;
        color: #666;
        font-style: italic;
      ">
        ${data.role}
      </div>
    </div>
  `;
});
```

### Minimal Theme

```javascript
chart.template((data) => {
  return `
    <div style="
      padding: 16px 20px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    ">
      <div style="
        font-size: 15px;
        font-weight: 500;
        color: #000;
        margin-bottom: 2px;
      ">
        ${data.name}
      </div>
      <div style="
        font-size: 13px;
        color: #757575;
      ">
        ${data.role}
      </div>
    </div>
  `;
});
```

## Dynamic Styling

### Based on Data Values

```javascript
chart.template((data) => {
  // Color based on level or department
  const levelColors = {
    executive: '#8b5cf6',
    management: '#3b82f6',
    staff: '#10b981'
  };

  const bgColor = levelColors[data.level] || levelColors.staff;

  return `
    <div style="background: ${bgColor}; color: white; padding: 15px;">
      <h3>${data.name}</h3>
      <p>${data.role}</p>
    </div>
  `;
});
```

### With Status Indicators

```javascript
chart.template((data) => {
  const statusColor = data.status === 'active' ? '#10b981' : '#ef4444';
  
  return `
    <div style="padding: 15px; background: white; border-radius: 8px;">
      <div style="display: flex; align-items: center;">
        <div style="
          width: 8px;
          height: 8px;
          background: ${statusColor};
          border-radius: 50%;
          margin-right: 8px;
        "></div>
        <h3 style="margin: 0;">${data.name}</h3>
      </div>
      <p style="margin: 8px 0 0 16px;">${data.role}</p>
    </div>
  `;
});
```

## Next Steps

- [YAML Front Matter](./yaml-front-matter) - Learn about declarative templates
- [API Reference](../api/configuration) - Explore template options
- [Basic Example](../examples/basic-org-chart) - See templates in action
