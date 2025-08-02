# 🔍 Risk Assessment Results

<div align="center">

# Risk Level: **{{tierName}}**

## **Score: {{score}}**

### {{tierDescription}}

### _This tool can make mistakes. Please review the results carefully and use your judgment to assess the risk level of this code._

</div>

<details>
<summary>📊 Automated Metrics</summary>

| Metric                   | Value                   | Points Added                   | Weight                        |
|--------------------------|-------------------------|--------------------------------|-------------------------------|
| **Log Churn**            | {{logChurn}}            | +{{logChurnPoints}}            | {{logChurnWeight}}            |
| **Code Churn**           | {{codeChurn}}           | +{{codeChurnPoints}}           | {{codeChurnWeight}}           |
| **Halstead Complexity**  | {{halsteadComplexity}}  | +{{halsteadComplexityPoints}}  | {{halsteadComplexityWeight}}  |
| **Cognitive Complexity** | {{cognitiveComplexity}} | +{{cognitiveComplexityPoints}} | {{cognitiveComplexityWeight}} |

</details>

<details>
<summary>📔 Assessment Results</summary>

| Question | Answer | Weight | Evidence |
|----------|--------|--------|----------|
{{#each results}}{{/each}}

</details>

<sub>🤖 This assessment was generated automatically. For questions about the risk assessment process, please contact your
development team leads.</sub>