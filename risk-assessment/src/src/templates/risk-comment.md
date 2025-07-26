## 🚨 Risk Assessment Results

**Risk Score:** {{score}}
**Risk Tier:** **{{tierName}}**
**Status:** {{tierDescription}}

### AI-Powered Risk Analysis

{{#each results}}
**{{question}}**
**Answer:** {{answer}} {{#if risk}}⚠️{{else}}✅{{/if}}
{{#if evidence}}**Evidence:** {{evidence}}{{/if}}

{{/each}}

**Code Churn Factor:** {{logChurn}} ({{churnPoints}} points)

### Risk Factors Detected:
{{#if activeFactors}}
{{#each activeFactors}}
- {{question}} ⚠️
  {{/each}}
  {{else}}
- No significant risk factors detected ✅
  {{/if}}

### Next Steps:
{{nextSteps}}

---
*Risk assessment performed automatically by SRA v1.0 using AI analysis of code changes.*