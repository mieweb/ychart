# YChart Example Use Cases

This folder contains proof-of-concept examples demonstrating hierarchical roll-up visualizations for corporate reporting scenarios.

## Use Cases

### 1. Budget Indicators (`budget-indicators/`)

Demonstrates budget tracking and variance analysis at each organizational level:

- **Budget Allocated** - Total budget assigned to each manager/department
- **Budget Spent** - Actual expenditure to date
- **Budget Remaining** - Available budget
- **Variance %** - Over/under budget indicator

**Key Insight**: Managers can see their full budget responsibility including all direct and indirect reports, enabling accountability at every level.

### 2. OKR - Objectives & Key Results (`okr/`)

Shows how company objectives cascade through the organization:

- **Objective** - The strategic goal for each role/team
- **Key Results (KR1, KR2)** - Measurable outcomes with progress percentages
- **Overall Progress** - Aggregate completion percentage

**Key Insight**: Visualizes goal alignment from CEO down to individual contributors, showing how each person's work contributes to company objectives.

### 3. Salary & Headcount (`salary-headcount/`)

Displays compensation and team size data rolling up through the hierarchy:

- **Direct Reports** - Number of immediate reports
- **Total Headcount** - All reports (direct + indirect)
- **Individual Salary** - The person's compensation
- **Team Salary Budget** - Total compensation for all reports
- **Average Salary** - Team average compensation
- **Open Positions** - Unfilled headcount

**Key Insight**: Enables understanding of organizational span of control, compensation distribution, and hiring needs at every level.

## How to Use

Each example folder contains an `orgchart.yaml` file that can be loaded directly into YChart:

```javascript
import { YChartEditor } from 'ychart';

// Load a specific example
fetch('/examples/budget-indicators/orgchart.yaml')
  .then(response => response.text())
  .then(yaml => {
    new YChartEditor()
      .initView('#container', yaml);
  });
```

Or copy the YAML content into the editor panel when running the YChart demo.

## Customization

Each example uses YAML front matter to define:

- **`options`** - Chart layout dimensions and spacing
- **`schema`** - Data field types and validation rules  
- **`card`** - Custom card template with field placeholders (`$fieldName$`)

You can modify these templates to add additional fields, change colors, or adjust the layout to match your organization's needs.

## Real-World Applications

These examples can be adapted for:

- **Executive dashboards** - Roll-up views for leadership
- **Planning & budgeting** - Bottom-up budget aggregation
- **Performance management** - OKR tracking and goal alignment
- **HR analytics** - Headcount and compensation analysis
- **Capacity planning** - Team size and open position tracking
