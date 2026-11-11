# ScholarSetu AI — REST API Documentation

The ScholarSetu AI backend exposes comprehensive RESTful APIs conforming to OpenAPI 3.0 standards.
Interactive Swagger documentation is served at `/api/docs/` and raw OpenAPI JSON at `/api/schema/`.

---

## 1. Authentication Endpoints (`/api/auth/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register new student/citizen account | No |
| `POST` | `/api/auth/login/` | Sign in with email and password | No |
| `POST` | `/api/auth/google/` | Authenticate with Google ID credential | No |
| `POST` | `/api/auth/token/refresh/` | Refresh expired JWT access token | No |
| `GET` | `/api/auth/me/` | Get current authenticated user details | Yes (Bearer) |
| `PATCH` | `/api/auth/me/` | Update authenticated user fields | Yes (Bearer) |

---

## 2. Profile Endpoints (`/api/profile/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/profile/` | Retrieve user profile & completion score | Yes |
| `PATCH` | `/api/profile/` | Update academic, financial, category fields | Yes |

---

## 3. Opportunities & Schemes (`/api/opportunities/`)

| Method | Endpoint | Query Parameters | Description |
|---|---|---|---|
| `GET` | `/api/opportunities/` | `search`, `state`, `type`, `gov_level`, `education_level`, `category`, `disability`, `sort` | Paginated catalog with multi-filters |
| `GET` | `/api/opportunities/{id}/` | — | Detailed opportunity with requirements |
| `GET` | `/api/opportunities/featured/` | — | Top featured opportunities |
| `GET` | `/api/opportunities/closing-soon/` | — | Opportunities closing within 30 days |
| `GET` | `/api/opportunities/sources/` | — | Registered official Indian sources |

---

## 4. Eligibility Engine (`/api/eligibility/`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/eligibility/evaluate/` | Evaluate profile or custom input against opportunities |
| `GET` | `/api/eligibility/results/` | Get history of evaluations for logged-in user |

---

## 5. RAG AI Assistant (`/api/ai/`)

| Method | Endpoint | Payload | Description |
|---|---|---|---|
| `POST` | `/api/ai/chat/` | `{"message": "...", "conversation_id": "..."}` | Grounded AI answer with official citations |
| `GET` | `/api/ai/conversations/` | — | User's past consultation threads |
| `GET` | `/api/ai/conversations/{id}/` | — | Conversation transcript with citations |

---

## 6. Visual Workflows (`/api/workflows/`)

| Method | Endpoint | Payload | Description |
|---|---|---|---|
| `GET` | `/api/workflows/` | — | List saved workflows & templates |
| `POST` | `/api/workflows/` | `{"title": "...", "nodes": [], "edges": []}` | Save new custom workflow |
| `POST` | `/api/workflows/execute-direct/` | `{"nodes": [], "edges": [], "input_data": {}}` | Execute visual pipeline on backend |
| `POST` | `/api/workflows/{id}/execute/` | `{"input_data": {}}` | Execute stored workflow by ID |

---

## 7. Application Tracker & Bookmarks (`/api/applications/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/applications/saved/` | Retrieve bookmarked opportunities |
| `POST` | `/api/applications/saved/` | Bookmark opportunity |
| `DELETE` | `/api/applications/saved/{id}/` | Remove bookmarked opportunity |
| `GET` | `/api/applications/trackers/` | Retrieve tracked applications |
| `POST` | `/api/applications/trackers/` | Add opportunity to personal tracker |
| `PATCH` | `/api/applications/trackers/{id}/` | Update status or document checklist |

---

## 8. Admin & Data Import Hub (`/api/admin-hub/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin-hub/dashboard/` | Real-time database metrics & charts |
| `POST` | `/api/admin-hub/opportunities/import/` | Ingest CSV/JSON dataset with deduplication |
| `POST` | `/api/admin-hub/opportunities/{id}/verify/` | Mark opportunity as Official Source Verified |
| `POST` | `/api/admin-hub/sources/{id}/sync/` | Trigger source connector synchronization |
