# Repository Intelligence Platform
## System Design Architecture Document

**Version:** 1.0  
**Status:** Approved Architecture Baseline  
**Architecture Style:** Modular Monolith + Background Workers  
**Frontend:** React + TypeScript + Vite  
**Backend:** Python + FastAPI  
**Primary Database:** MongoDB  
**Vector Search:** MongoDB Vector Search capabilities  
**Queue:** Redis-compatible queue  
**Workers:** Python Background Workers  
**Real-time Communication:** WebSockets  
**Repository Parsing:** Tree-sitter / language-specific analyzers  
**AI:** Provider abstraction, OpenRouter initially  
**Deployment:** Vercel + Render  
**Containerization:** Docker + Docker Compose  
**API:** REST  
**Authentication:** Email + Password

---

# 1. Purpose

This document defines the technical architecture of the Repository Intelligence Platform.

The system is designed to analyze software repositories and construct an intelligent representation of:

- Repository structure
- Files and folders
- Programming languages
- Frameworks
- Technologies
- Classes
- Functions
- Methods
- Dependencies
- Relationships
- Architecture
- Features
- Code semantics
- Embeddings
- Code-quality findings

This information powers:

- Repository exploration
- Dependency graphs
- Architecture visualization
- Feature discovery
- Repository-aware AI
- Code explanation
- Impact analysis
- Code review
- Fix suggestions
- Patch generation
- Report generation

---

# 2. Architectural Principles

The system follows these principles.

## 2.1 Modular Monolith First

V1 will not use microservices.

The backend will be a modular monolith:

```text
FastAPI
│
├── Auth Module
├── User Module
├── Project Module
├── Repository Module
├── Analysis Module
├── Code Intelligence Module
├── Graph Module
├── AI Module
├── Impact Analysis Module
├── Code Review Module
└── Report Module
```

Modules must have clear responsibilities and interfaces.

The architecture must make future extraction into independent services possible.

---

# 3. Why Modular Monolith?

The application has many logically separate capabilities, but introducing microservices immediately would create unnecessary complexity.

Microservices would require:

```text
Service discovery
API gateway
Multiple deployments
Inter-service authentication
Distributed tracing
Multiple databases/connections
Network failures
Service versioning
```

These are unnecessary for V1.

Instead:

```text
                Modular Monolith
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
 Repository        Analysis            AI
 Module            Module              Module
```

Later:

```text
Repository Service
Analysis Service
AI Service
Code Review Service
```

can be extracted if scale requires it.

---

# 4. High-Level Architecture

```text
                              INTERNET
                                  │
                                  ↓
                       ┌────────────────────┐
                       │       VERCEL       │
                       │                    │
                       │ React + TypeScript │
                       │       + Vite       │
                       └─────────┬──────────┘
                                 │
                    REST API + WebSocket
                                 │
                                 ↓
                       ┌────────────────────┐
                       │      RENDER        │
                       │                    │
                       │      FastAPI       │
                       │ Modular Monolith   │
                       └─────────┬──────────┘
                                 │
               ┌─────────────────┼──────────────────┐
               │                 │                  │
               ↓                 ↓                  ↓
          MongoDB             Redis             Worker
               │                 │                  │
               │                 │                  ↓
               │                 │          Repository Analysis
               │                 │                  │
               │                 │                  ↓
               │                 │          Language Analysis
               │                 │                  │
               │                 │                  ↓
               │                 │          Dependency Analysis
               │                 │                  │
               │                 │                  ↓
               │                 │          Embedding Generation
               │                 │                  │
               │                 │                  ↓
               │                 │          Feature Analysis
               │                 │
               │                 ↓
               │             Job State
               │
               ├── Users
               ├── Projects
               ├── Repositories
               ├── Analysis Metadata
               ├── Code Intelligence
               ├── Relationships
               ├── Features
               ├── Reviews
               ├── Reports
               └── Vector Data
```

---

# 5. Frontend Architecture

## Technology

```text
React
TypeScript
Vite
TanStack Query
Zustand
Monaco Editor
Graph Visualization Library
```

---

# 6. Frontend Responsibilities

The frontend handles:

- Authentication UI
- Project management
- Repository upload
- Repository dashboard
- File explorer
- Code viewer
- Dependency graph
- Architecture visualization
- Feature search
- AI chat
- Impact analysis
- Code review
- Report generation
- Analysis progress
- Application state

The frontend should not perform repository analysis.

---

# 7. Frontend Structure

Recommended structure:

```text
frontend/
│
├── src/
│   │
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── layouts/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── repositories/
│   │   ├── analysis/
│   │   ├── code-intelligence/
│   │   ├── graph/
│   │   ├── features/
│   │   ├── ai/
│   │   ├── impact/
│   │   ├── code-review/
│   │   └── reports/
│   │
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── styles/
│
└── package.json
```

Feature-based organization should be preferred over organizing everything by component type.

---

# 8. Frontend State Management

Two types of state are required.

## Server State

Use:

**TanStack Query**

For:

- Projects
- Repositories
- Analysis status
- Files
- Features
- Reviews
- Reports
- AI conversation data

Example:

```text
React
 ↓
TanStack Query
 ↓
REST API
 ↓
FastAPI
```

---

## Client/UI State

Use:

**Zustand**

For:

- Selected file
- Selected node
- Graph filters
- Sidebar state
- Theme
- UI preferences
- Current analysis view

---

# 9. Code Viewer

Use:

**Monaco Editor**

The V1 code viewer is primarily read-only.

Architecture:

```text
Repository File
      ↓
FastAPI
      ↓
Frontend
      ↓
Monaco Editor
```

The user can select:

- File
- Class
- Function
- Method
- Code range

and invoke:

```text
Explain
Impact Analysis
Code Review
Show Dependencies
Ask AI
```

---

# 10. Backend Architecture

Backend technology:

```text
Python
FastAPI
Pydantic
AsyncIO
MongoDB Driver
Redis Client
WebSockets
```

The backend is a modular monolith.

---

# 11. Backend Module Structure

```text
backend/
│
├── app/
│   │
│   ├── main.py
│   │
│   ├── core/
│   │   ├── config/
│   │   ├── security/
│   │   ├── exceptions/
│   │   ├── logging/
│   │   └── dependencies/
│   │
│   ├── modules/
│   │
│   │   ├── auth/
│   │   ├── users/
│   │   ├── projects/
│   │   ├── repositories/
│   │   ├── analysis/
│   │   ├── code_intelligence/
│   │   ├── graph/
│   │   ├── ai/
│   │   ├── impact/
│   │   ├── code_review/
│   │   └── reports/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── redis/
│   │   ├── storage/
│   │   ├── llm/
│   │   └── embeddings/
│   │
│   └── shared/
│
├── workers/
│
└── tests/
```

---

# 12. Module Responsibilities

## Auth Module

Responsibilities:

- Registration
- Login
- Password hashing
- JWT generation
- Token validation
- Authentication dependencies

---

## Users Module

Responsibilities:

- User profile
- User settings
- Account management

---

## Projects Module

Responsibilities:

- Create project
- Update project
- Delete project
- List projects
- Project ownership

---

## Repository Module

Responsibilities:

- GitHub repository input
- ZIP upload
- Repository metadata
- Repository storage
- Repository version
- Repository status

---

## Analysis Module

Responsibilities:

- Analysis orchestration
- File discovery
- Language detection
- Framework detection
- Configuration detection
- Analysis jobs
- Analysis status

---

## Code Intelligence Module

Responsibilities:

- AST extraction
- Symbol extraction
- Dependency extraction
- Call relationships
- Code entities
- Normalized code representation

---

## Graph Module

Responsibilities:

- Relationship storage/retrieval
- Graph construction
- Graph queries
- Graph filtering
- Graph traversal

---

## AI Module

Responsibilities:

- AI provider abstraction
- Prompt construction
- Context construction
- Semantic retrieval
- Repository-aware chat
- Code explanation
- Feature reasoning

---

## Impact Module

Responsibilities:

- Dependency traversal
- Direct impact
- Indirect impact
- Test impact
- Feature impact
- AI explanation

---

## Code Review Module

Responsibilities:

- Review orchestration
- Rule execution
- AI review
- Issue aggregation
- Fix suggestions
- Patch generation

---

## Report Module

Responsibilities:

- Report generation
- Markdown
- PDF
- DOCX
- Report persistence

---

# 13. Dependency Rule Between Modules

Modules should not directly access another module's internal implementation.

Bad:

```text
AI Module
   ↓
repositories/database/models.py
```

Preferred:

```text
AI Module
   ↓
Repository Interface
   ↓
Repository Module
```

This preserves modularity.

---

# 14. Database Decision

Primary database:

> **MongoDB**

Reasons:

1. Flexible schema
2. Repository metadata varies by language
3. Code entities have evolving structures
4. Natural document representation
5. Good fit for nested repository metadata
6. Vector search capabilities
7. Fewer infrastructure components for V1

---

# 15. MongoDB Data Domains

Major collections:

```text
users
projects
repositories
analysis_jobs
files
symbols
relationships
features
code_chunks
conversations
messages
impact_analyses
code_reviews
review_issues
patches
reports
```

The exact schema will be defined in the separate Database Design document.

---

# 16. Why Not Store Repository Files Directly in MongoDB?

Source repositories can become large.

Therefore:

```text
MongoDB
→ metadata
→ analysis results
→ relationships
→ embeddings
```

while repository source files should use object/file storage.

For local development:

```text
Local filesystem / mounted storage
```

For deployment:

```text
Object storage
```

The storage abstraction should prevent application code from depending on a particular storage provider.

---

# 17. Repository Storage Abstraction

```text
RepositoryStorage
       │
       ├── LocalStorage
       │
       └── ObjectStorage
```

V1 development can use local storage.

Deployment can use an object-storage provider.

---

# 18. Repository Ingestion

Two V1 entry points:

```text
GitHub Public Repository
```

and

```text
ZIP Upload
```

---

# 19. GitHub Ingestion Flow

```text
User
 ↓
React
 ↓
POST /repositories/github
 ↓
FastAPI
 ↓
Validate URL
 ↓
Create Repository
 ↓
Create Analysis Job
 ↓
Queue Job
 ↓
Worker
 ↓
Clone/Download Repository
 ↓
Safe Repository Preparation
```

---

# 20. ZIP Ingestion Flow

```text
User
 ↓
Upload ZIP
 ↓
FastAPI
 ↓
Validate upload
 ↓
Create Repository
 ↓
Queue Analysis Job
 ↓
Worker
 ↓
Safe Extraction
 ↓
Repository Preparation
```

---

# 21. Repository Security

Repository code is considered untrusted input.

The system must:

- Validate ZIP files
- Protect against zip bombs
- Prevent path traversal
- Detect dangerous symlinks
- Ignore unnecessary binary files
- Limit extraction size
- Limit file count
- Avoid executing repository scripts

---

# 22. No Repository Code Execution

V1 uses static analysis.

The system must not automatically execute:

```text
npm scripts
pip install
setup.py
Makefiles
shell scripts
Docker builds
Gradle tasks
Maven lifecycle commands
```

This significantly reduces security risk.

---

# 23. Repository Filtering

The analyzer should ignore common generated/dependency directories:

```text
.git/
node_modules/
venv/
.venv/
__pycache__/
dist/
build/
target/
coverage/
.cache/
```

The ignore mechanism should be configurable.

---

# 24. Analysis Architecture

The analysis engine is the core technical component.

```text
Repository
    ↓
Preparation
    ↓
File Discovery
    ↓
Classification
    ↓
Language Detection
    ↓
Framework Detection
    ↓
Language Analysis
    ↓
AST
    ↓
Symbol Extraction
    ↓
Dependency Extraction
    ↓
Relationship Construction
    ↓
Architecture Detection
    ↓
Feature Understanding
    ↓
Chunking
    ↓
Embedding
    ↓
Persistence
```

---

# 25. Analysis Pipeline

Analysis should be divided into stages.

```text
Stage 1
Repository Preparation

Stage 2
File Discovery

Stage 3
Language Detection

Stage 4
Technology Detection

Stage 5
Parsing

Stage 6
Symbol Extraction

Stage 7
Dependency Analysis

Stage 8
Relationship Construction

Stage 9
Architecture Analysis

Stage 10
Semantic Chunking

Stage 11
Embedding

Stage 12
Feature Understanding

Stage 13
Finalization
```

---

# 26. Language-Agnostic Architecture

The platform must not hard-code a fixed list of supported programming languages into the core system.

Instead:

```text
                    Analysis Engine
                          │
                 Language Detector
                          │
              ┌───────────┼───────────┐
              ↓           ↓           ↓
          Python       Java       TypeScript
          Adapter      Adapter      Adapter
              │           │           │
              └───────────┼───────────┘
                          ↓
                  Common Representation
```

---

# 27. Language Adapter

Each adapter is responsible for translating language-specific syntax into a common model.

Example:

```text
Python
 ├── class
 ├── function
 └── import

Java
 ├── class
 ├── method
 └── import

TypeScript
 ├── class
 ├── function
 └── import
```

All eventually become:

```text
Symbol
Relationship
Dependency
```

---

# 28. Tree-sitter

Tree-sitter or an equivalent multi-language parsing framework will be considered the primary parsing foundation.

Conceptually:

```text
Source Code
    ↓
Tree-sitter Parser
    ↓
Syntax Tree
    ↓
Language Adapter
    ↓
Normalized Representation
```

The system should not depend exclusively on Tree-sitter for every possible language-specific semantic feature.

---

# 29. Common Code Representation

The analyzer should normalize language-specific information into concepts such as:

```text
Repository
Directory
File
Module
Class
Interface
Function
Method
Variable
Import
Export
API
Endpoint
Entity
Test
Configuration
```

---

# 30. Symbol Representation

A symbol should contain information conceptually similar to:

```text
Symbol
├── id
├── repository_id
├── file_id
├── type
├── name
├── language
├── start_line
├── end_line
├── parent_id
└── metadata
```

The exact schema belongs to the Database Design document.

---

# 31. Relationship Model

Relationships should represent connections such as:

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

Example:

```text
PaymentController
      │
      │ CALLS
      ↓
PaymentService
      │
      │ CALLS
      ↓
PaymentRepository
```

---

# 32. Knowledge Graph Representation

V1 does not require Neo4j.

The logical graph exists independently of the database technology.

```text
Node
 ├── id
 ├── type
 └── metadata

Edge
 ├── source
 ├── target
 ├── relationship
 └── metadata
```

MongoDB stores this relationship information.

A future Neo4j adapter can replace the persistence implementation if required.

---

# 33. Graph Abstraction

The graph module should expose operations such as:

```text
get_dependencies()
get_dependents()
get_callers()
get_callees()
get_related_files()
get_feature_relationships()
traverse()
```

The rest of the application should not care whether these are implemented using:

```text
MongoDB
Neo4j
Another graph engine
```

---

# 34. Feature Discovery Architecture

Feature discovery combines three sources:

```text
Static Analysis
+
Semantic Search
+
AI Reasoning
```

Example:

```text
User:
"Payment"

       ↓

Query Understanding

       ↓

Semantic Retrieval
       +
Static Relationship Retrieval

       ↓

Candidate Files

       ↓

AI Ranking / Reasoning

       ↓

Feature Result
```

---

# 35. Feature Discovery Confidence

Each candidate should have an internal confidence/relevance score.

Example:

```text
PaymentService.java
High relevance

PaymentController.java
High relevance

UserService.java
Low relevance
```

The exact score does not necessarily need to be exposed to users.

---

# 36. Ambiguous Feature Query

If confidence is insufficient:

```text
User Query
    ↓
Feature Understanding
    ↓
Low Confidence
    ↓
Clarification Question
```

Example:

> "I found multiple order-related areas. Are you looking for customer order creation, order processing, or admin order management?"

The system must not fabricate certainty.

---

# 37. Semantic Code Index

Code must be divided into meaningful chunks.

Bad:

```text
Every 500 characters
```

Preferred:

```text
Class
Function
Method
Logical code block
Documentation
Configuration block
```

Each chunk should retain:

```text
Repository
File
Symbol
Line range
Content
Metadata
Embedding
```

---

# 38. Vector Retrieval

For a question:

> "Where is payment processing implemented?"

The AI context engine can retrieve:

```text
PaymentService
PaymentController
StripeService
PaymentRepository
```

using semantic similarity.

---

# 39. AI Context Engine

The AI should not receive the entire repository.

Instead:

```text
User Query
     ↓
Query Analyzer
     ↓
Relevant Repository Context
     │
     ├── Files
     ├── Symbols
     ├── Graph Relationships
     ├── Semantic Chunks
     ├── Features
     └── Metadata
     ↓
Context Builder
     ↓
LLM
```

---

# 40. AI Provider Abstraction

```text
LLMProvider
     │
     ├── OpenRouterProvider
     ├── OpenAIProvider
     ├── GeminiProvider
     └── ClaudeProvider
```

Application modules interact with:

```text
LLMProvider
```

not directly with OpenAI/OpenRouter/etc.

---

# 41. Provider Factory

Conceptually:

```text
AIProviderFactory
       ↓
Provider Configuration
       ↓
Selected Provider
```

Example:

```text
provider = "openrouter"
```

can produce:

```text
OpenRouterProvider
```

Changing the provider should not require modifying AI business logic.

---

# 42. AI Fallback

A future fallback mechanism may be:

```text
Primary Provider
      ↓
Failure
      ↓
Fallback Provider
```

Example:

```text
OpenRouter
   ↓ failure
Gemini
   ↓ failure
OpenAI
```

The exact fallback policy will be defined later.

V1 should not over-engineer automatic fallback.

---

# 43. Repository-Aware Chat

Chat flow:

```text
User Question
      ↓
Authentication
      ↓
Project Context
      ↓
Repository Context
      ↓
Query Classification
      ↓
Retrieval
      ↓
Context Construction
      ↓
LLM
      ↓
Answer
```

---

# 44. Chat Query Types

The system should identify questions such as:

```text
Code Explanation
Repository Navigation
Feature Discovery
Architecture
Dependency
Impact
General Repository Question
```

Different query types can trigger different retrieval strategies.

---

# 45. Code Explanation Flow

```text
User selects function
        ↓
Frontend sends symbol ID
        ↓
Backend retrieves:
    ├── source code
    ├── parent class
    ├── dependencies
    ├── callers
    └── related symbols
        ↓
Context Builder
        ↓
LLM
        ↓
Explanation
```

---

# 46. Impact Analysis Architecture

Impact analysis should prioritize deterministic relationships.

```text
Selected Symbol
      ↓
Graph Traversal
      ↓
Direct Dependencies
      ↓
Indirect Dependencies
      ↓
Tests
      ↓
Features
      ↓
APIs
      ↓
AI Explanation
```

---

# 47. Impact Categories

Results:

```text
Direct Impact
Indirect Impact
Tests Affected
Features Affected
API Impact
Potential Impact
```

AI should explain the reason for each relationship.

---

# 48. Impact Analysis Example

```text
Selected:

PaymentService.processPayment()

Results:

Direct:
PaymentController
PaymentServiceTest

Indirect:
CheckoutService
OrderService

Feature:
Checkout
Payment

API:
POST /payments
```

---

# 49. Code Review Architecture

Code review combines:

```text
Static Rules
+
AST Analysis
+
Dependency Analysis
+
AI Review
```

Flow:

```text
Review Request
      ↓
Determine Scope
      ↓
Collect Relevant Code
      ↓
Static Analysis
      ↓
AI Analysis
      ↓
Issue Aggregation
      ↓
Deduplication
      ↓
Severity Classification
      ↓
Review Result
```

---

# 50. V1 Code Review Rules

Initial categories:

```text
Correctness
Security Basics
Code Smells
Maintainability
Performance Basics
Error Handling
Testing Gaps
Architecture Concerns
```

More rules can be added through a rule-engine architecture.

---

# 51. Review Rule Architecture

```text
CodeReviewEngine
       │
       ├── CorrectnessRules
       ├── SecurityRules
       ├── MaintainabilityRules
       ├── PerformanceRules
       ├── TestingRules
       └── ArchitectureRules
```

This should be extensible.

---

# 52. Review Issue

Conceptually:

```text
ReviewIssue
├── id
├── category
├── severity
├── file
├── symbol
├── line
├── description
├── evidence
├── recommendation
└── patch
```

---

# 53. Patch Generation

Patch flow:

```text
Issue
 ↓
Relevant Code
 ↓
Repository Context
 ↓
LLM
 ↓
Proposed Patch
 ↓
Patch Validation
 ↓
User Review
```

The system must not automatically modify the original repository.

---

# 54. Patch Format

The preferred representation is a standard diff-like format.

Example:

```text
--- PaymentService.java
+++ PaymentService.java

- old line
+ corrected line
```

The UI can display:

```text
Original
+
Proposed
```

side by side.

---

# 55. Background Worker Architecture

Repository analysis should not execute inside the API request.

```text
FastAPI
   ↓
Create Analysis Job
   ↓
Redis Queue
   ↓
Worker
   ↓
Analysis Pipeline
```

---

# 56. Why Workers?

Without workers:

```text
HTTP Request
    ↓
5-minute analysis
    ↓
Timeout
```

With workers:

```text
HTTP Request
    ↓
Job Created
    ↓
HTTP 202
    ↓
Worker
    ↓
Analysis
```

The user can continue using the application.

---

# 57. Worker Responsibilities

Workers handle:

- Repository download
- ZIP extraction
- File scanning
- Parsing
- AST processing
- Dependency analysis
- Graph construction
- Embedding generation
- Feature analysis
- Large code-review jobs
- Report generation

---

# 58. Job Model

Conceptually:

```text
AnalysisJob
├── id
├── repository_id
├── type
├── status
├── progress
├── current_stage
├── created_at
├── started_at
├── completed_at
└── error
```

Statuses:

```text
QUEUED
RUNNING
COMPLETED
FAILED
CANCELLED
```

---

# 59. Job Idempotency

A job should be designed so it can safely retry stages where possible.

For example:

```text
Language Detection
```

should not create duplicate records every time a worker retries.

This is important because worker systems can experience failures.

---

# 60. Analysis Progress

The worker updates:

```text
progress = 65
stage = "dependency_analysis"
```

The backend publishes progress through WebSocket.

---

# 61. WebSocket Architecture

```text
React
  ↕
WebSocket
  ↕
FastAPI WebSocket Manager
  ↕
Analysis Event System
  ↕
Worker / Job State
```

The WebSocket is used for:

- Analysis progress
- AI streaming where applicable
- Future live events

---

# 62. WebSocket Room Model

A user can subscribe to a project/repository analysis channel.

Conceptually:

```text
/project/{project_id}/analysis/{analysis_id}
```

Only authorized users should receive events for that project.

---

# 63. Redis Responsibilities

Redis is used for:

```text
Job Queue
Temporary Job State
Pub/Sub if required
Caching
Rate Limiting where appropriate
```

Redis is not the permanent source of truth.

MongoDB remains the persistent source.

---

# 64. Redis Failure

If Redis restarts:

```text
Redis
 ↓
Temporary state may disappear
```

The system should retrieve authoritative job state from MongoDB.

The architecture must not depend entirely on Redis persistence.

---

# 65. Report Generation

Report generation should also be asynchronous when reports become large.

```text
Generate Report
      ↓
Job
      ↓
Worker
      ↓
Markdown
      ↓
PDF / DOCX
      ↓
Storage
      ↓
Download
```

---

# 66. API Architecture

REST API.

Base:

```text
/api/v1
```

Example:

```text
/api/v1/auth
/api/v1/projects
/api/v1/repositories
/api/v1/analysis
/api/v1/files
/api/v1/features
/api/v1/ai
/api/v1/impact
/api/v1/code-review
/api/v1/reports
```

Detailed API contracts belong in the API Design document.

---

# 67. API Versioning

Use:

```text
/api/v1
```

from the beginning.

Future breaking changes can use:

```text
/api/v2
```

---

# 68. Authentication Flow

V1:

```text
Email
Password
   ↓
FastAPI
   ↓
Password Hash Verification
   ↓
JWT
   ↓
Frontend
```

Protected API:

```text
Authorization: Bearer <token>
```

---

# 69. Password Security

Passwords must never be stored as plaintext.

Use a strong password hashing algorithm such as:

```text
Argon2
```

or an equivalent secure password hashing implementation.

---

# 70. Authorization

Every project-owned resource must verify:

```text
Authenticated User
        ↓
Project Ownership
        ↓
Resource Access
```

Example:

```text
User A
 ↓
Project A
 ↓
Repository A
```

User B must not access Repository A.

---

# 71. Tenant Isolation

Although full organizations are future scope, project-level isolation must exist from V1.

Every major resource should be associated with an owner/project.

---

# 72. Repository Data Isolation

The system must ensure:

```text
Project A
    ↓
Repository A
    ↓
Code A
```

cannot accidentally enter:

```text
Project B
    ↓
AI Context
```

This is especially important for vector retrieval.

---

# 73. AI Data Isolation

Every AI retrieval operation must include repository/project scope.

Conceptually:

```text
query_vector
+
repository_id
+
project_id
```

before semantic search.

Never perform unrestricted global repository search.

---

# 74. AI Prompt Security

Repository content should be treated as untrusted input.

A source file might contain text such as:

```text
Ignore previous instructions...
```

The AI context builder must treat source code as **data**, not system instructions.

---

# 75. Secrets

The system should never intentionally index sensitive environment files.

Examples:

```text
.env
.env.local
credentials
private keys
secret configuration
```

Secret detection can be enhanced later.

---

# 76. Repository Code Privacy

The platform should clearly define how repository source code is handled.

The architecture should support:

- Secure temporary processing
- Controlled storage
- Project-level access control
- Secure deletion
- No unnecessary provider exposure

---

# 77. Error Handling

Errors should be categorized.

```text
ValidationError
AuthenticationError
AuthorizationError
RepositoryError
AnalysisError
AIError
StorageError
QueueError
ReportError
```

The API should return consistent error responses.

---

# 78. Partial Analysis Failure

The entire analysis should not necessarily fail because one analyzer fails.

Example:

```text
Python Analyzer     ✓
Java Analyzer       ✓
Rust Analyzer       ⚠
Generic Analysis    ✓
```

The repository can still be usable.

The system should record:

```text
Analyzer status
Error
Affected capability
```

---

# 79. Observability

V1 should implement basic:

- Structured logging
- Request IDs
- Job IDs
- Error logging
- Analysis-stage logging

Later:

```text
Metrics
Tracing
Distributed tracing
```

can be added.

---

# 80. Logging Principle

Never log:

- Passwords
- JWT tokens
- API keys
- Repository secrets
- Sensitive source code unnecessarily

---

# 81. Caching

Caching may be introduced for:

- Repository metadata
- Repeated graph queries
- AI retrieval
- Frequently accessed files
- Expensive analysis results

Redis can be used.

Caching should never become the source of truth.

---

# 82. Repository Re-analysis

When a repository is analyzed again:

```text
Repository
     ↓
New Analysis
     ↓
New Analysis Version
```

The system should not blindly overwrite all previous analysis metadata.

This allows future Git/version intelligence.

---

# 83. Analysis Version

Conceptually:

```text
Repository
 ├── Analysis v1
 ├── Analysis v2
 └── Analysis v3
```

V1 may expose only the latest analysis to users.

The underlying design should support versioning.

---

# 84. Future Git Intelligence

Git history is outside core V1.

However, repository models should not prevent:

```text
Commit
Branch
Pull Request
Diff
Change Impact
```

from being introduced later.

---

# 85. Architecture Detection

Architecture detection should combine:

```text
Directory Structure
+
Dependencies
+
Frameworks
+
Configuration
+
Relationships
+
AI Reasoning
```

Example:

```text
controllers/
services/
repositories/
entities/
```

may support a layered-architecture inference.

The system should provide evidence.

---

# 86. Architecture Confidence

Architecture results should internally maintain confidence.

Example:

```text
Layered Architecture
Confidence: High

Evidence:
Controller layer
Service layer
Repository layer
Entity layer
```

The UI should distinguish evidence from AI inference.

---

# 87. Dependency Graph Query Flow

```text
User opens graph
       ↓
Graph API
       ↓
Graph Module
       ↓
Relationship Store
       ↓
Filter
       ↓
Return nodes + edges
       ↓
React Graph
```

---

# 88. Graph Scaling

Never load an entire huge repository graph into the browser.

Instead:

```text
User selects node
      ↓
Load immediate relationships
      ↓
Expand
      ↓
Load next level
```

This creates a lazy graph exploration model.

---

# 89. Graph Levels

Supported conceptual levels:

```text
Repository
Folder
File
Class
Function
Feature
```

The user can move between levels.

---

# 90. Feature Flow

Feature flow generation:

```text
Feature Query
      ↓
Candidate Files
      ↓
Dependency Graph
      ↓
Relevant Paths
      ↓
AI Explanation
      ↓
Feature Flow
```

The visual flow should prioritize verified relationships.

---

# 91. AI-Generated Feature Explanation

AI can explain:

```text
Entry Point
 ↓
API
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database
```

But every node should ideally map to an actual repository entity.

---

# 92. Database + Vector Strategy

MongoDB is responsible for:

```text
Application Metadata
Repository Metadata
Code Entities
Relationships
Features
Review Results
```

Vector data:

```text
Code Chunk
Embedding
Repository ID
File ID
Symbol ID
Metadata
```

This allows vector search to remain repository-scoped.

---

# 93. Why Not a Separate Vector Database?

V1 intentionally avoids:

```text
MongoDB
+
Qdrant
+
Neo4j
+
PostgreSQL
```

because every additional database adds:

- Deployment complexity
- Connection management
- Backup requirements
- Development setup
- Failure scenarios
- Cost

We will introduce dedicated infrastructure only when actual requirements justify it.

---

# 94. Why MongoDB Instead of Relational DB?

The system has two categories of data.

### Structured SaaS data

```text
User
Project
Repository
Report
```

which fits relational databases.

### Dynamic code intelligence

```text
AST metadata
Symbols
Language-specific properties
Relationships
Feature metadata
```

which changes significantly across languages.

MongoDB gives us a flexible V1 storage model and reduces infrastructure.

If future scale demonstrates strong relational/transactional requirements, PostgreSQL can be introduced for specific domains without replacing the entire architecture.

---

# 95. Local Development Architecture

Docker Compose should provide:

```text
Frontend
Backend
Worker
MongoDB
Redis
```

Conceptually:

```text
docker-compose.yml

services:

  frontend
      ↓

  backend
      ↓

  worker
      ↓

  mongodb
      ↓

  redis
```

---

# 96. Why Docker?

Docker provides environment consistency.

Instead of:

```text
Install Python
Install Node
Install MongoDB
Install Redis
Configure everything
```

we can eventually use:

```text
docker compose up
```

This is especially useful because the system has multiple runtime components.

---

# 97. Development Environment

Local development:

```text
Developer
    ↓
Antigravity
    ↓
Docker Compose
    ↓
Application
```

Antigravity remains the primary development environment.

Docker is simply the infrastructure/runtime layer.

---

# 98. Deployment Architecture

V1:

```text
                    Vercel
                      │
                   React
                      │
                      ↓
                   Render
                      │
                    FastAPI
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       MongoDB      Redis       Worker
```

The exact deployment configuration will be defined separately.

---

# 99. Environment Configuration

Never hard-code:

- Database URLs
- JWT secrets
- AI API keys
- Redis URLs
- Storage credentials

Use environment variables.

Example:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
AI_PROVIDER
OPENROUTER_API_KEY
```

---

# 100. Testing Architecture

Testing should exist at multiple levels.

```text
Unit Tests
     ↓
Integration Tests
     ↓
API Tests
     ↓
Analysis Tests
     ↓
AI Retrieval Tests
     ↓
End-to-End Tests
```

---

# 101. Unit Testing

Test individual modules:

```text
Language Detector
Dependency Extractor
Feature Resolver
Graph Traversal
AI Context Builder
Impact Analyzer
Review Rules
```

---

# 102. Integration Testing

Test:

```text
FastAPI
+
MongoDB
+
Redis
+
Worker
```

Example:

```text
Upload Repository
 ↓
Create Job
 ↓
Worker
 ↓
Analyze
 ↓
Persist
 ↓
API retrieves result
```

---

# 103. Analysis Testing

Use small fixture repositories.

Example:

```text
test-repositories/
├── python-project/
├── java-project/
├── typescript-project/
└── mixed-project/
```

Expected results can be verified.

---

# 104. AI Testing

AI results cannot always be tested with exact string equality.

Instead evaluate:

- Relevant files
- Correct repository references
- Groundedness
- Hallucination
- Retrieval quality

---

# 105. Security Testing

Test:

- Authentication
- Authorization
- Project isolation
- Malicious ZIPs
- Path traversal
- Oversized files
- Secret handling
- Prompt injection through source code
- AI context isolation

---

# 106. Scalability Strategy

V1:

```text
Modular Monolith
+
Workers
```

As load increases:

```text
FastAPI
     ↓
Multiple Worker Instances
```

Later:

```text
Analysis Service
AI Service
Code Review Service
```

can be separated.

---

# 107. Future Service Extraction

Potential extraction candidates:

```text
Repository Analysis Service
AI Service
Code Review Service
Report Service
```

The first candidate for extraction would likely be the analysis engine because it is computationally expensive and independently scalable.

---

# 108. Future Graph Database

If MongoDB relationship queries become insufficient:

```text
Current

MongoDB
   ↓
Relationship Layer


Future

MongoDB
   +
Neo4j
   ↓
Graph Layer
```

The application should interact through the Graph module abstraction.

---

# 109. Future Vector Database

If MongoDB Vector Search becomes insufficient:

```text
Current:

MongoDB Vector Search


Future:

VectorStore Interface
       │
       ├── MongoDB
       ├── Qdrant
       └── Other Provider
```

The AI module should not directly depend on MongoDB vector implementation.

---

# 110. Future Authentication

V1:

```text
Email + Password
```

Future:

```text
Google OAuth
GitHub OAuth
```

Authentication should use an abstraction that does not tightly couple business logic to the current login method.

---

# 111. Future Collaboration

Architecture should eventually support:

```text
Organization
Workspace
Team
Member
Role
Permission
```

without changing the repository intelligence engine.

---

# 112. Future Conversation Memory

V1:

```text
Repository-aware conversation
```

Future:

```text
Conversation Memory
     ↓
Short-term Memory
     +
Long-term Project Memory
```

This should be added within the AI module rather than contaminating repository analysis.

---

# 113. Future IDE Integration

The platform may eventually expose:

```text
VS Code Extension
JetBrains Plugin
CLI
```

The REST API and AI services should therefore remain independently consumable.

---

# 114. Future GitHub Integration

Future:

```text
GitHub OAuth
      ↓
Private Repository
      ↓
Branch Analysis
      ↓
Commit Analysis
      ↓
PR Analysis
```

This should build upon the existing Repository abstraction.

---

# 115. End-to-End Repository Analysis

The complete V1 flow:

```text
                USER
                  │
                  ↓
             React UI
                  │
                  ↓
              FastAPI
                  │
                  ↓
         Create Repository
                  │
                  ↓
          Create Analysis Job
                  │
                  ↓
             Redis Queue
                  │
                  ↓
              Worker
                  │
                  ↓
        Repository Preparation
                  │
                  ↓
          File Discovery
                  │
                  ↓
        Language Detection
                  │
                  ↓
       Framework Detection
                  │
                  ↓
        Language Analyzers
                  │
                  ↓
             AST / AST
                  │
                  ↓
        Symbol Extraction
                  │
                  ↓
       Dependency Extraction
                  │
                  ↓
      Relationship Construction
                  │
                  ↓
       Architecture Analysis
                  │
                  ↓
        Semantic Chunking
                  │
                  ↓
          Embedding Creation
                  │
                  ↓
              MongoDB
                  │
                  ↓
       Analysis Complete Event
                  │
                  ↓
             WebSocket
                  │
                  ↓
              React UI
```

---

# 116. Repository AI Query Flow

```text
User
 │
 │ "How does payment work?"
 ↓
React
 │
 ↓
FastAPI
 │
 ↓
Query Understanding
 │
 ├──────────────┐
 ↓              ↓
Vector Search   Graph Search
 ↓              ↓
Relevant Code   Relationships
 └───────┬──────┘
         ↓
  Context Construction
         ↓
   Repository Context
         ↓
     LLM Provider
         ↓
       Response
         ↓
       React
```

---

# 117. Impact Analysis Flow

```text
Selected Function
       ↓
Symbol Lookup
       ↓
Graph Traversal
       ↓
Callers
       ↓
Dependencies
       ↓
Tests
       ↓
Features
       ↓
APIs
       ↓
Potential Impact
       ↓
AI Explanation
```

---

# 118. Code Review Flow

```text
Review Request
       ↓
Determine Scope
       ↓
Retrieve Code
       ↓
Static Rules
       +
AST Analysis
       +
Dependency Analysis
       +
AI
       ↓
Issue Aggregation
       ↓
Deduplication
       ↓
Severity
       ↓
Fix Suggestion
       ↓
Patch Generation
       ↓
Review Result
```

---

# 119. Report Flow

```text
Code Review
    ↓
Review Results
    ↓
Report Builder
    ↓
Markdown
    ├── PDF
    └── DOCX
    ↓
Storage
    ↓
Download
```

---

# 120. Critical Architectural Decision

The most important architectural principle is:

> **The repository understanding engine is the foundation; AI is an intelligence layer built on top of it.**

Therefore:

```text
                Repository
                    ↓
             Static Analysis
                    ↓
              Code Model
                    ↓
             Relationships
                    ↓
             Semantic Index
                    ↓
               AI Context
                    ↓
                   LLM
```

Not:

```text
Repository
    ↓
LLM
    ↓
Hope it understands everything
```

---

# 121. Source of Truth Hierarchy

When information conflicts, use this priority:

```text
1. Repository source code
        ↓
2. Static analysis
        ↓
3. Dependency relationships
        ↓
4. Semantic retrieval
        ↓
5. AI inference
```

AI should not override deterministic repository evidence without explicitly identifying the inference.

---

# 122. V1 Infrastructure

The minimum infrastructure is:

```text
React
FastAPI
MongoDB
Redis
Python Worker
```

Plus:

```text
AI Provider
```

No requirement for:

```text
Neo4j
Kafka
Kubernetes
Elasticsearch
Qdrant
PostgreSQL
Microservices
```

in V1.

---

# 123. V1 Architectural Boundaries

### Frontend

Responsible for:

```text
Presentation
Interaction
UI state
Visualization
```

### FastAPI

Responsible for:

```text
Business logic
API
Authentication
Orchestration
AI coordination
```

### Worker

Responsible for:

```text
Heavy computation
Repository analysis
Embeddings
Reports
```

### MongoDB

Responsible for:

```text
Persistent application and repository intelligence data
```

### Redis

Responsible for:

```text
Temporary queue/cache/pub-sub state
```

### AI Provider

Responsible for:

```text
Language reasoning
Explanation
Feature interpretation
Review reasoning
```

---

# 124. What V1 Must Avoid

Do not introduce architectural complexity merely because a technology is popular.

Avoid prematurely adding:

```text
Microservices
Kubernetes
Kafka
Neo4j
Dedicated Vector DB
GraphQL
Event-driven distributed architecture
Multiple backend frameworks
Multiple databases
```

unless a concrete requirement demands them.

---

# 125. Evolution Strategy

The architecture should evolve in this order:

```text
Phase 1
Modular Monolith
+
Worker


Phase 2
Scale Workers


Phase 3
Optimize Analysis Engine


Phase 4
Introduce Dedicated Graph/Vector infrastructure if required


Phase 5
Extract expensive modules into services


Phase 6
Enterprise-scale architecture
```

---

# 126. Final Architecture

The approved V1 architecture is:

```text
                         ┌─────────────────┐
                         │     VERCEL      │
                         │                 │
                         │ React + Vite    │
                         │ TypeScript      │
                         │ TanStack Query  │
                         │ Zustand         │
                         │ Monaco          │
                         └────────┬────────┘
                                  │
                         REST + WebSocket
                                  │
                                  ↓
                         ┌─────────────────┐
                         │     RENDER      │
                         │                 │
                         │    FastAPI      │
                         │ Modular Monolith│
                         └────────┬────────┘
                                  │
              ┌───────────────────┼──────────────────┐
              │                   │                  │
              ↓                   ↓                  ↓
        ┌───────────┐       ┌───────────┐      ┌───────────┐
        │  MongoDB  │       │   Redis   │      │  Worker   │
        │           │       │           │      │           │
        │ Metadata  │       │ Job Queue │      │ Analysis  │
        │ Code      │       │ Cache     │      │ AST       │
        │ Graph     │       │ Pub/Sub   │      │ Graph     │
        │ Vectors   │       │           │      │ Embedding │
        └───────────┘       └───────────┘      └───────────┘
                                                     │
                                                     ↓
                                             ┌──────────────┐
                                             │   Analysis   │
                                             │    Engine    │
                                             ├──────────────┤
                                             │ File Parser  │
                                             │ Language     │
                                             │ Adapters     │
                                             │ Tree-sitter  │
                                             │ AST          │
                                             │ Symbols      │
                                             │ Dependencies │
                                             │ Features     │
                                             └──────────────┘
                                                     │
                                                     ↓
                                             Repository
                                             Intelligence
```

---

# 127. Architecture Approval Checklist

Before implementation begins, the following decisions are considered fixed:

- [x] Modular Monolith
- [x] React + TypeScript + Vite
- [x] FastAPI + Python
- [x] MongoDB
- [x] MongoDB Vector capabilities
- [x] Redis-compatible queue
- [x] Background workers
- [x] WebSockets
- [x] Tree-sitter / multi-language parser architecture
- [x] Static analysis + AI
- [x] Language-agnostic architecture
- [x] Public GitHub + ZIP in V1
- [x] No repository code execution
- [x] Provider abstraction for LLMs
- [x] OpenRouter initially
- [x] Email/password authentication
- [x] REST API
- [x] Monaco code viewer
- [x] Interactive dependency graph
- [x] Docker + Docker Compose
- [x] Vercel + Render deployment
- [x] Future-ready service boundaries
- [x] No premature microservices
- [x] No Neo4j in V1
- [x] No dedicated vector DB in V1
- [x] No GraphQL in V1

---

# 128. Next Engineering Documents

The next documents should be produced in this order:

```text
1. PRD
      ↓
2. System Design Architecture
      ↓
3. Database Design
      ↓
4. API Design
      ↓
5. AI Architecture
      ↓
6. UI/UX Information Architecture
      ↓
7. UI/UX Screens
      ↓
8. Testing Strategy
      ↓
9. Deployment Architecture
```

The next immediate document should therefore be:

> **Database Design Document**

It should define the actual MongoDB collections, document structures, indexes, relationships, repository entities, symbols, graph edges, code chunks, embeddings, analysis jobs, conversations, code reviews, patches, reports, and multi-user isolation.

Only after that should we design the REST APIs because the API contracts should be derived from the actual domain model rather than invented independently.