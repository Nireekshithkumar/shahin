# ScholarSetu AI — Database Schema Design

Normalized PostgreSQL / SQLite database models implemented via Django ORM.

---

## 1. Entity Relationship Overview

```
User (accounts_user)
  └── UserProfile (1:1)
  └── SavedOpportunity (1:N)
  └── ApplicationTracker (1:N)
        └── ApplicationStatusHistory (1:N)
  └── UserNotificationPreference (1:1)
  └── Notification (1:N)
  └── EligibilityWorkflow (1:N)
        └── WorkflowExecution (1:N)
  └── ChatConversation (1:N)
        └── ChatMessage (1:N)

OpportunitySource (opportunities_opportunitysource)
  └── OpportunitySourceSnapshot (1:N)

Opportunity (opportunities_opportunity)
  ├── OpportunityDocumentRequirement (1:N)
  ├── EligibilityEvaluation (1:N)
  ├── SavedOpportunity (1:N)
  ├── ApplicationTracker (1:N)
  ├── RAGDocument (1:N)
  │     └── RAGDocumentChunk (1:N)
  └── DataQualityIssue (1:N)
```

---

## 2. Table Specifications

### `opportunities_opportunity`
- `id` (BigAutoField): Primary key
- `title` (VarChar 500): Indexed official opportunity name
- `slug` (SlugField 550): URL slug
- `opportunity_type` (VarChar 50): SCHOLARSHIP, FELLOWSHIP, SUBSIDY, HEALTH_SCHEME, etc.
- `provider` (VarChar 255): Ministry or Department name
- `government_level` (VarChar 30): CENTRAL, STATE, UNION_TERRITORY, PRIVATE
- `applicable_state` (VarChar 100): Domicile state or "All India"
- `eligible_states` (JSON): Multi-state list
- `education_levels` (JSON): Eligible degree levels
- `min_academic_percentage` (Decimal 5,2): Cutoff percentage
- `max_annual_income` (Decimal 12,2): Family income ceiling
- `eligible_genders` (JSON): Gender restriction list
- `eligible_categories` (JSON): Reservation categories list
- `disability_eligible_only` (Boolean): Benchmark disability required
- `min_disability_percentage` (Decimal 5,2): PwD cutoff
- `benefit_amount` (Decimal 12,2): Monetary entitlement
- `application_closing_date` (Date): Indexed closing deadline
- `application_status` (VarChar 30): OPEN, CLOSING_SOON, UPCOMING, CLOSED
- `verification_status` (VarChar 50): OFFICIAL_VERIFIED, IMPORTED_UNVERIFIED, etc.
- `official_application_url` (URLField 1000): Direct government application link

### `profiles_userprofile`
- `user_id` (ForeignKey 1:1): Associated user account
- `full_name` (VarChar 255): Citizen legal name
- `current_education_level` (VarChar 50): Degree level
- `annual_family_income` (Decimal 12,2): Verified family income
- `income_certificate_available` (Boolean): Valid revenue certificate present
- `category` (VarChar 20): GENERAL, OBC, SC, ST, EWS
- `caste_certificate_available` (Boolean): Digital certificate present
- `profile_completion_percentage` (Integer 0-100): Calculated completeness

### `workflows_eligibilityworkflow` & `workflows_workflowexecution`
- Stores declarative React Flow graphs (`nodes` JSON, `edges` JSON)
- Records step-by-step execution traces and matching opportunities discovered by graph traversal.
