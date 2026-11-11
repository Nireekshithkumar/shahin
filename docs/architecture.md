# ScholarSetu AI — System Architecture

**Project Name:** ScholarSetu AI  
**Tagline:** *Every Eligible Opportunity, One Platform.*

---

## 1. High-Level Architecture Overview

ScholarSetu AI is engineered as a decoupled, modular full-stack platform designed for discovering scholarships, fellowships, and citizen welfare schemes across India.

```
+-------------------------------------------------------------------------+
|                           CLIENT LAYER                                  |
|  React 18 + Vite + TypeScript + Tailwind CSS + React Flow + Recharts   |
+------------------------------------+------------------------------------+
                                     | HTTPS / JWT REST APIs
                                     v
+------------------------------------+------------------------------------+
|                         APPLICATION LAYER                               |
|                     Django 5 + REST Framework                           |
|  ---------------------------------------------------------------------  |
|  • accounts        • profiles        • opportunities   • eligibility    |
|  • recommendations • applications    • notifications   • ai_assistant   |
|  • workflows       • data_import     • analytics                        |
+-------------------+----------------+------------------+-----------------+
                    |                |                  |
                    v                v                  v
       +------------+---+     +------+------+    +------+------+
       |   PostgreSQL   |     | Redis Queue |    | RAG Vector  |
       | Relational DB  |     | & Celery    |    | Store       |
       +----------------+     +-------------+    +-------------+
```

---

## 2. Core Subsystems

### A. Deterministic Eligibility Engine (`apps/eligibility`)
Unlike generative models that can hallucinate false cutoff criteria, ScholarSetu AI employs a **deterministic Python evaluation engine** (`EligibilityEngine`):
- Evaluates education level, domicile/state, annual family income ceilings, previous academic percentages, category reservation rules, benchmark disability thresholds, and age brackets.
- Results: `ELIGIBLE`, `POTENTIALLY_ELIGIBLE`, `INELIGIBLE`, and `INSUFFICIENT_INFORMATION`.
- Returns transparent breakdown: **Matched Criteria**, **Failed Conditions**, **Unconfirmed Items**, and **Actionable Next Steps**.

### B. Transparent Recommendation Engine (`apps/recommendations`)
- Multi-factor scoring model:
  1. Eligibility Confidence (40%)
  2. Deadline Urgency (20%)
  3. Benefit Value (15%)
  4. Domicile / State Fit (15%)
  5. Education & Stream Alignment (10%)
- **Strict Invariance:** Never recommends an `INELIGIBLE` scheme as an eligible match.

### C. Visual Workflow Builder (`apps/workflows`)
- Interactive canvas powered by **React Flow** on the frontend.
- Secure declarative execution engine (`WorkflowExecutionEngine`) on the backend.
- Interprets Input, Condition, Logic, and Output nodes without running arbitrary frontend Python code.

### D. RAG-Powered AI Assistant (`apps/ai_assistant`)
- Grounded strictly in verified government scheme guidelines and circulars.
- Automatic chunking, vector indexing, and cosine retrieval.
- Returns verified source citations with official URLs and dates.
- Sanitized against prompt injection attempts.

### E. Extensible Official Source Registry (`apps/data_import`)
- Tracks ingestion from National Scholarship Portal (NSP), myScheme, Central Ministries, and State Portals.
- Automated deduplication, schema normalization, and data-quality anomaly detection.
