# Automation Readiness Score Calculator

A production-ready web application that calculates automation readiness scores for business processes based on key factors like volume, variance, data quality, system access, exception rates, and compliance sensitivity.

## What It Does

This calculator helps organizations evaluate whether a business process is ready for automation (RPA, workflow automation, or AI). It analyzes six key dimensions, applies weighted scoring, and identifies the top blockers preventing successful automation. The result is a 0-100 readiness score with color-coded bands (Red/Yellow/Green) and actionable recommendations.

## Inputs & Outputs

### Inputs

| Input | Range | Description |
|-------|-------|-------------|
| **Process Volume** | 0+ | Monthly transaction count. Higher volume increases ROI potential. |
| **Process Variance** | 0-100 | Process consistency. 0 = highly standardized, 100 = many edge cases. |
| **Exception Rate** | 0-100% | Percentage requiring manual intervention or rework. |
| **Data Quality** | 0-100 | Input data cleanliness and structure. 100 = pristine, structured data. |
| **System Access** | 0-100 | API/bot accessibility. 100 = stable APIs, no MFA; 0 = locked systems. |
| **Compliance Sensitivity** | 0-100 | Regulatory burden. 0 = none, 100 = HIPAA/GDPR/SOX with strict audits. |

### Outputs

- **Readiness Score** (0-100): Weighted composite score
- **Band**: 
  - 🟢 **Green** (75-100): Strong automation candidate
  - 🟡 **Yellow** (50-74): Potential with blockers to address
  - 🔴 **Red** (0-49): Significant blockers present
- **Top Blockers**: Up to 4 highest-impact issues with actionable hints
- **Narrative**: Context-aware summary

## Scoring Formula

### Subscores (normalized to 0-100, higher = better)

1. **Stable Process** = 100 - variance
2. **Low Exceptions** = 100 - exceptionRate
3. **Data Quality** = dataQuality (as-is)
4. **System Access** = systemAccess (as-is)
5. **Low Compliance Risk** = 100 - complianceSensitivity
6. **Volume Potential** = log₁₀(volume + 1) × 31.5, capped at 95

### Weights

| Factor | Weight |
|--------|--------|
| Stable Process | 20% |
| Low Exceptions | 20% |
| Data Quality | 20% |
| System Access | 15% |
| Low Compliance Risk | 15% |
| Volume Potential | 10% |

**Final Score** = Σ(subscore × weight)

### Blocker Identification

Blockers are factors with a gap > 15 points from their maximum. They're ranked by gap size (descending) and limited to the top 4.

## Local Development

### Prerequisites

- Node.js 18+ and npm

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd automation-readiness-calculator

# Install dependencies
npm install

# Start development server
npm run dev