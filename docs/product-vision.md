# Product vision

This document is the original product direction. It is not a list of features in the submitted TuyDui app.

The blueprint below was written before the current implementation. Where it mentions accounts, a shared database, billing, client approval, or a permanent audit history, treat those as planned work. The implemented scope is recorded in `MVP_BUILD_STATUS.md` at the repository root.

---

# STARTUP BLUEPRINT — VERSION 2 (LATEST LOCKED VERSION)

> **Document Type:** Master Product + MVP + AI Coding Blueprint  
> **Status:** LATEST LOCKED VERSION  
> **Purpose:** Use this file as the primary source of truth when Vibe Coding the whole system with an AI coding agent.  
> **Language:** Product/UI may support Thai first, but code, identifiers, schemas, and internal architecture should use clear English naming.  
> **Important:** Do not silently change the product direction. If an implementation decision conflicts with this blueprint, surface the conflict before changing the product logic.

---

# 1. What This Startup Is

This startup is a web application for people who receive project briefs from clients and must turn those briefs into real work.

The core users are:

- Project leaders.
- Freelancers.
- Small teams.
- Agencies.
- Small software houses.
- Design teams.
- Digital agencies.
- Other project-based service businesses.

The product uses AI to:

1. Read a client brief.
2. Extract the actual project requirements.
3. Turn those requirements into a clear visual project map.
4. Show which work area and which person is responsible.
5. Detect when the client changes the brief later.
6. Show exactly what changed.
7. Show which work areas are affected.
8. Show which team members are affected.
9. Help the project leader decide whether the change is included in the original scope or should be treated as additional work.
10. Keep a complete history of scope changes throughout the project.

Shortest product definition:

> **Brief in → Project Map out → Brief changes → the system knows what changed, what work is affected, and who needs to respond.**

---

# 2. Main Problem

Project-based teams often receive:

- PDF briefs.
- Scope documents.
- Requirements.
- Messages through LINE.
- Emails.
- Revised versions of documents.

The problems are:

- The brief is long and difficult to understand quickly.
- Team members interpret the same requirement differently.
- It is unclear who owns each part of the work.
- The client changes requirements during the project.
- The team forgets what was originally agreed.
- New requests get done for free without realizing they are outside the original scope.
- A small change in one part may affect multiple roles.
- When a new document version arrives, PMs manually compare old vs new.
- There is no clean history of how the project changed over time.

The product exists to solve this entire flow.

---

# 3. Core Value Proposition

The web application should help the user answer these questions:

### Before the project starts

- What exactly is in this brief?
- What must be built?
- What is unclear?
- What are the major project areas?
- Who is responsible for each part?

### During the project

- Did the client just ask for something new?
- Is this already inside the approved scope?
- What requirement changed?
- Which part of the project is affected?
- Which team member must revisit their work?
- Should this be included for free or treated as additional work?

### Later

- What was the original scope?
- What was added later?
- What did the client approve?
- Which changes were included for free?
- Which changes had additional cost?
- How did the project evolve from the initial brief to the final scope?

---

# 4. Product Positioning

This product is NOT:

- A generic AI PDF summarizer.
- A normal mind-map generator.
- A generic chatbot.
- A Miro clone.
- A ClickUp clone.
- A Jira clone.
- A full ERP.
- A full CRM.
- A billing/accounting platform.
- An employee monitoring system.
- A client chat platform.
- A full construction-management suite.
- A general-purpose project-management replacement.

This product IS:

> **An AI-powered document-to-project workspace with a Living Project Map and Scope Change Intelligence.**

The visual map is important, but the real differentiation is:

> **The map remains connected to source requirements, project responsibilities, and later client changes.**

---

# 5. Target Users

Primary target:

- Freelancers working on client projects.
- Freelancers with 2–10 person teams.
- Project leaders.
- Web-development agencies.
- Application-development agencies.
- Small software houses.
- Design agencies.
- Digital/marketing agencies.
- Consulting teams.
- Outsourced development teams.

Best early use case:

> A small team receives a client brief, divides the project into Design / Frontend / Backend / other work, then receives additional requests throughout the project.

The product can later expand to industries such as:

- Construction.
- Architecture.
- Interior design.
- Marketing campaigns.
- Media production.
- Consulting.
- Branding projects.
- Engineering projects.

However, the FIRST product should remain optimized for digital/service project workflows because they are easier to model and validate.

---

# 6. Locked Core Concepts

The product must preserve these concepts.

## 6.1 Source

The original information supplied by the client.

Examples:

- Brief PDF.
- Revised PDF.
- Client LINE message.
- Client email text.
- Future: document/meeting source.

---

## 6.2 Requirement

A structured unit extracted from a source.

Example:

> Users can log in using email and password.

Every requirement must stay linked to its source evidence.

---

## 6.3 Project Node

A visual work item or area in the Living Project Map.

Examples:

- Authentication.
- Login UI.
- Database.
- Payment.
- Landing Page.

A node may be connected to one or multiple requirements.

---

## 6.4 Role / Person

The work owner.

Examples:

- Backend.
- Frontend.
- Designer.
- Zen.
- Pee.
- Arm.

---

## 6.5 Baseline

The confirmed original project scope.

The baseline is immutable.

---

## 6.6 Current Approved Scope

The current scope of the project after all accepted changes.

Conceptually:

```text
Current Approved Scope
=
Baseline
+ Included Changes
+ Approved Changes
```

---

## 6.7 Scope Change

A later client request or document revision that may:

- Clarify existing work.
- Modify existing work.
- Add new work.
- Remove work.
- Remain ambiguous.

---

## 6.8 Living Project Map

The visual representation of the current project structure.

It is NOT a one-time static mind map.

It changes as the approved project scope changes.

---

# 7. Core Product Rule

The central relationship is:

```text
Source
↓
Requirement
↓
Project Node
↓
Role
↓
Person
↓
Change Impact
```

This relationship is the technical and product core.

Example:

```text
PDF page 7
↓
REQ-012: Email Login
↓
Authentication
↓
Backend
↓
Zen
```

If REQ-012 changes later, the system can determine that Authentication and Zen may be affected.

---

# 8. AI Philosophy

AI is a worker, not the source of truth.

AI may:

- Read documents.
- Extract requirements.
- Categorize requirements.
- Identify unclear requirements.
- Suggest project nodes.
- Suggest affected roles.
- Suggest affected team members.
- Compare semantic meaning.
- Draft client-facing explanations.

AI must NOT automatically:

- Confirm project scope.
- Decide that a client must pay.
- Calculate price.
- Calculate work hours.
- Set deadlines.
- Approve changes.
- Modify the baseline.
- Send client requests.
- Delete requirements from approved scope.

The PM is always the final authority.

Core rule:

> **AI proposes → PM confirms → system records.**

---

# 9. Latest AI Provider Decision

Initial MVP AI provider:

> **MaxPlusAI — Native Pool**

Preferred primary model:

> **Claude Opus 5**

Reason for this choice:

- The user currently has access to MaxPlusAI.
- The MVP has no external funding.
- The system should minimize initial AI costs.
- The AI layer must be replaceable later.

The system must NOT tightly couple the product to one provider.

Use an AI provider abstraction.

Example:

```ts
interface AIProvider {
  extractRequirements(...)
  classifyClientChange(...)
  analyzeImpact(...)
  compareRequirements(...)
  draftClientExplanation(...)
}
```

All AI calls must happen server-side.

Never expose the MaxPlusAI API key in the browser.

---

# 10. AI Provider Adapter Requirement

The project should be designed so that later the AI provider can be changed to:

- Official Anthropic.
- OpenAI.
- Gemini.
- Another provider.

without rewriting the product.

Example architecture:

```text
Application Logic
      ↓
AI Service Layer
      ↓
Provider Adapter
      ↓
MaxPlusAI Native / future provider
```

Do not allow provider-specific code to leak throughout the app.

---

# 11. AI Cost Tracking — REQUIRED

Because the business charges a low monthly subscription, AI costs must be measurable from the first usable version.

For every AI call, store if available:

- User ID.
- Project ID.
- AI task type.
- Provider.
- Model.
- Input tokens.
- Output tokens.
- Provider reported cost.
- Timestamp.
- Success/failure.

Example:

```text
user_123
project_NN
task = extract_requirements
model = claude-opus-5
input_tokens = ...
output_tokens = ...
cost = ...
```

Create a monthly per-user AI usage summary.

The product owner must be able to answer:

> “This customer paid 199 THB this month. How much AI cost did this customer create?”

---

# 12. Current Business Model

The initial business model is:

> **Monthly SaaS subscription + AI usage allowance**

Primary entry price hypothesis:

> **199 THB / month**

This price is NOT permanently locked as the perfect market price.

It is the initial price to test willingness to pay.

---

# 13. Why Subscription

The product is used throughout the life of a project:

```text
Project begins
↓
Brief upload
↓
Project Map
↓
Client request
↓
Change detection
↓
Another client request
↓
New document
↓
Change approval
↓
Project history
↓
Project ends
↓
New project begins
```

This recurring use pattern fits subscription better than only charging once per document.

---

# 14. Subscription Rules

Do not offer unlimited AI.

The 199 THB plan should include a practical monthly allowance.

The exact quota should remain configurable.

Possible user-facing quota dimensions:

- Number of active projects.
- Number of brief analyses.
- Number of revised-document analyses.
- Number of client-message analyses.
- Number of AI actions.

Do NOT expose token counts to normal users unless needed.

Users understand:

> “10 document analyses”

better than:

> “800,000 tokens.”

---

# 15. Suggested Initial Plan Structure

Initial hypothesis:

## Trial

- Free.
- Limited duration or limited credits.
- 1 project.
- Small AI allowance.
- Designed to prove the product value.

## Starter

> **199 THB / month**

Suitable for:

- Individual freelancer.
- Small project leader.

Includes:

- Core product features.
- Limited active projects.
- Monthly AI allowance.
- Living Project Map.
- Scope Change checking.
- Change Review Pages.
- Change history.

Future plans can be introduced later:

- Team.
- Agency.

Do not build complicated billing tiers before product-market validation.

---

# 16. AI Cost Safety Targets

For the 199 THB plan, the business should aim for:

- AI cost ≤ 20 THB/user/month = healthy.
- AI cost 20–40 THB/user/month = acceptable but monitor.
- AI cost 40–60 THB/user/month = investigate usage/routing/quota.
- AI cost > 60 THB/user/month = pricing or usage model likely needs adjustment.

These are internal business guardrails, not promises to users.

---

# 17. Monetization Guardrails

Do NOT:

- Take a percentage of the freelancer's client revenue.
- Take a percentage of client change-request value.
- Charge per team member during early MVP.
- Promise unlimited AI.
- Build an expensive payment infrastructure before validation.

Future optional model:

> Users who exceed AI allowance can purchase additional AI usage packs.

But this is secondary.

---

# 18. MVP Payment Scope

For the first coded MVP:

Billing may remain simplified.

It is acceptable to:

- Build subscription status fields.
- Build plan/usage logic.
- Build quota enforcement.

Actual automated online payment gateway integration is NOT required for the earliest MVP unless explicitly requested later.

The product can initially activate subscriptions manually during validation.

Do not let billing delay the core product.

---

# 19. FULL LOCKED WORKFLOW

---

## STEP 1 — User Authentication

User can:

- Continue with Google.
- Or sign up/login with Email + Password.

Primary account represents:

> PM / project leader / freelancer / agency owner.

---

# 20. STEP 2 — Projects Dashboard

After login, user sees:

- Existing projects.
- Project status.
- Recent changes.
- New Project button.
- AI usage summary if useful.
- Subscription status if applicable.

Primary action:

> **Create Project**

---

# 21. STEP 3 — Create Project

Required fields:

- Project name.
- Client name.
- Project description.
- Initial deadline.
- Team information.

Optional:

- Project notes.

Example:

```text
Project: NN Website
Client: NN Company
Deadline: 20 Oct
```

---

# 22. STEP 4 — Add Team Members

The PM can define project members.

Example:

- Zen — Backend / Leader.
- Pee — Frontend.
- Arm — Design.

For MVP:

> Team members do NOT need their own accounts.

They are project records used for assignment.

Future real multi-user collaboration is deferred.

---

# 23. STEP 5 — Upload Brief V1

PM uploads first project brief.

Example:

```text
NN_Brief_V1.pdf
```

System stores:

- Original file.
- Project.
- Document version.
- Upload time.
- Processing status.

---

# 24. STEP 6 — AI Reads Brief

Claude Opus 5 through MaxPlusAI Native is asked to extract structured project information.

AI should extract:

- Requirements.
- Scope.
- Features.
- Deliverables.
- Deadlines.
- Constraints.
- Important notes.
- Relevant categories.
- Source references.

---

# 25. Structured Requirement Schema

Conceptual example:

```json
{
  "id": "REQ-012",
  "title": "Email Login",
  "description": "Users must be able to authenticate using email and password.",
  "category": "Authentication",
  "source": {
    "documentId": "DOC-001",
    "page": 7,
    "quote": "Users must be able to sign in using email and password."
  },
  "clarity": "clear",
  "suggestedRoles": ["Frontend", "Backend"]
}
```

Always validate AI output server-side.

Recommended:

- JSON Schema.
- Zod.
- Equivalent strict runtime validation.

Malformed AI output must NOT be stored as approved data.

---

# 26. STEP 7 — AI Requirement Quality Check

AI may classify requirement clarity as:

- Clear.
- Ambiguous.
- Missing detail.
- Conflict.
- Needs clarification.

Example:

Brief:

> “The system should load fast.”

System:

> **Needs clarification:** No measurable loading-time requirement is specified.

Do not make speculative predictions such as:

> “This requirement will probably change later.”

Only highlight observable ambiguity or missing information.

---

# 27. STEP 8 — Generate Living Project Map

AI-assisted project structure is generated from requirements.

Example:

```text
NN Website
│
├── Design
│   ├── Landing Page — Arm
│   ├── Login UI — Arm
│   └── Mobile Layout — Arm
│
├── Frontend
│   ├── Landing Page — Pee
│   ├── Login UI — Pee
│   └── Responsive — Pee
│
└── Backend
    ├── Authentication — Zen
    ├── Database — Zen
    └── Payment — Zen
```

The map should make the project understandable at a glance.

---

# 28. Project Map Node Requirements

Each Project Node should support:

- ID.
- Title.
- Category.
- Parent node.
- Connected requirements.
- Assigned role.
- Assigned team member.
- Status.
- Change status.
- Source links.

Potential statuses:

- Planned.
- In progress.
- Done.

Detailed task management is secondary.

Do not turn the product into ClickUp.

---

# 29. STEP 9 — PM Reviews AI Output

PM reviews:

- Requirements.
- Requirement descriptions.
- Categories.
- Source references.
- Map nodes.
- Roles.
- Assignees.
- Clarification flags.

PM can:

- Edit.
- Add.
- Delete before baseline.
- Reassign.
- Reorganize the map.

---

# 30. STEP 10 — Confirm Baseline

PM presses:

> **Confirm Baseline**

The system creates:

> **Baseline V1**

This baseline is an immutable snapshot.

Store enough information to reproduce exactly what the project scope looked like when confirmed.

---

# 31. Baseline Rule

Never mutate Baseline V1.

If scope changes later:

- Record new change.
- Update Current Approved Scope.
- Keep Baseline untouched.

---

# 32. STEP 11 — Current Approved Scope Is Created

Initially:

```text
Current Approved Scope = Baseline V1
```

This becomes the primary reference for future scope checks.

---

# 33. STEP 12 — Client Sends New LINE / Email Request

Example:

> “Please add Google Login and Remember Me.”

The PM copies the message.

Inside the project there is a feature such as:

> **ตรวจข้อความลูกค้า**

or English internal label:

> Client Message Checker

---

# 34. STEP 13 — Paste Client Message

PM pastes raw client text.

The system stores:

- Raw message.
- Source type: LINE / Email / Other.
- Timestamp entered.
- Project.

The system sends relevant current-scope context to AI.

---

# 35. STEP 14 — AI Classifies Change

AI compares the message against:

> **Current Approved Scope**

Possible classifications:

## In Scope

Already included.

## Modified

Existing requirement but details changed.

## New Scope

New work not currently included.

## Ambiguous

Not enough certainty.

---

# 36. Change Analysis Output

For each detected request, AI should return:

- Client request summary.
- Classification.
- Matching existing requirement.
- Explanation.
- Evidence from Current Scope.
- Suggested affected nodes.
- Suggested affected roles.
- Suggested affected team members.
- Confidence hint.

Confidence is only a hint.

It must never replace PM confirmation.

---

# 37. STEP 15 — Change Impact Highlight

The Living Project Map visually shows likely impact.

Example before:

```text
Authentication
├── Email Login — Zen
└── Login UI — Pee
```

Client requests Google Login.

Proposed impact:

```text
Authentication ⚠
├── Email Login — Zen
├── Login UI — Pee ⚠
└── Google Login — NEW — Zen
```

Use clear change states such as:

- New.
- Modified.
- Removed.
- Impacted.
- Unchanged.

---

# 38. STEP 16 — PM Confirms Analysis

PM must explicitly confirm or edit AI output.

PM may:

- Accept New Scope.
- Change New Scope → In Scope.
- Change In Scope → Modified.
- Fix affected nodes.
- Fix affected people.
- Mark as unresolved.

No AI change becomes approved scope without PM confirmation.

---

# 39. STEP 17A — If Already In Scope

PM chooses:

> Already in Scope

System:

- Records the decision.
- Adds a history event.
- Does not create a charge.
- Does not create unnecessary Change Review.

---

# 40. STEP 17B — If Change Is Included for Free

If it is genuinely new but PM decides to include it:

System asks:

> **ต้องการคิดค่าใช้จ่ายเพิ่มหรือไม่?**

PM selects:

> **ไม่คิดเพิ่ม / รวมในงานเดิม**

System records:

- Change is real.
- No additional charge.
- PM accepted it.
- Added to Current Approved Scope.

Status:

> Included / No additional charge

This must remain visible in project history.

---

# 41. STEP 17C — If PM Wants to Charge Extra

PM selects:

> **คิดค่าใช้จ่ายเพิ่ม**

The system asks PM to manually enter:

- Additional price.
- Additional time.
- New deadline if applicable.
- Notes.

---

# 42. Price / Time Rule

AI must NOT calculate:

- Price.
- Development hours.
- Additional days.
- New deadline.

Reason:

Modern tools, libraries, AI coding, and individual team ability make generic time estimates unreliable.

Therefore:

> AI explains the change. PM decides the business impact.

---

# 43. STEP 18 — AI Drafts Explanation

After PM provides commercial/time information, AI can draft a clear explanation.

Example:

> Google Login was not included in the previously approved authentication scope, which only specified email/password login. This change affects authentication logic and the login interface.

PM can edit the draft.

---

# 44. STEP 19 — Change Review Page

PM presses:

> **Create Change Review Page**

System creates a shareable page.

Example:

```text
/project/NN/change/CR-003
```

Use secure, unguessable public tokens for client access.

Do not expose internal numeric IDs alone.

---

# 45. Change Review Page Content

Client sees:

## Requested Change

What they requested.

## Existing Scope

What was previously included.

## Why It Is Additional / Changed Work

PM-reviewed explanation.

## Affected Areas

Examples:

- Authentication.
- Login UI.

## Price

Entered manually by PM.

## Extra Time

Entered manually by PM.

## New Deadline

Entered manually by PM.

## Notes

PM-reviewed.

---

# 46. Client Actions

Client can:

### Approve

or

### Not Approve / Request Changes

Client does NOT need a full account.

---

# 47. STEP 20A — Client Approves

System stores:

- Change ID.
- Change review revision.
- Exact content shown.
- Price shown.
- Extra time shown.
- Deadline shown.
- Client identifier if available.
- Decision.
- Timestamp.
- Source references.
- Approved snapshot.

The change becomes:

> Approved Change

Then:

```text
Current Approved Scope
=
Previous Current Approved Scope
+ Approved Change
```

---

# 48. STEP 20B — Client Does Not Approve

Client may provide reason.

Example:

> “Please discuss the price first.”

System stores:

- Needs Discussion.
- Client note.
- Timestamp.

PM/client continue the conversation in LINE or Email.

Do NOT build an internal chat system.

If the terms change:

- Create a new Change Review revision.
- Preserve previous revision.
- Send new version.

---

# 49. STEP 21 — Project History

Dashboard shows a timeline.

Example:

```text
Baseline V1
Initial approved scope

CR-001 — Included
Footer revision
No additional charge

CR-002 — Approved
Google Login
+3,000 THB
+1 day

CR-003 — Needs Discussion
Admin Dashboard

Brief V2 uploaded

CR-004 — Approved
PromptPay
+4,000 THB
```

History must be append-oriented.

Do not silently rewrite past events.

---

# 50. STEP 22 — Client Sends PDF V2

PM uploads:

```text
NN_Brief_V2.pdf
```

The system performs the same structured extraction pipeline.

---

# 51. Critical V2 Comparison Rule

Do NOT compare only:

```text
PDF V1 ↔ PDF V2
```

Compare:

```text
Current Approved Scope ↔ Extracted Scope from PDF V2
```

Example:

Google Login:
- Not in V1.
- Added later via LINE.
- Approved.
- Now appears in V2.

The system must understand:

> This is already part of the approved scope.

Do not report it as new again.

---

# 52. Document Comparison Architecture

Required approach:

```text
PDF A
↓
Independent structured extraction
↓
Requirements A

PDF B
↓
Independent structured extraction
↓
Requirements B

Requirements A + B
↓
Deterministic candidate matching
↓
Clear matches handled by code
↓
Uncertain semantic pairs
↓
AI semantic comparison
↓
PM review
```

Do not simply send both PDFs to AI and ask:

> “What changed?”

That may be used as support, but not as the authoritative architecture.

---

# 53. Diff States

Requirement comparison states:

- Added.
- Removed.
- Modified.
- Unchanged.
- Ambiguous.

Store evidence for every proposed change.

---

# 54. Source Traceability

Example:

Before:

```text
Brief V1
Page 7
"Login with Email"
```

After:

```text
Brief V2
Page 9
"Login with Email and Google"
```

The PM should be able to open relevant source context from the change view.

Traceability is a core requirement.

---

# 55. Living Project Map Update

When a new approved scope change occurs:

- Add new nodes if necessary.
- Update modified nodes.
- Mark removed nodes carefully.
- Recalculate linked impacts.
- Preserve historical snapshots.
- Update current map state.

Do not update the map based solely on an unconfirmed AI suggestion.

---

# 56. End-of-Project View

At project end, the user should be able to inspect:

- Original Baseline.
- Current final scope.
- Document versions.
- All scope changes.
- Included/free changes.
- Approved paid changes.
- Rejected/discussion changes.
- Source references.
- Affected work areas.
- Affected team members.
- Complete project history.

The product should answer:

> “How did the final project differ from the project we originally agreed to?”

---

# 57. Minimum Screens

## 57.1 Authentication

- Register.
- Login.
- Google login.

## 57.2 Projects Dashboard

- Projects.
- Status.
- Recent changes.
- Create Project.

## 57.3 New Project

- Basic project info.
- Client info.
- Deadline.
- Team members.

## 57.4 Project Overview

- Project summary.
- Current scope.
- Current document.
- Recent activity.
- Important unresolved changes.

## 57.5 Brief Upload

- Upload PDF.
- Processing.
- Error.
- Complete.

## 57.6 Requirement Review

- Requirement list.
- Category.
- Source.
- Quality flag.
- Edit.
- Approve.

## 57.7 Living Project Map

- Visual structure.
- Nodes.
- Assignees.
- Linked requirements.
- Change highlight.

## 57.8 Client Message Checker

- Paste raw message.
- Analyze.
- Results.

## 57.9 Change Review Decision

- In Scope.
- Modified.
- New Scope.
- Ambiguous.
- Charge extra?
- Include for free?

## 57.10 Change Review Editor

- Explanation.
- Price.
- Extra time.
- Deadline.
- Notes.
- Preview.

## 57.11 Public Client Change Review

- Requested change.
- Existing scope.
- Explanation.
- Impact.
- Price/time/deadline.
- Approve.
- Request changes.

## 57.12 Project History

- Baseline.
- Brief versions.
- Change history.
- Approval history.

## 57.13 Account / Subscription

- Current plan.
- AI usage allowance.
- Monthly AI usage.
- Subscription status.

Do not expose raw provider cost to normal customers unless intentionally designed later.

---

# 58. Suggested Data Model

Exact database schema may evolve.

---

## User

```text
id
name
email
auth_provider
plan_id
subscription_status
created_at
updated_at
```

---

## Plan

```text
id
name
monthly_price_thb
active_project_limit
document_analysis_limit
message_analysis_limit
other_ai_action_limit
is_active
```

---

## UserUsagePeriod

```text
id
user_id
period_start
period_end
document_analyses
message_analyses
revision_analyses
ai_calls
ai_input_tokens
ai_output_tokens
ai_provider_cost
```

---

## Project

```text
id
owner_user_id
name
client_name
description
initial_deadline
status
created_at
updated_at
```

---

## TeamMember

```text
id
project_id
name
role
notes
created_at
```

No account required for MVP.

---

## DocumentVersion

```text
id
project_id
version_number
version_label
file_path
file_hash
uploaded_at
processing_status
```

---

## Requirement

```text
id
project_id
source_document_id
requirement_key
title
description
category
source_page
source_quote
clarity_status
created_at
updated_at
```

---

## ProjectNode

```text
id
project_id
parent_node_id
title
category
assigned_team_member_id
status
position_data
created_at
updated_at
```

---

## RequirementNodeLink

```text
requirement_id
project_node_id
```

---

## Baseline

```text
id
project_id
version_label
snapshot_json
confirmed_by_user_id
confirmed_at
```

Baseline snapshot must be immutable.

---

## ClientMessageSource

```text
id
project_id
source_type
raw_text
created_by_user_id
created_at
```

---

## ScopeChange

```text
id
project_id
source_type
source_id
change_key
classification
status
pm_confirmed
billing_decision
created_at
updated_at
```

---

## ScopeChangeItem

```text
id
scope_change_id
change_type
existing_requirement_id
proposed_requirement_json
explanation
confidence
created_at
```

---

## ScopeChangeImpact

```text
id
scope_change_item_id
project_node_id
team_member_id
impact_type
pm_confirmed
```

---

## ChangeReview

```text
id
scope_change_id
revision
public_token
status
price_thb
extra_time_text
new_deadline
client_facing_explanation
pm_note
published_at
```

---

## ApprovalEvent

```text
id
change_review_id
decision
client_identifier
client_note
approved_snapshot_json
created_at
```

---

## AuditEvent

```text
id
project_id
event_type
actor_type
actor_id
payload_json
created_at
```

Append-only where possible.

---

## AIUsageEvent

```text
id
user_id
project_id
provider
model
task_type
input_tokens
output_tokens
provider_cost
request_id
success
error_code
created_at
```

This is REQUIRED for business-cost measurement.

---

# 59. AI Task Types

Recommended explicit task identifiers:

```text
extract_requirements
classify_client_message
analyze_change_impact
compare_requirement_pair
draft_change_explanation
suggest_project_structure
```

Track cost separately by task.

This will reveal which feature is expensive.

---

# 60. AI Prompt Architecture

Do not use one giant prompt for the entire product.

Use task-specific prompts.

Each should have:

- System instruction.
- Input schema.
- Output schema.
- Relevant context only.
- Explicit no-invention rule.
- Source citation requirement where applicable.

Avoid repeatedly sending the entire project when unnecessary.

This reduces:

- Cost.
- Latency.
- Context confusion.

---

# 61. AI Extraction Rules

When extracting requirements:

AI should:

- Prefer explicit statements.
- Preserve meaning.
- Avoid inventing unstated features.
- Separate distinct requirements.
- Capture source evidence.
- Flag ambiguity.
- Return structured output.

If uncertain:

> Mark uncertain.

Do not hallucinate certainty.

---

# 62. AI Change Classification Rules

When checking client requests, AI should compare against the Current Approved Scope.

Classification definitions:

### IN_SCOPE

The requested behavior already exists in approved scope without meaningful change.

### MODIFIED

The request changes an existing approved requirement.

### NEW_SCOPE

The request introduces work not currently present.

### AMBIGUOUS

Insufficient information to classify safely.

The AI should explain why.

---

# 63. Deterministic Comparison Rules

Before semantic AI comparison:

Try:

1. Stable requirement-key matching.
2. Exact normalized text.
3. Known aliases.
4. Similarity candidate matching.
5. Category compatibility.

Only uncertain cases go to AI semantic comparison.

This saves cost and improves reliability.

---

# 64. AI Reliability Requirements

Mandatory:

- Strict schema validation.
- Retry strategy for malformed output.
- Clear timeout handling.
- Error states.
- PM confirmation.
- Source traceability.
- Test fixtures.
- Logging.
- Cost tracking.

Do not treat “Opus” as a reason to trust all output.

Provider Native Pool quality may differ from official provider behavior.

Benchmark the actual endpoint being used.

---

# 65. Model Benchmark

Create a controlled evaluation set.

Recommended:

- 10–20 synthetic briefs initially.
- At least several V2 revisions.
- Several client-message examples.

Ground truth should define:

- Expected requirements.
- Expected categories.
- Expected source pages.
- Expected Added/Removed/Modified.
- Expected scope classification.
- Expected affected roles.

Measure:

- Requirement recall.
- Requirement precision.
- Hallucination rate.
- Source accuracy.
- Change classification accuracy.
- Role-impact accuracy.

This benchmark should be reusable when changing AI providers.

---

# 66. Security Basics

Because project briefs may be confidential:

- API keys server-side only.
- Authenticated project access.
- Secure storage.
- Non-public PDF URLs where possible.
- Signed or protected file access.
- Unguessable public Change Review tokens.
- Never expose internal PM-only notes publicly.
- Store only necessary client identity information.
- Keep audit records.
- Validate uploads.
- Limit file size.
- Validate MIME/file type.
- Rate limit AI endpoints.
- Rate limit public approval endpoints.

Until provider privacy terms are fully verified:

> Use synthetic/non-confidential documents for demos and testing.

---

# 67. UX Direction

The product should feel:

- Professional.
- Simple.
- Clear.
- Calm.
- Trustworthy.
- Understandable to non-technical project leaders.

Avoid:

- Generic “AI startup” visuals.
- Too many gradients.
- Excessive animations.
- Too many dashboards.
- Dense enterprise UI.
- Unnecessary charts.
- Fake technical complexity.

Priority:

1. Understand project.
2. Verify source.
3. Understand change.
4. Understand impact.
5. Decide what to do.

---

# 68. Core UI Hierarchy

For each Project page, prioritize:

```text
Project Name
↓
Current Scope / Project Map
↓
Important Changes / Alerts
↓
Team Responsibility
↓
History
```

The Living Project Map should be a primary UI, not hidden in a secondary screen.

---

# 69. Public Client Page UX

The public Change Review page should be extremely simple.

The client should understand within seconds:

- What they requested.
- What was originally agreed.
- Why it changes the project.
- What the new commercial/time impact is.
- What button to press.

No project-management complexity.

---

# 70. Recommended Technical Stack

This is a recommended starting point, not a business requirement.

## Application

- Next.js.
- TypeScript.
- App Router.

## UI

- Tailwind CSS.
- Accessible component primitives.
- React Flow or equivalent for visual map.

## Database

- PostgreSQL.

## Backend/Auth

- Supabase is acceptable for MVP.
- Auth with Google + email/password.

## Storage

- Supabase Storage or another low-cost S3-compatible option.

Keep storage adapter replaceable if possible.

## Validation

- Zod or equivalent.

## PDF

- PDF.js for preview/rendering where appropriate.

## AI

- MaxPlusAI Native Pool.
- Claude Opus 5 preferred.
- Server-side provider adapter.

Do not over-engineer infrastructure before validation.

---

# 71. Free / Low-Cost MVP Strategy

The founder currently has no startup funding.

The MVP should therefore:

- Use free tiers when practical.
- Avoid unnecessary paid services.
- Avoid building unused infrastructure.
- Avoid multi-model AI routing initially.
- Use one primary AI model.
- Measure cost carefully.
- Avoid realtime collaboration infrastructure.
- Avoid expensive vector infrastructure unless proven necessary.

The goal is:

> **Spend almost nothing until users prove the product is worth paying for.**

---

# 72. MVP Features — LOCKED

Build these first:

1. Authentication.
2. Projects Dashboard.
3. Create Project.
4. Team Member records.
5. PDF upload.
6. AI Requirement Extraction.
7. Source references.
8. Requirement review/edit.
9. Requirement quality flags.
10. Living Project Map.
11. Role/person assignment.
12. Baseline confirmation.
13. Current Approved Scope.
14. Client Message Checker.
15. AI Scope Classification.
16. Change Impact Analysis.
17. Map Impact Highlight.
18. PM Confirmation.
19. Include Free / Charge Extra decision.
20. Manual price/time/deadline input.
21. AI client explanation draft.
22. Change Review Editor.
23. Public Change Review Page.
24. Approve / Request Changes.
25. Approval audit.
26. Change history.
27. PDF V2/V3 upload.
28. Structured document comparison.
29. Current Approved Scope comparison.
30. AI usage/cost tracking.
31. Basic subscription/quota state.

---

# 73. Explicit Non-Goals

Do NOT build unless specifically requested later:

- Full multi-user realtime collaboration.
- WebSocket presence.
- CRDT.
- Internal chat.
- Video call.
- Client progress percentage.
- Full task-management suite.
- Full Gantt engine.
- Employee activity monitoring.
- Automatic work estimation.
- Automatic price estimation.
- Automatic deadline calculation.
- Accounting.
- Payroll.
- Full invoicing system.
- Payment gateway during earliest MVP.
- CRM.
- Sales pipeline.
- GitHub sync.
- Figma sync.
- Jira integration.
- ClickUp integration.
- Notion integration.
- Slack integration.
- Full Miro-like canvas.
- Construction-specific blueprint interpretation.
- Enterprise SSO.
- Complex permissions system.

---

# 74. Product State Rules

Important state transitions.

## Baseline

```text
Draft Requirements
→ PM Review
→ Confirm Baseline
→ Immutable Baseline
```

## Client Change

```text
Raw Client Message
→ AI Analysis
→ PM Confirmation
→ In Scope / New / Modified / Ambiguous
```

## New Scope

```text
New Scope
→ Charge Extra?
   ├── No
   │   → Included
   │   → Current Approved Scope Updated
   │
   └── Yes
       → PM Adds Price/Time/Deadline
       → Change Review
       → Client Decision
```

## Client Decision

```text
Pending
├── Approved
│   → Current Approved Scope Updated
│
└── Needs Discussion
    → No scope update until PM resolves
```

---

# 75. Current Approved Scope Calculation

Do not store only one mutable blob if avoidable.

The system should be able to derive/reconstruct current approved scope from:

- Baseline.
- Included changes.
- Approved changes.
- Approved revision changes.

A cached current snapshot is acceptable for performance.

But the history must remain reconstructable.

---

# 76. Audit Philosophy

Important actions should create audit events.

Examples:

- Baseline confirmed.
- Requirement edited after AI extraction.
- Client message analyzed.
- PM changed AI classification.
- Change marked Included.
- Change Review published.
- Client approved.
- Client requested changes.
- New document uploaded.
- New document version confirmed.

Do not log every UI click.

Log meaningful project decisions.

---

# 77. File Versioning

Each uploaded document must be independent.

Example:

```text
DOC-001 → Brief V1
DOC-002 → Brief V2
DOC-003 → Brief V3
```

Never overwrite V1 file with V2.

---

# 78. Requirement Identity

Requirements need stable internal identity where possible.

Avoid relying only on raw wording.

Example:

```text
REQ-AUTH-EMAIL-001
```

However, generated IDs should not pretend semantic stability when uncertain.

Maintain explicit links between previous and modified requirements.

---

# 79. Change Review Revisioning

If PM changes commercial terms:

Do not overwrite what client previously saw.

Example:

```text
CR-003 Revision 1
Price: 3,000

CR-003 Revision 2
Price: 2,500
```

Approval references a specific revision.

---

# 80. Client Approval Integrity

At approval, store an immutable snapshot containing:

- Client-facing text.
- Price.
- Time impact.
- Deadline.
- Change items.
- Source references.
- Revision.

This allows later proof of exactly what was accepted.

Do not claim that this automatically constitutes a legally binding contract in every jurisdiction.

---

# 81. Error Handling

Important user-facing failure states:

### PDF Processing Failed

Allow retry.

### AI Output Invalid

Retry or allow manual entry.

### AI Provider Unavailable

Do not lose uploaded document/project state.

### Quota Exceeded

Explain clearly.

### Public Change Link Invalid

Show safe error.

### Approval Already Submitted

Show current status instead of creating duplicate approvals.

---

# 82. Rate Limits

Implement reasonable rate limits around:

- Document analysis.
- Client-message analysis.
- AI retries.
- Public approval actions.

This protects:

- AI costs.
- Abuse.
- Provider limits.

---

# 83. Product Metrics

Track from MVP:

- Number of registered users.
- Projects created.
- Briefs uploaded.
- Briefs successfully processed.
- Average requirements per document.
- Client messages analyzed.
- Scope changes detected.
- PM corrections to AI.
- Included changes.
- Charged changes.
- Client approvals.
- AI cost per user.
- AI cost per project.
- AI cost per task.
- Active subscription count.
- Monthly recurring revenue.
- Trial → paid conversion.
- Monthly retention.

---

# 84. Important AI Quality Metric

Especially track:

> **How often does the PM change the AI’s classification?**

If AI says New Scope but PM frequently changes to In Scope, the classification is not good enough.

Similarly track:

- AI suggested affected role changed by PM.
- AI suggested requirement edited by PM.
- Source reference corrected by PM.

These metrics are product-quality signals.

---

# 85. Startup Validation Goals

The MVP is trying to prove:

### Hypothesis 1

AI can extract project requirements accurately enough.

### Hypothesis 2

A Living Project Map helps users understand a brief faster.

### Hypothesis 3

Users care about knowing exactly what changed.

### Hypothesis 4

Users care about knowing which people/work areas are affected.

### Hypothesis 5

The system helps users identify scope creep they may otherwise miss.

### Hypothesis 6

Users will pay around 199 THB/month for this value.

---

# 86. MVP Success Scenario

The full demo should work like this:

1. User registers.
2. Creates Project NN.
3. Adds Zen, Pee, Arm.
4. Uploads Brief V1.
5. AI extracts requirements.
6. Each requirement has source evidence.
7. AI creates project structure.
8. Living Project Map appears.
9. PM assigns roles.
10. PM corrects AI if needed.
11. PM confirms Baseline V1.
12. Client sends LINE message:
   > “Add Google Login.”
13. PM pastes message.
14. AI identifies likely New Scope.
15. Existing Authentication branch is highlighted.
16. Zen/Pee are shown as affected.
17. PM confirms New Scope.
18. PM chooses Charge Extra.
19. PM enters 3,000 THB, +1 day, new deadline.
20. AI drafts client explanation.
21. PM edits and publishes.
22. Client opens public Change Review.
23. Client approves.
24. System stores immutable approval.
25. Google Login becomes part of Current Approved Scope.
26. Client later sends Brief V2 containing Google Login.
27. PM uploads V2.
28. System does NOT flag Google Login as new again.
29. System only highlights genuinely new/modified requirements.
30. Project History shows entire chain.

If this flow works reliably:

> The MVP successfully demonstrates the core startup.

---

# 87. AI Coding Development Order

Build in this order.

## Phase 1 — Foundation

1. Project setup.
2. Authentication.
3. Database.
4. Project CRUD.
5. Team members.
6. Secure storage.

## Phase 2 — Brief Intelligence

7. PDF upload.
8. AI provider adapter.
9. AI usage logging.
10. Requirement extraction.
11. Schema validation.
12. Source reference display.
13. Requirement review.

## Phase 3 — Living Project Map

14. Project node model.
15. Requirement-node linking.
16. Map rendering.
17. Assignment.
18. Editing.
19. Baseline snapshot.

## Phase 4 — Client Change Intelligence

20. Client Message Checker.
21. Current Approved Scope retrieval.
22. AI classification.
23. Impact mapping.
24. PM confirmation.
25. Included Change.

## Phase 5 — Change Review

26. Charge-extra decision.
27. Manual commercial fields.
28. AI explanation draft.
29. Public Change Review.
30. Client approve/request change.
31. Immutable approval snapshot.
32. Audit history.

## Phase 6 — Document Revisions

33. PDF V2.
34. Requirement candidate matching.
35. Deterministic diff.
36. Semantic AI diff for uncertain pairs.
37. PM review.
38. Living Map update.

## Phase 7 — Usage / Business

39. Plan records.
40. Monthly usage.
41. AI quota.
42. Subscription state.
43. Internal cost dashboard.

## Phase 8 — Polish

44. UX improvements.
45. Loading/error states.
46. Responsive design.
47. Landing page.
48. Analytics.

Do not begin with marketing visuals.

---

# 88. Coding Standards

AI Coding agent should:

- Use TypeScript strict mode.
- Avoid giant components.
- Separate domain logic from UI.
- Separate provider code from business logic.
- Use schema validation.
- Use database migrations.
- Use server-side authorization.
- Avoid duplicate sources of truth.
- Prefer readable code.
- Create reusable services for scope logic.
- Add tests around critical business rules.

---

# 89. Testing Priority

Highest priority tests:

### Baseline Immutability

Baseline cannot be modified after confirmation.

### Current Scope

Included/Approved changes correctly update current scope.

### Duplicate Detection

Previously approved LINE change appearing in V2 should not be detected as new again.

### Approval Snapshot

Client approval references exact revision.

### AI Failure

Malformed AI JSON cannot automatically mutate scope.

### Authorization

User cannot access another user's project.

### Public Link

Only intended public change data is exposed.

### Usage

Every AI call creates usage event.

---

# 90. Initial Design Constraint

Do not over-design.

Use clean layouts.

Suggested visual structure:

- Sidebar for projects/settings.
- Main project workspace.
- Tabs or clear navigation:
  - Overview.
  - Map.
  - Requirements.
  - Changes.
  - History.

Do not create 15 navigation sections.

---

# 91. Suggested Project Workspace

Potential structure:

```text
Project NN

[Overview] [Project Map] [Requirements] [Changes] [History]

Current Scope
Brief V2
3 Active Changes

---------------------------------

Living Project Map

---------------------------------

Recent Changes
```

Keep core information visible.

---

# 92. Important Product Copy

The product should use simple language.

Avoid:

> Semantic Requirement Reconciliation Engine

Prefer:

> ตรวจการเปลี่ยนแปลง

Avoid:

> Scope Mutation Artifact

Prefer:

> งานที่เพิ่ม

The initial user base may not be deeply technical.

---

# 93. Thai-First UX

The founder is initially considering Thai users.

The UI should be designed so Thai language works naturally.

Examples:

- สร้างโครงการ
- อัปโหลดบรีฟ
- ขอบเขตงานปัจจุบัน
- ตรวจข้อความลูกค้า
- งานใหม่
- แก้ไขงานเดิม
- อยู่ในขอบเขตเดิม
- ต้องตรวจสอบ
- คิดค่าใช้จ่ายเพิ่ม
- รวมในงานเดิม
- ส่งให้ลูกค้ายืนยัน
- ประวัติการเปลี่ยนแปลง

Code identifiers should remain English.

---

# 94. Future Expansion — NOT MVP

Possible future directions:

## More Source Types

- Word.
- Google Docs.
- Email integration.
- LINE integration.
- Meeting transcripts.
- Contracts.
- Proposals.

## Integrations

- Jira.
- ClickUp.
- Notion.
- Slack.
- GitHub.
- Figma.

## Team Accounts

- Invite members.
- Comments.
- Notifications.

## Construction

Potential future support for:

- Construction briefs.
- Scope documents.
- Architecture changes.
- Contractor responsibilities.

But this requires domain-specific work and should not distort the first MVP.

---

# 95. Business Risk

The business currently depends on low-cost AI access through MaxPlusAI Native.

Therefore:

- Track actual cost.
- Keep provider adapter.
- Do not promise unlimited AI.
- Avoid designing margins that only work with one provider forever.
- Benchmark alternative models/providers periodically.
- Maintain configurable quotas.

If provider pricing changes:

> The product should survive by changing model, quota, or plan price without rewriting the application.

---

# 96. Product Risk

The biggest product risk is NOT UI.

It is:

> AI accuracy.

If the system misses important requirements or falsely claims scope changes, users will stop trusting it.

Therefore prioritize:

1. Traceability.
2. PM review.
3. Structured extraction.
4. Deterministic comparisons.
5. Benchmarks.
6. Clear uncertainty.

---

# 97. What NOT to Optimize Yet

Do not spend major effort on:

- Perfect animations.
- Huge landing page.
- Complex branding.
- Advanced enterprise roles.
- Dozens of integrations.
- Automatic invoicing.
- Huge analytics suite.
- Fancy map interactions.

First make the core workflow reliable.

---

# 98. Definition of Done for MVP

MVP is considered functionally complete when:

- A user can create a project.
- Upload Brief V1.
- AI can extract structured requirements.
- Requirements have source references.
- User can correct them.
- User can create/see project map.
- User can assign people.
- User can confirm immutable baseline.
- User can paste a client change.
- AI compares against current scope.
- AI highlights affected work/people.
- User confirms.
- User can include for free or charge extra.
- User manually sets price/time/deadline.
- User creates client Change Review.
- Client can approve.
- Approval is recorded.
- Current scope updates.
- User uploads V2.
- Previously approved changes are not incorrectly flagged again.
- History remains correct.
- AI cost per user is recorded.

---

# 99. Final Product Statement

Full:

> **This startup is an AI-powered project workspace for freelancers, project leaders, agencies, and small service teams. It reads client briefs, converts them into a Living Project Map with requirements, work areas, roles, and responsible people, then monitors later client requests and document revisions to explain what changed, what work is affected, who is affected, and whether the change should be incorporated into the current scope. Project leaders remain in control of all final scope, pricing, timeline, and approval decisions.**

Short:

> **Turn client briefs into a living project plan, then know exactly what changes when the client changes the brief.**

Shortest:

> **Brief → Project Map → Change → Impact → Decision**

---

# 100. FINAL LOCKED RULES

The AI Coding agent must never forget these:

1. **The Brief is the source.**
2. **Requirements must be traceable.**
3. **The Project Map is living, not static.**
4. **Requirements connect to work and responsible people.**
5. **Changes are compared against Current Approved Scope.**
6. **Baseline is immutable.**
7. **AI proposes; PM confirms.**
8. **AI never calculates price/time/deadline.**
9. **Client approvals are versioned and preserved.**
10. **AI usage and cost are measured per user.**
11. **Initial business model is approximately 199 THB/month with AI quota.**
12. **Initial AI provider is MaxPlusAI Native with Claude Opus 5, behind a replaceable adapter.**
13. **Do not build a generic project-management platform.**
14. **Do not let non-core features delay the complete end-to-end workflow.**
15. **Core value = understand brief + visualize work + detect change + trace impact.**

---

# END OF MASTER BLUEPRINT

When using this document with an AI Coding agent, instruct it:

> Read the entire blueprint first. Treat the locked workflow and core rules as product requirements. Before implementing, inspect the current repository and map the existing codebase against this blueprint. Build the product incrementally in the development order defined above. Do not remove working functionality without reason, do not invent non-MVP features, and do not change the product logic silently.
