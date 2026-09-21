# Repository Intelligence Platform
## Database Design Document

**Version:** 1.0  
**Status:** Approved Design Baseline  
**Database:** MongoDB  
**Vector Search:** MongoDB Vector Search  
**Cache / Queue:** Redis  
**File Storage:** LocalRepositoryStorage in development, ObjectRepositoryStorage in production  
**Architecture:** Modular Monolith + Background Workers  
**Multi-Tenancy:** User → Project → Repository isolation

---

# 1. Purpose

This document defines the database architecture for the Repository Intelligence Platform.

The database must support:

- Multi-user SaaS
- Projects
- Repositories
- Repository analysis versions
- Files and folders
- Programming languages
- Classes
- Functions
- Methods
- Dependencies
- Code relationships
- Architecture information
- Features
- Semantic code chunks
- Vector embeddings
- Repository-aware AI
- Conversations
- Code reviews
- Review issues
- Generated patches
- Reports
- Background analysis jobs
- Soft deletion
- Future Git/version intelligence

---

# 2. Database Strategy

The system uses three different storage responsibilities.

```text
                         Application
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ↓                ↓                ↓
          MongoDB           Redis         RepositoryStorage
             │                │                │
             │                │          ┌─────┴─────┐
             │                │          │           │
             ↓                ↓          ↓           ↓
       Permanent Data      Temporary   Local       Object
                           Data        Storage      Storage
```

---

# 3. MongoDB Responsibility

MongoDB is the **persistent source of truth** for application and repository intelligence data.

MongoDB stores:

```text
Users
Projects
Repositories
Analyses
Files metadata
Symbols
Relationships
Features
Code chunks
Embeddings
Analysis jobs
Conversations
Messages
Code reviews
Review issues
Patches
Reports
```

---

# 4. Redis Responsibility

Redis is not the primary database.

It is used for:

```text
Job queues
Temporary job state
Caching
Pub/Sub
Real-time event coordination
Rate limiting where required
```

If Redis loses temporary data, MongoDB remains the authoritative source.

---

# 5. Repository Storage Responsibility

Actual repository files are stored outside MongoDB.

### Development

```text
LocalRepositoryStorage
        ↓
Local filesystem
```

### Production

```text
ObjectRepositoryStorage
        ↓
Object storage
```

MongoDB stores the logical storage reference.

Example:

```text
storage_key:
repositories/user_123/project_456/repository_789/
```

---

# 6. Why Source Files Are Not Stored Directly in MongoDB

A repository can contain:

```text
Thousands of files
Large source files
Images
Configuration files
Documentation
Generated files
Binary files
```

Storing complete repositories as MongoDB documents would make repository management unnecessarily expensive and complicated.

Therefore:

```text
MongoDB
    ↓
"What is this repository?"

Repository Storage
    ↓
"Give me the actual files."
```

---

# 7. Database Naming Convention

Collection names will use lowercase plural names.

Examples:

```text
users
projects
repositories
analyses
files
symbols
relationships
features
code_chunks
analysis_jobs
conversations
messages
code_reviews
review_issues
patches
reports
```

---

# 8. Global ID Strategy

Every major entity receives a unique identifier.

Recommended:

```text
ObjectId
```

MongoDB's native `ObjectId` is sufficient for V1.

The application should expose IDs consistently through the API.

Example:

```json
{
  "id": "68c123..."
}
```

rather than exposing internal database implementation unnecessarily.

---

# 9. Timestamp Strategy

All persistent entities should use:

```text
created_at
updated_at
```

Timestamps should be stored in UTC.

Example:

```json
{
  "created_at": "2026-09-21T08:30:00Z",
  "updated_at": "2026-09-21T09:15:00Z"
}
```

The frontend converts timestamps to the user's local timezone.

---

# 10. Soft Delete Strategy

User-owned major resources should support soft deletion.

Recommended fields:

```text
is_deleted
deleted_at
```

Example:

```json
{
  "is_deleted": true,
  "deleted_at": "2026-09-21T10:00:00Z"
}
```

Normal queries should exclude deleted documents.

---

# 11. Entity Hierarchy

The primary ownership hierarchy is:

```text
User
 │
 └── Projects
      │
      └── Repositories
           │
           └── Analyses
                │
                ├── Files
                ├── Symbols
                ├── Relationships
                ├── Features
                └── Code Chunks
```

This hierarchy is fundamental to authorization and tenant isolation.

---

# 12. Collection Overview

The V1 database contains:

```text
users
projects
repositories
analyses
files
symbols
relationships
features
code_chunks
analysis_jobs
conversations
messages
code_reviews
review_issues
patches
reports
```

---

# 13. Users Collection

Collection:

```text
users
```

Purpose:

Store application user accounts.

Example:

```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "password_hash": "...",
  "name": "Muni",
  "is_active": true,
  "is_verified": false,
  "created_at": "2026-09-21T08:00:00Z",
  "updated_at": "2026-09-21T08:00:00Z"
}
```

---

# 14. Users Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `_id` | ObjectId | Yes | User identifier |
| `email` | string | Yes | Login email |
| `password_hash` | string | Yes | Hashed password |
| `name` | string | Yes | Display name |
| `is_active` | boolean | Yes | Account status |
| `is_verified` | boolean | Yes | Email verification |
| `created_at` | datetime | Yes | Creation time |
| `updated_at` | datetime | Yes | Last update |

Passwords must never be stored in plaintext.

---

# 15. Users Indexes

Required:

```text
{ email: 1 }
```

Unique:

```text
email
```

This prevents duplicate accounts.

---

# 16. Projects Collection

Collection:

```text
projects
```

A project is the main organizational boundary for repository intelligence.

Example:

```json
{
  "_id": "ObjectId",
  "owner_id": "ObjectId",
  "name": "Repository Intelligence",
  "description": "AI repository analysis platform",
  "is_deleted": false,
  "deleted_at": null,
  "created_at": "2026-09-21T08:00:00Z",
  "updated_at": "2026-09-21T08:00:00Z"
}
```

---

# 17. Project Fields

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Project ID |
| `owner_id` | ObjectId | User who owns project |
| `name` | string | Project name |
| `description` | string | Optional description |
| `is_deleted` | boolean | Soft-delete flag |
| `deleted_at` | datetime/null | Deletion timestamp |
| `created_at` | datetime | Creation time |
| `updated_at` | datetime | Update time |

---

# 18. Project Indexes

```text
{ owner_id: 1, is_deleted: 1 }
```

This supports:

```text
Get all active projects belonging to user
```

---

# 19. Repositories Collection

Collection:

```text
repositories
```

Represents a repository imported into a project.

Example:

```json
{
  "_id": "ObjectId",
  "project_id": "ObjectId",
  "owner_id": "ObjectId",
  "name": "my-ecommerce-app",
  "source_type": "github",
  "source_url": "https://github.com/example/my-ecommerce-app",
  "storage_key": "repositories/user123/project456/repository789/",
  "default_branch": "main",
  "status": "ready",
  "current_analysis_id": "ObjectId",
  "is_deleted": false,
  "deleted_at": null,
  "created_at": "2026-09-21T08:00:00Z",
  "updated_at": "2026-09-21T09:00:00Z"
}
```

---

# 20. Repository Source Types

V1:

```text
github
zip
```

Future:

```text
gitlab
bitbucket
github_private
local
```

The database should not prevent additional source types.

---

# 21. Repository Status

Possible states:

```text
pending
uploading
queued
analyzing
ready
failed
deleted
```

---

# 22. Repository Fields

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Repository ID |
| `project_id` | ObjectId | Parent project |
| `owner_id` | ObjectId | Repository owner |
| `name` | string | Repository name |
| `source_type` | enum | github / zip |
| `source_url` | string/null | GitHub URL |
| `storage_key` | string | Repository storage location |
| `default_branch` | string/null | Default branch |
| `status` | enum | Repository state |
| `current_analysis_id` | ObjectId/null | Latest successful analysis |
| `is_deleted` | boolean | Soft deletion |
| `deleted_at` | datetime/null | Deletion time |
| `created_at` | datetime | Creation |
| `updated_at` | datetime | Last update |

---

# 23. Repository Indexes

```text
{ project_id: 1, is_deleted: 1 }
```

```text
{ owner_id: 1, is_deleted: 1 }
```

---

# 24. Analysis Collection

Collection:

```text
analyses
```

An analysis represents a snapshot of repository intelligence.

This is one of the most important design decisions.

---

# 25. Immutable Analysis Model

Suppose:

```text
Repository A
```

is analyzed today.

We create:

```text
Analysis 1
```

Later the repository changes.

We create:

```text
Analysis 2
```

We do not overwrite Analysis 1.

Therefore:

```text
Repository
 ├── Analysis 1
 ├── Analysis 2
 └── Analysis 3
```

---

# 26. Why Analysis Versioning Matters

It enables future capabilities:

```text
What changed?
What files changed?
What features changed?
What dependencies changed?
Did architecture change?
What is impacted by the latest commit?
```

This is an important future foundation.

---

# 27. Analysis Document

Example:

```json
{
  "_id": "ObjectId",
  "repository_id": "ObjectId",
  "project_id": "ObjectId",
  "version": 3,
  "status": "completed",
  "source_reference": {
    "type": "github",
    "commit_sha": "abc123"
  },
  "statistics": {
    "files": 245,
    "directories": 38,
    "lines": 52340,
    "languages": 4
  },
  "technology_stack": [
    "React",
    "FastAPI",
    "MongoDB",
    "Docker"
  ],
  "architecture": {
    "type": "layered",
    "confidence": 0.91
  },
  "started_at": "2026-09-21T08:00:00Z",
  "completed_at": "2026-09-21T08:08:00Z",
  "created_at": "2026-09-21T08:00:00Z"
}
```

---

# 28. Analysis Status

```text
queued
running
completed
failed
cancelled
partial
```

`partial` is important.

One language analyzer failing should not necessarily destroy the entire repository analysis.

---

# 29. Analysis Statistics

Statistics can include:

```text
file_count
directory_count
line_count
language_count
symbol_count
relationship_count
feature_count
code_chunk_count
```

These values are cached summary information.

The underlying entities remain the source of truth.

---

# 30. Technology Stack

The analysis document can store detected technologies:

```json
{
  "technology_stack": [
    {
      "name": "React",
      "category": "frontend_framework",
      "confidence": 0.98
    },
    {
      "name": "FastAPI",
      "category": "backend_framework",
      "confidence": 0.94
    }
  ]
}
```

This allows the UI to quickly display the stack without recalculating it.

---

# 31. Architecture Information

Architecture is represented as both:

```text
Detected evidence
+
AI interpretation
```

Example:

```json
{
  "architecture": {
    "type": "layered",
    "confidence": 0.89,
    "evidence": [
      "controllers directory",
      "services directory",
      "repositories directory"
    ]
  }
}
```

---

# 32. Files Collection

Collection:

```text
files
```

A file represents metadata about a source file.

The actual source file remains in RepositoryStorage.

---

# 33. File Document

Example:

```json
{
  "_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "path": "backend/services/payment.py",
  "name": "payment.py",
  "extension": ".py",
  "language": "python",
  "file_type": "source",
  "size_bytes": 8420,
  "line_count": 280,
  "storage_key": "repositories/.../backend/services/payment.py",
  "hash": "sha256...",
  "is_generated": false,
  "is_test": false,
  "created_at": "2026-09-21T08:01:00Z"
}
```

---

# 34. Why Store File Hash?

The hash helps detect whether content changed.

Example:

```text
Analysis 1
payment.py
hash = ABC
```

Later:

```text
Analysis 2
payment.py
hash = XYZ
```

Therefore:

```text
payment.py changed
```

This will be valuable for future incremental analysis.

---

# 35. File Types

Potential values:

```text
source
test
configuration
documentation
asset
generated
binary
unknown
```

---

# 36. File Indexes

Important indexes:

```text
{ analysis_id: 1, path: 1 }
```

Unique within an analysis:

```text
analysis_id + path
```

Also:

```text
{ repository_id: 1, analysis_id: 1 }
```

---

# 37. Folder Representation

We do not need a separate `folders` collection in V1.

A file path provides folder hierarchy:

```text
backend/services/payment.py
```

From this we can derive:

```text
backend/
backend/services/
backend/services/payment.py
```

For repository browsing, folders can be constructed from file paths.

This avoids unnecessary duplicated data.

---

# 38. Symbols Collection

Collection:

```text
symbols
```

Represents code entities such as:

```text
Class
Function
Method
Interface
Variable
Constant
Enum
```

---

# 39. Symbol Document

Example:

```json
{
  "_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "file_id": "ObjectId",
  "parent_symbol_id": "ObjectId",
  "name": "process_payment",
  "symbol_type": "function",
  "language": "python",
  "start_line": 42,
  "end_line": 78,
  "signature": "process_payment(order_id, amount)",
  "visibility": "public",
  "metadata": {},
  "created_at": "2026-09-21T08:02:00Z"
}
```

---

# 40. Symbol Hierarchy

Example:

```text
PaymentService
│
├── process_payment()
├── refund_payment()
└── validate_payment()
```

Database:

```text
PaymentService
parent_symbol_id = null

process_payment
parent_symbol_id = PaymentService.id
```

---

# 41. Why Symbols Are Separate From Files

A user might ask:

> "Explain this function."

We shouldn't need to parse the entire file every time.

We can directly retrieve:

```text
symbol_id
↓
file_id
↓
line range
```

This makes code intelligence faster.

---

# 42. Symbol Indexes

Important:

```text
{ analysis_id: 1, file_id: 1 }
```

```text
{ analysis_id: 1, name: 1 }
```

```text
{ parent_symbol_id: 1 }
```

---

# 43. Relationships Collection

Collection:

```text
relationships
```

This represents the logical dependency graph.

---

# 44. Relationship Example

```text
PaymentController
      │
      │ CALLS
      ↓
PaymentService
      │
      │ CALLS
      ↓
StripeService
```

Database representation:

```json
{
  "_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "source_type": "symbol",
  "source_id": "ObjectId",
  "target_type": "symbol",
  "target_id": "ObjectId",
  "relationship_type": "CALLS",
  "confidence": 0.96,
  "metadata": {},
  "created_at": "2026-09-21T08:03:00Z"
}
```

---

# 45. Relationship Types

Initial V1 types:

```text
IMPORTS
CALLS
EXTENDS
IMPLEMENTS
CONTAINS
DEFINES
USES
DEPENDS_ON
REFERENCES
EXPOSES
TESTS
BELONGS_TO_FEATURE
```

More types can be added later.

---

# 46. Why Explicit Relationships?

We need to answer questions such as:

> Who calls this function?

> What depends on this file?

> Which tests use this service?

> What will be affected if this function changes?

Explicit relationships make these operations possible.

---

# 47. Relationship Direction

Relationships are directional.

Example:

```text
A CALLS B
```

means:

```text
source = A
target = B
```

This distinction is important for impact analysis.

---

# 48. Relationship Indexes

Very important:

```text
{ analysis_id: 1, source_id: 1 }
```

```text
{ analysis_id: 1, target_id: 1 }
```

```text
{ analysis_id: 1, relationship_type: 1 }
```

These support graph traversal.

---

# 49. Features Collection

Collection:

```text
features
```

Features are first-class entities.

Example:

```text
Payment
Checkout
Authentication
Order Management
Notifications
```

---

# 50. Feature Document

Example:

```json
{
  "_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "name": "Payment",
  "description": "Handles payment processing and verification",
  "status": "discovered",
  "confidence": 0.88,
  "entry_points": [
    {
      "type": "file",
      "id": "ObjectId"
    }
  ],
  "related_files": [
    "ObjectId",
    "ObjectId"
  ],
  "related_symbols": [
    "ObjectId",
    "ObjectId"
  ],
  "evidence": [],
  "created_at": "2026-09-21T08:05:00Z",
  "updated_at": "2026-09-21T08:05:00Z"
}
```

---

# 51. Feature Discovery

Feature discovery uses:

```text
Static analysis
+
Graph relationships
+
Semantic search
+
AI reasoning
```

The resulting feature becomes persisted data.

---

# 52. Feature Confidence

Example:

```text
Payment
confidence = 0.91
```

Confidence represents the system's confidence in the association, not a guarantee.

The UI should provide evidence.

---

# 53. Code Chunks Collection

Collection:

```text
code_chunks
```

This is the semantic search layer.

---

# 54. Code Chunk Document

Example:

```json
{
  "_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "file_id": "ObjectId",
  "symbol_id": "ObjectId",
  "chunk_type": "function",
  "content": "def process_payment(...): ...",
  "start_line": 42,
  "end_line": 78,
  "language": "python",
  "token_count": 340,
  "embedding": [0.012, -0.032, 0.087],
  "metadata": {
    "symbol_name": "process_payment"
  },
  "created_at": "2026-09-21T08:04:00Z"
}
```

---

# 55. Chunking Strategy

V1 should prefer semantic chunks.

Examples:

```text
Class
Function
Method
Logical code block
Documentation block
Configuration block
```

Avoid blindly splitting code every N characters.

---

# 56. Why Store `symbol_id`?

If a chunk belongs to:

```text
PaymentService.process_payment()
```

we should be able to move:

```text
Vector Search
      ↓
Chunk
      ↓
Symbol
      ↓
File
      ↓
Relationships
```

This creates the bridge between semantic search and structural analysis.

---

# 57. Embedding Strategy

The embedding model should be configurable.

Conceptually:

```text
EmbeddingProvider
       │
       ├── Provider A
       ├── Provider B
       └── Future Provider
```

The database stores the resulting vector.

---

# 58. Vector Search Isolation

Every semantic search must be restricted by:

```text
repository_id
analysis_id
```

Conceptually:

```text
Search Vector
      +
repository_id
      +
analysis_id
      ↓
Relevant chunks
```

This prevents cross-repository leakage.

---

# 59. Vector Index

MongoDB Vector Search should use an index over the embedding field.

The exact index configuration depends on the selected embedding model's vector dimensions.

Therefore the vector index configuration must be treated as deployment configuration rather than hard-coded into application logic.

---

# 60. Analysis Jobs Collection

Collection:

```text
analysis_jobs
```

Represents background tasks.

---

# 61. Analysis Job Document

Example:

```json
{
  "_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "job_type": "repository_analysis",
  "status": "running",
  "progress": 65,
  "current_stage": "dependency_analysis",
  "attempt": 1,
  "error": null,
  "started_at": "2026-09-21T08:00:10Z",
  "completed_at": null,
  "created_at": "2026-09-21T08:00:00Z",
  "updated_at": "2026-09-21T08:04:00Z"
}
```

---

# 62. Job Types

V1:

```text
repository_analysis
code_review
report_generation
```

Future:

```text
incremental_analysis
embedding_rebuild
feature_refresh
```

---

# 63. Job Status

```text
queued
running
completed
failed
cancelled
```

---

# 64. Job Progress

Example:

```text
progress: 65
current_stage: dependency_analysis
```

The frontend receives progress through WebSockets.

---

# 65. Job Retry

The job contains:

```text
attempt
```

Workers can retry failed operations.

However, retry logic belongs primarily to the queue/worker system rather than MongoDB.

MongoDB stores the authoritative job status.

---

# 66. Conversations Collection

Collection:

```text
conversations
```

A conversation belongs to a repository context.

---

# 67. Conversation Document

Example:

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "project_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "title": "Understanding payment flow",
  "status": "active",
  "created_at": "2026-09-21T08:20:00Z",
  "updated_at": "2026-09-21T08:30:00Z"
}
```

---

# 68. Why Store Analysis ID in Conversation?

Suppose:

```text
Conversation
   ↓
Analysis #3
```

Later:

```text
Analysis #4
```

The previous conversation remains grounded in the repository state it originally used.

This prevents historical answers from becoming ambiguous.

---

# 69. Messages Collection

Collection:

```text
messages
```

We separate messages from conversations.

---

# 70. Message Document

Example:

```json
{
  "_id": "ObjectId",
  "conversation_id": "ObjectId",
  "role": "user",
  "content": "How does payment processing work?",
  "context": {
    "file_ids": [],
    "symbol_ids": [],
    "chunk_ids": []
  },
  "created_at": "2026-09-21T08:21:00Z"
}
```

Assistant message:

```json
{
  "_id": "ObjectId",
  "conversation_id": "ObjectId",
  "role": "assistant",
  "content": "Payment processing starts in...",
  "context": {
    "file_ids": ["ObjectId"],
    "symbol_ids": ["ObjectId"]
  },
  "created_at": "2026-09-21T08:21:05Z"
}
```

---

# 71. Conversation Memory

V1 stores conversation history.

However, V1 does not implement sophisticated long-term memory.

That means:

```text
Conversation history
        ↓
Available as context
```

but we do not yet build:

```text
Long-term memory
User preference memory
Cross-project memory
AI memory summarization
```

These are future features.

---

# 72. Code Reviews Collection

Collection:

```text
code_reviews
```

Represents one review execution.

---

# 73. Code Review Document

Example:

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "project_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "scope": {
    "type": "repository"
  },
  "status": "completed",
  "summary": {
    "critical": 1,
    "high": 3,
    "medium": 7,
    "low": 4
  },
  "created_at": "2026-09-21T09:00:00Z",
  "completed_at": "2026-09-21T09:04:00Z"
}
```

---

# 74. Review Scope

V1 can support:

```text
repository
file
symbol
```

Future:

```text
commit
pull_request
changed_files
```

---

# 75. Review Issues Collection

Collection:

```text
review_issues
```

Each issue belongs to a review.

---

# 76. Review Issue Document

Example:

```json
{
  "_id": "ObjectId",
  "review_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "file_id": "ObjectId",
  "symbol_id": "ObjectId",
  "category": "security",
  "severity": "high",
  "title": "Potential unsafe input handling",
  "description": "...",
  "evidence": "...",
  "recommendation": "...",
  "start_line": 42,
  "end_line": 45,
  "source": "static_analysis",
  "status": "open",
  "created_at": "2026-09-21T09:03:00Z"
}
```

---

# 77. Review Issue Sources

Issues can originate from:

```text
static_analysis
ai
combined
```

This allows users to understand how a finding was produced.

---

# 78. Review Severity

V1:

```text
critical
high
medium
low
info
```

Severity is a review classification, not an absolute truth.

---

# 79. Patches Collection

Collection:

```text
patches
```

Stores proposed fixes.

---

# 80. Patch Document

Example:

```json
{
  "_id": "ObjectId",
  "review_issue_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "file_id": "ObjectId",
  "original_content": "...",
  "proposed_content": "...",
  "diff": "--- a/file.py\n+++ b/file.py\n...",
  "explanation": "Validate the input before processing it.",
  "status": "proposed",
  "created_at": "2026-09-21T09:05:00Z"
}
```

---

# 81. Patch Status

```text
proposed
accepted
rejected
```

Important:

> `accepted` does not mean the system automatically modified the repository.

It only means the user accepted the proposed patch conceptually.

V1 does not automatically modify the repository.

---

# 82. Reports Collection

Collection:

```text
reports
```

Stores metadata for generated reports.

---

# 83. Report Document

Example:

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "project_id": "ObjectId",
  "repository_id": "ObjectId",
  "analysis_id": "ObjectId",
  "review_id": "ObjectId",
  "report_type": "code_review",
  "format": "pdf",
  "status": "completed",
  "storage_key": "reports/project123/review456/report.pdf",
  "file_size": 124820,
  "created_at": "2026-09-21T09:10:00Z"
}
```

---

# 84. Report Formats

V1:

```text
markdown
pdf
docx
```

---

# 85. Report Storage

Generated report files should use the same storage abstraction:

```text
ReportStorage
```

or a generalized:

```text
FileStorage
```

architecture.

For V1, we can use the same underlying storage infrastructure as repositories while keeping repository and report storage keys logically separate.

---

# 86. Collection Relationship Overview

```text
users
  │
  └── projects
        │
        └── repositories
              │
              └── analyses
                    │
       ┌────────────┼──────────────┐
       ↓            ↓              ↓
     files       symbols      relationships
       │            │              │
       └────────────┼──────────────┘
                    ↓
                 features
                    │
                    ↓
               code_chunks
                    │
                    ↓
                embeddings


repositories
      │
      ├── analysis_jobs
      │
      ├── conversations
      │       └── messages
      │
      ├── code_reviews
      │       └── review_issues
      │              └── patches
      │
      └── reports
```

---

# 87. Referential Relationships

MongoDB does not enforce foreign keys like a traditional relational database.

The application therefore maintains logical references.

Example:

```text
files.analysis_id
```

must point to an existing:

```text
analyses._id
```

The service layer is responsible for enforcing this consistency.

---

# 88. Why We Are Not Embedding Everything

MongoDB supports nested documents, but we should not put the entire repository intelligence tree inside one document.

Bad:

```text
Repository
 └── 10,000 files
      └── 50,000 symbols
           └── 100,000 relationships
```

This would create enormous documents and difficult updates.

Instead:

```text
Repository
Analysis
Files
Symbols
Relationships
Chunks
```

are separate collections.

---

# 89. Why We Are Not Using One Collection for Everything

A single generic collection such as:

```text
code_entities
```

would make queries harder.

For example:

```text
Find all functions
Find all files
Find all dependencies
Find all chunks
Find all features
```

would require excessive filtering and complicated indexes.

Separate collections provide clearer domain boundaries.

---

# 90. Denormalization Strategy

MongoDB benefits from selective denormalization.

For example, an analysis can cache:

```json
{
  "statistics": {
    "files": 245,
    "symbols": 5000
  }
}
```

instead of counting the entire collection every time the dashboard opens.

But the detailed collections remain authoritative.

---

# 91. Multi-Tenant Isolation

Every repository-related query should be scoped through:

```text
user
 ↓
project
 ↓
repository
 ↓
analysis
```

For sensitive operations, authorization should verify ownership before retrieving the requested entity.

---

# 92. Defense-in-Depth Authorization

Do not rely only on:

```text
repository_id
```

For example, a request:

```text
GET /repositories/{repository_id}/files
```

must verify:

```text
authenticated user
       ↓
owns project
       ↓
project owns repository
       ↓
repository owns analysis
       ↓
analysis owns file
```

---

# 93. AI Isolation

Vector retrieval must always include repository scope.

Example:

```text
repository_id = R1
analysis_id = A3
```

The search must not accidentally retrieve:

```text
repository_id = R2
```

even if the embedding is highly similar.

---

# 94. Analysis Isolation

A file belongs to exactly one analysis snapshot.

Example:

```text
Analysis 1
  payment.py
  hash = ABC

Analysis 2
  payment.py
  hash = XYZ
```

These are separate file documents.

This prevents analysis versions from overwriting each other.

---

# 95. Immutable Analysis Data

Once an analysis reaches:

```text
completed
```

its analytical entities should be treated as immutable.

Do not modify:

```text
files
symbols
relationships
code_chunks
```

for that analysis.

If the repository changes:

```text
Create new analysis
```

---

# 96. Mutable Data

The following can remain mutable:

```text
projects
repositories metadata
conversations
messages
code review status
review issues
patch status
reports metadata
```

---

# 97. Transaction Strategy

Transactions are used selectively.

Good candidates:

```text
Create critical linked records
Update repository + analysis state
Finalize important state transitions
```

Avoid one transaction around:

```text
Entire repository analysis
```

because an analysis may process thousands of files.

---

# 98. Batch Persistence

Workers should process analysis results in batches.

Example:

```text
1000 files
    ↓
Batch 1 → persist
Batch 2 → persist
Batch 3 → persist
...
```

This provides:

- Lower memory usage
- Better failure recovery
- Better progress reporting
- Smaller database operations

---

# 99. Index Design Philosophy

Indexes are created based on actual query patterns.

We do not index every field.

The major query paths are:

```text
User → Projects
Project → Repositories
Repository → Analyses
Analysis → Files
File → Symbols
Symbol → Relationships
Repository → Features
Repository → Code Chunks
Review → Issues
Conversation → Messages
```

---

# 100. Core Index Summary

Recommended indexes:

### users

```text
{ email: 1 } UNIQUE
```

### projects

```text
{ owner_id: 1, is_deleted: 1 }
```

### repositories

```text
{ project_id: 1, is_deleted: 1 }
{ owner_id: 1, is_deleted: 1 }
```

### analyses

```text
{ repository_id: 1, version: -1 }
{ repository_id: 1, status: 1 }
```

### files

```text
{ analysis_id: 1, path: 1 } UNIQUE
{ analysis_id: 1, language: 1 }
```

### symbols

```text
{ analysis_id: 1, file_id: 1 }
{ analysis_id: 1, name: 1 }
{ parent_symbol_id: 1 }
```

### relationships

```text
{ analysis_id: 1, source_id: 1 }
{ analysis_id: 1, target_id: 1 }
{ analysis_id: 1, relationship_type: 1 }
```

### features

```text
{ analysis_id: 1, name: 1 }
{ repository_id: 1, analysis_id: 1 }
```

### code_chunks

```text
{ repository_id: 1, analysis_id: 1 }
{ file_id: 1 }
{ symbol_id: 1 }
```

### analysis_jobs

```text
{ status: 1, created_at: 1 }
{ repository_id: 1, created_at: -1 }
```

### conversations

```text
{ repository_id: 1, created_at: -1 }
{ user_id: 1, created_at: -1 }
```

### messages

```text
{ conversation_id: 1, created_at: 1 }
```

### code_reviews

```text
{ repository_id: 1, created_at: -1 }
```

### review_issues

```text
{ review_id: 1, severity: 1 }
{ file_id: 1 }
```

### patches

```text
{ review_issue_id: 1 }
```

### reports

```text
{ repository_id: 1, created_at: -1 }
```

---

# 101. Unique File Path

Within one analysis:

```text
analysis_id + path
```

must be unique.

Therefore:

```text
backend/payment.py
```

cannot appear twice within the same analysis.

---

# 102. Unique Analysis Version

Within a repository:

```text
repository_id + version
```

should be unique.

Example:

```text
Repository A
Analysis 1
Analysis 2
Analysis 3
```

---

# 103. Latest Analysis

The repository stores:

```text
current_analysis_id
```

This is a convenience reference.

Example:

```text
Repository
    ↓
current_analysis_id
    ↓
Analysis 3
```

Historical analyses remain accessible.

---

# 104. Storage Key Strategy

Actual repository files should use deterministic logical keys.

Example:

```text
repositories/
  {user_id}/
    {project_id}/
      {repository_id}/
        {analysis_id}/
          source/
            backend/
              payment.py
```

This provides strong isolation.

---

# 105. Why Include Analysis ID in Storage?

Because repository versions are immutable.

We want:

```text
Analysis 1
payment.py
```

and:

```text
Analysis 2
payment.py
```

to coexist when needed.

---

# 106. Storage Cleanup

When a project is deleted:

```text
Project
 ↓
Soft delete
 ↓
Cleanup Job
 ↓
Delete repository storage
 ↓
Delete analysis storage
 ↓
Delete reports
```

Database records can also be permanently removed after cleanup according to the application's retention policy.

---

# 107. Delete Dependency Order

Logical cleanup:

```text
Reports
Patches
Review Issues
Code Reviews
Messages
Conversations
Code Chunks
Features
Relationships
Symbols
Files
Analysis Jobs
Analyses
Repositories
Projects
```

The exact cleanup implementation can use asynchronous batches.

---

# 108. Analysis Cleanup

Deleting one analysis should remove:

```text
Files
Symbols
Relationships
Features
Code Chunks
Analysis Jobs associated with it
```

The source repository itself is not deleted unless the repository is deleted.

---

# 109. Repository Cleanup

Deleting a repository removes its analysis data and stored source files.

The parent project remains.

---

# 110. Project Cleanup

Deleting a project eventually removes:

```text
Repositories
Analyses
Code intelligence
Conversations
Reviews
Reports
Storage
```

The initial operation remains soft-deleted so accidental deletion can be handled safely before permanent cleanup.

---

# 111. Repository Storage Interface

The database stores:

```text
storage_key
```

not physical paths.

Application layer:

```text
RepositoryStorage
```

provides:

```text
save()
get()
exists()
delete()
list()
```

Possible implementations:

```text
LocalRepositoryStorage
ObjectRepositoryStorage
```

---

# 112. Example Complete Repository

```text
User
 │
 └── Project
      │
      └── Repository
           │
           ├── Analysis 1
           │    ├── Files
           │    ├── Symbols
           │    ├── Relationships
           │    ├── Features
           │    └── Code Chunks
           │
           └── Analysis 2
                ├── Files
                ├── Symbols
                ├── Relationships
                ├── Features
                └── Code Chunks
```

---

# 113. Example AI Query

User asks:

> "How does payment processing work?"

The database flow is:

```text
Conversation
      ↓
Message
      ↓
Repository
      ↓
Current Analysis
      ↓
Vector Search
      ↓
Code Chunks
      ↓
Files / Symbols
      ↓
Relationships
      ↓
Context Builder
      ↓
LLM
```

---

# 114. Example Feature Search

User searches:

> "Payment"

Flow:

```text
Feature Search
      ↓
Feature collection
      +
Code chunks
      +
Relationships
      +
AI
      ↓
Payment Feature
      ↓
Related Files
      ↓
Related Symbols
```

---

# 115. Example Impact Analysis

User selects:

```text
PaymentService.process_payment()
```

Flow:

```text
Symbol
 ↓
relationships.source_id
 ↓
CALLS / REFERENCES / DEPENDS_ON
 ↓
Related symbols
 ↓
Related files
 ↓
Features
 ↓
Tests
 ↓
Impact result
```

No AI is required for the basic graph traversal.

AI is used primarily to explain the impact.

---

# 116. Example Code Review

```text
CodeReview
    ↓
ReviewIssue
    ↓
File
    ↓
Symbol
    ↓
Patch
```

This gives us traceability:

```text
Why was this issue reported?
Where is it?
What symbol is involved?
What fix was suggested?
```

---

# 117. Data Traceability

The system should be able to trace:

```text
AI Answer
    ↓
Context
    ↓
Code Chunk
    ↓
Symbol
    ↓
File
    ↓
Analysis
    ↓
Repository
```

This is extremely important for reducing AI hallucinations.

---

# 118. AI Evidence

When possible, AI responses should reference:

```text
file
symbol
line range
```

Example:

```text
backend/services/payment.py
process_payment()
Lines 42–78
```

The database already contains the information needed to support this.

---

# 119. Technology Detection Data

Technology detection can be stored as analysis metadata:

```json
{
  "name": "FastAPI",
  "category": "backend_framework",
  "confidence": 0.94,
  "evidence": [
    "requirements.txt",
    "main.py"
  ]
}
```

This avoids creating a separate technology collection in V1.

---

# 120. Language Detection Data

Language information belongs primarily to file metadata.

Example:

```text
payment.py → Python
App.tsx → TypeScript
index.html → HTML
styles.css → CSS
```

The analysis summary can aggregate this.

---

# 121. Architecture Detection Data

Architecture information belongs to the analysis because it describes a repository snapshot.

Example:

```text
Analysis 3
 ↓
Architecture
 ↓
Layered Architecture
```

A future analysis may produce:

```text
Analysis 4
 ↓
Architecture
 ↓
Modular Monolith
```

without changing historical Analysis 3.

---

# 122. No Separate Architecture Collection in V1

We do not need:

```text
architectures
```

as a separate collection initially.

Architecture is analysis metadata.

If architecture becomes a complex independently queryable domain later, we can extract it.

---

# 123. No Separate Technologies Collection in V1

Similarly:

```text
technology_stack
```

is analysis metadata.

This keeps V1 simple.

---

# 124. No Separate Folders Collection in V1

Folders are derived from:

```text
files.path
```

This avoids duplicated hierarchy information.

If future graph requirements demand persistent directory nodes, a folder entity can be introduced.

---

# 125. MongoDB Document Size Consideration

Large content should not be blindly embedded inside parent documents.

For example:

```text
Conversation
 └── 10,000 messages
```

should not become one enormous document.

Instead:

```text
conversations
messages
```

are separate.

The same principle applies to:

```text
Repository
Files
Symbols
Relationships
Chunks
```

---

# 126. Query Patterns

The database is designed around these common queries:

### Dashboard

```text
Get project
Get repository
Get current analysis
Get statistics
```

### File Explorer

```text
Get files for analysis
Filter by path/language
```

### Code Viewer

```text
Get file metadata
Get source from storage
```

### Symbol Explorer

```text
Get symbols for file
```

### Dependency Graph

```text
Get relationships for selected node
```

### Feature Search

```text
Find relevant features
```

### AI

```text
Vector search code chunks
```

### Impact

```text
Traverse relationships
```

### Code Review

```text
Get review
Get issues
Get patches
```

---

# 127. Pagination

Large collections must use pagination.

Especially:

```text
Files
Symbols
Relationships
Features
Messages
Review issues
Reports
```

Do not return thousands of documents in one API request.

---

# 128. Pagination Strategy

V1 can use:

```text
limit
cursor
```

rather than relying exclusively on:

```text
page
offset
```

Cursor-based pagination scales better for large repositories.

The API Design document will define the exact format.

---

# 129. Large Repository Considerations

The system must assume that a repository may contain:

```text
10,000+
files
100,000+
symbols
Millions+
relationships
```

Therefore:

- Use indexes
- Paginate
- Batch writes
- Lazy-load graph data
- Don't load entire repository into frontend
- Don't send entire repository to LLM
- Don't create giant MongoDB documents

---

# 130. Graph Retrieval Strategy

For a selected node:

```text
Node A
 ↓
Get direct relationships
 ↓
Return first-level graph
```

When user expands:

```text
Node B
 ↓
Get B's relationships
```

This keeps graph requests manageable.

---

# 131. Vector Retrieval Strategy

Do not search all chunks globally.

Search:

```text
repository_id
+
analysis_id
+
vector similarity
```

Optionally later:

```text
language
file_type
feature
symbol
```

can be used as additional filters.

---

# 132. AI Context Storage

We should not persist every generated AI context permanently.

Instead:

```text
Stored:
Question
Answer
Referenced entities
```

Temporary:

```text
Full context assembled for the LLM
```

unless required for debugging or evaluation.

---

# 133. AI Request Metadata

Future-compatible conversation messages can optionally contain:

```text
model
provider
retrieval_count
latency
token_usage
```

These can be added without changing the fundamental model.

---

# 134. Cost Tracking

V1 does not require sophisticated billing.

However, AI messages can optionally store:

```text
provider
model
input_tokens
output_tokens
```

This will help future SaaS billing.

---

# 135. SaaS Billing Future

The database should eventually support:

```text
organizations
subscriptions
plans
usage
credits
```

but these are **outside V1**.

Do not introduce them now.

---

# 136. Future Organization Model

Current:

```text
User
 └── Project
```

Future:

```text
User
 └── Organization
       └── Project
```

The current design should not prevent this future evolution.

---

# 137. Future Git Data

Future collections may include:

```text
commits
branches
pull_requests
changes
```

The analysis version model already prepares the system for this.

---

# 138. Future Incremental Analysis

Current:

```text
Repository
 ↓
Full Analysis
```

Future:

```text
Previous Analysis
       ↓
Changed Files
       ↓
Incremental Analysis
       ↓
New Analysis Version
```

File hashes provide the foundation for identifying unchanged files.

---

# 139. Future Graph Database

Current:

```text
relationships
```

are stored in MongoDB.

Future:

```text
GraphRepository
       ↓
MongoDB
       OR
Neo4j
```

The application should interact through the graph module rather than directly depending on MongoDB relationship queries everywhere.

---

# 140. Future Vector Database

Current:

```text
MongoDB Vector Search
```

Future:

```text
VectorStore
   ├── MongoDB
   ├── Qdrant
   └── Other provider
```

The AI module should depend on a vector-search abstraction.

---

# 141. Data Lifecycle

Complete repository lifecycle:

```text
Upload
  ↓
Repository Created
  ↓
Analysis Created
  ↓
Analysis Job Created
  ↓
Worker Processes
  ↓
Files Created
  ↓
Symbols Created
  ↓
Relationships Created
  ↓
Features Created
  ↓
Chunks + Embeddings Created
  ↓
Analysis Completed
  ↓
Repository.current_analysis_id updated
```

---

# 142. Failure Lifecycle

If analysis fails:

```text
Analysis
 ↓
status = failed
 ↓
Analysis Job
 ↓
status = failed
 ↓
error information stored
```

Previous successful analysis remains available.

This is an important benefit of immutable analysis versions.

---

# 143. Partial Failure

Example:

```text
Python Analyzer       ✓
TypeScript Analyzer   ✓
Rust Analyzer         ✗
```

The analysis can become:

```text
partial
```

with an error recorded.

The rest of the repository remains usable.

---

# 144. Database as Source of Truth

The source of truth for:

```text
Repository metadata
Analysis state
Code intelligence
Features
Reviews
Reports
```

is MongoDB.

The source of truth for:

```text
Temporary job queue
```

is Redis.

The source of truth for:

```text
Actual source files
```

is RepositoryStorage.

---

# 145. Final Storage Architecture

```text
                        APPLICATION
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ↓                ↓                ↓
         MongoDB           Redis        RepositoryStorage
            │                │                │
            │                │          ┌─────┴──────┐
            │                │          │            │
            ↓                ↓          ↓            ↓
      Persistent Data    Queue/Cache  Local        Object
                                    Storage       Storage
```

---

# 146. Final MongoDB Architecture

```text
MongoDB
│
├── users
│
├── projects
│
├── repositories
│
├── analyses
│
├── files
│
├── symbols
│
├── relationships
│
├── features
│
├── code_chunks
│
├── analysis_jobs
│
├── conversations
│
├── messages
│
├── code_reviews
│
├── review_issues
│
├── patches
│
└── reports
```

---

# 147. Final Domain Model

```text
                         USER
                           │
                           │ owns
                           ↓
                        PROJECT
                           │
                           │ contains
                           ↓
                      REPOSITORY
                           │
                           │ has
                           ↓
                       ANALYSIS
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
       ↓                   ↓                    ↓
     FILES              SYMBOLS          RELATIONSHIPS
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
                           ↓
                        FEATURES
                           │
                           ↓
                      CODE CHUNKS
                           │
                           ↓
                       EMBEDDINGS


REPOSITORY
    │
    ├── CONVERSATIONS
    │       └── MESSAGES
    │
    ├── CODE REVIEWS
    │       └── REVIEW ISSUES
    │               └── PATCHES
    │
    ├── ANALYSIS JOBS
    │
    └── REPORTS
```

---

# 148. Final Design Decisions

The following decisions are locked for V1:

- [x] MongoDB as primary database
- [x] MongoDB Vector Search
- [x] Redis for queue/cache/temporary state
- [x] LocalRepositoryStorage for development
- [x] ObjectRepositoryStorage abstraction for production
- [x] Actual repository files outside MongoDB
- [x] User → Project → Repository hierarchy
- [x] Multi-user isolation
- [x] Immutable analysis versions
- [x] Separate collections
- [x] File-level intelligence
- [x] Class/function/method-level intelligence
- [x] Explicit relationships
- [x] First-class features
- [x] Semantic code chunks
- [x] Repository-scoped vector search
- [x] Repository-aware conversations
- [x] Persisted code reviews
- [x] Persisted review issues
- [x] Persisted proposed patches
- [x] Persisted report metadata
- [x] Soft deletion
- [x] Asynchronous cleanup
- [x] Selective MongoDB transactions
- [x] Query-driven indexes
- [x] Batch analysis persistence
- [x] Cursor-based pagination
- [x] No Neo4j in V1
- [x] No dedicated vector DB in V1
- [x] No PostgreSQL in V1
- [x] No unnecessary additional database

---

# 149. Database Design → API Design Dependency

The API Design should now be created from this database/domain model.

The API layer should expose business resources such as:

```text
/auth
/projects
/repositories
/analyses
/files
/symbols
/graph
/features
/ai
/impact
/code-reviews
/reports
```

The API should **not simply expose MongoDB collections directly**.

For example, avoid designing an API like:

```text
GET /mongodb/code_chunks
```

Instead:

```text
POST /repositories/{repository_id}/ai/query
```

The API represents business capabilities.

---

# 150. Next Document

The next logical document is:

> **REST API Design Document**

It should define:

- API versioning
- Authentication
- Authorization
- Endpoints
- Request schemas
- Response schemas
- Pagination
- Error responses
- HTTP status codes
- Repository upload APIs
- Analysis APIs
- WebSocket events
- File APIs
- Symbol APIs
- Graph APIs
- Feature search APIs
- AI APIs
- Impact analysis APIs
- Code review APIs
- Patch APIs
- Report APIs

The API design should use this Database Design as its **domain/data foundation**, while keeping the API decoupled from MongoDB implementation details.