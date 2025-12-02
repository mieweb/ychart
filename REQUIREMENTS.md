# YChart Requirements

## Overview
YChart is an interactive organizational chart editor built with D3.js that allows users to visualize and edit hierarchical data structures.

## Layout Requirements

### Dynamic Column Layout
- **N-Column Support**: Nodes can be arranged in a dynamic number of columns (not limited to 2)
- **Per-Node Configuration**: Each node can specify the number of columns for its children via the `_childColumns` property in YAML
- **Default Behavior**: If not specified, defaults to 2 columns for compact layout
- **Flexible Dimensions**: Column widths and row heights are calculated dynamically based on node sizes

## Browser Compatibility

### Safari Support
- **foreignObject Workaround**: Safari has known issues with SVG foreignObject elements not inheriting parent group transforms
- **HTML Overlay Solution**: For Safari, an HTML overlay container is created that renders node content as positioned HTML divs instead of relying on foreignObject
- **Feature Parity**: Safari must support all the same interactions as Chrome:
  - Node selection and focusing
  - Keyboard navigation (arrow keys, tab)
  - Expand/collapse buttons
  - Zoom and pan
  - Text selection
  - Click to select nodes

### Chrome Support
- Standard foreignObject rendering within SVG
- All interactive features work natively

## Interaction Requirements

### Node Selection
- **Click to Select**: Clicking on a node selects it and centers it in the viewport
- **Visual Feedback**: Selected nodes display a blue outline with rounded corners matching the card border-radius (8px)
- **Keyboard Navigation**: After selecting a node, arrow keys navigate between nodes
- **Focus Management**: Clicking a node focuses the SVG element to enable keyboard navigation

### Zoom and Pan
- **Mouse Wheel Zoom**: Scrolling with mouse wheel zooms in/out
- **Zoom on Cards**: Zooming must work when cursor is over a card (not just on background)
- **Drag to Pan**: Dragging on the background pans the chart
- **Pan Prevention on Cards**: Dragging on cards should NOT pan the chart (to allow text selection)

### Text Selection
- **Selectable Text**: Text content within cards must be selectable
- **Copy Support**: Users must be able to select text and copy it (Cmd/Ctrl+C)
- **Selection Persistence**: Text selection must NOT be cleared when mouse button is released
- **No Interference**: Node selection/update should not trigger when text is selected

### Expand/Collapse
- **Toggle Button**: Nodes with children display an expand/collapse button
- **Click to Toggle**: Clicking the button expands or collapses child nodes
- **Visual Indicator**: Button shows appropriate icon for current state

### Details Button
- **Info Button**: Each card has an "ℹ" button for showing details
- **Click Handler**: Clicking triggers the `onNodeDetailsClick` callback

## Visual Requirements

### Card Styling
- **Border Radius**: Cards have 8px rounded corners
- **Selection Outline**: Selection outline must match card border-radius
- **Background**: Cards have white background with blue border
- **Shadow on Selection**: Selected cards have a drop shadow effect

### Responsive Zoom
- **Maintain Positions**: When zooming, HTML overlay nodes must stay synchronized with SVG positions
- **Transform Origin**: Overlay nodes scale from top-left origin to match SVG transform behavior

## Accessibility Requirements

### Keyboard Navigation
- **Tab Navigation**: Tab key moves between focusable elements
- **Arrow Key Navigation**: Arrow keys navigate between nodes in the tree
- **Enter/Space**: Activates expand/collapse on focused node
- **Focus Visible**: Focus indicators are visible for keyboard users

### ARIA Attributes
- **Tree Role**: SVG container has `role="tree"`
- **TreeItem Role**: Nodes have `role="treeitem"`
- **Aria-Selected**: Indicates selected node
- **Aria-Expanded**: Indicates expand/collapse state

## Technical Implementation Notes

### Safari HTML Overlay
The Safari workaround creates an HTML overlay layer that:
1. Sits above the SVG element with `z-index: 10`
2. Has `pointer-events: none` on the container, `pointer-events: auto` on nodes
3. Forwards wheel events to the SVG for zoom handling
4. Computes absolute screen positions from node data + layout transforms + zoom transform
5. Includes both card content and expand/collapse buttons
6. Handles click events for node selection with SVG focus transfer

### Event Handling
- **Wheel Events**: Overlay forwards wheel events to SVG for zoom
- **Click Events**: Check for text selection before triggering node selection
- **MouseDown Events**: Stop propagation on card content to prevent pan interference
- **Focus Events**: Transfer focus to SVG after overlay click for keyboard nav

### CSS Requirements
- `user-select: text` on card content areas
- `cursor: text` on card content for text selection affordance
- `cursor: pointer` on interactive elements (buttons, links)
- Safari-specific styles via `@supports (-webkit-touch-callout: none)`
