# ScholarSetu AI — Official Data Sources & Ingestion Standards

ScholarSetu AI adheres to official Indian government guidelines for opportunity data discovery, ingestion, and verification.

---

## 1. Registered Official Source Portals

| Portal / Ministry | Official Domain | Verification Method |
|---|---|---|
| **National Scholarship Portal (NSP)** | `scholarships.gov.in` | Official Direct Scheme Ingestion & OTR Guidelines |
| **myScheme Platform (MeitY & Digital India)** | `myscheme.gov.in` | API & Authorized Metadata Feeds |
| **Ministry of Social Justice and Empowerment** | `socialjustice.gov.in` | Published Gazette & Scheme Guidelines |
| **Ministry of Tribal Affairs** | `tribal.nic.in` | Direct Post-Matric & Fellowship Data |
| **Department of Higher Education (MoE)** | `education.gov.in` | Central Sector Scheme Publications |
| **University Grants Commission (UGC)** | `ugc.gov.in` | Junior Research Fellowship & National Fellowships |
| **AICTE Student Development Schemes** | `aicte-india.org` | Pragati, Saksham & PG Scholarship Guidelines |
| **State Scholarship Portal (SSP) Karnataka** | `ssp.postmatric.karnataka.gov.in` | State Welfare Department Guidelines |
| **MahaDBT Portal Maharashtra** | `mahadbt.maharashtra.gov.in` | Directorate of Higher Education Schemes |
| **UP Scholarship & Fee Reimbursement** | `scholarship.up.gov.in` | Social Welfare Department Data |
| **Tamil Nadu Higher Education / Pudhumai Penn** | `penkalvi.tn.gov.in` | Social Welfare Department Notifications |
| **West Bengal SVMCM Portal** | `svmcm.wbhed.gov.in` | Higher Education Department Guidelines |

---

## 2. Ingestion & Quality Rules

1. **Zero Fabrication**: No opportunity is created without a verifiable official provider name and source URL.
2. **Missing Criteria Handling**: If a parameter (such as annual income limit) is not officially declared in the guideline, it is recorded as `UNKNOWN`, never assumed to be zero or infinite.
3. **Automated Deduplication**: Ingestion jobs compare incoming titles, domains, and provider strings against existing records to flag duplicate candidates.
4. **Source Reliability Status**: Records are tagged as `HIGH` (Official Gazette / Government Portal), `MEDIUM` (Authorized Department Notification), or `LOW` (Pending Review).
