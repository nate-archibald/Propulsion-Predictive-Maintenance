# Foundation — Requirements & PRD

The starting point of every workshop: turn a chosen use case into a Product Requirements Document.

> Auto-generated from `02_seed_section_input_prompts.sql`. Each section below corresponds to one `section_tag` in the workshop builder's `section_input_prompts` table.

## Sections in this category

| Step (order) | Section | `section_tag` | Forks |
|---|---|---|---|
| 3 | [Product Requirements Document (PRD)](#product-requirements-document-prd) | `prd_generation` | — |

---

## Product Requirements Document (PRD)

| Field | Value |
|-------|-------|
| `input_id` | `1` |
| `section_tag` | `prd_generation` |
| `order_number` | `3` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `(default)` |

_Generate a simple PRD that defines what the application does and its key high-value features_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Generate a prompt that I can copy into my AI coding assistant (Cursor/Copilot) to create a simple Product Requirements Document (PRD).

The generated prompt MUST include these instructions at the very beginning:

```
## IMPORTANT - READ FIRST
Your ONLY task is to create a PRD document. Do NOT:
- Generate any code or scripts
- Create any implementation files
- Start building the application
- Define table structures, schemas, or database designs
- Create table names or data models
- Define API endpoints, routes, or API specifications
- Include implementation-specific logic or technical details
- Do anything other than creating the PRD

You MUST:
- Create ONLY the PRD document
- First resolve <ARTIFACT_ROOT> = the workshop project root. On Cursor/Copilot that is your repo root; on Databricks Genie Code it is your user project root /Workspace/Users/<email>/<repo> (the repo is cloned separately at /Workspace/Users/<email>/.assistant/skills/<repo> for skill loading only) — NOT the page's current working directory.
- Save it to: <ARTIFACT_ROOT>/docs/design_prd.md
- STOP after saving the PRD - do nothing else
```

After those instructions, the prompt should ask for a simple, focused PRD for a {industry_name} application focused on {use_case_title}.

## Use Case Context to Include
{use_case_description}

## Application Context to Include
- **Industry**: {industry_name}
- **Use Case**: {use_case_title}
- Use a neutral, professional product name and generic terminology
- Web first, but include mobile considerations if applicable

## PRD Focus Guidelines
**Keep it simple** - Focus on providing enough details to generate a clear, readable PRD without over-engineering.

**Important Constraints:**
- Do NOT include table definitions, table names, or database schema designs - these will come in later steps
- Do NOT include API definitions, endpoints, or implementation-specific logic
- Only focus on **High Value workflows**
- Document **Happy Path only** - skip edge cases and error handling details for now
- Prioritize clarity over completeness

## PRD Structure to Request
The generated prompt should ask for a PRD with these sections:

1. **Summary** - Product vision, problem statement, target personas (2-3 max), goals + non-goals
2. **Scope** - MVP scope only, clear out of scope items
3. **User Journeys** - High-value end-to-end flows (Happy Path only) for primary personas
4. **Functional Requirements** - Key requirements with simple acceptance criteria
5. **Non-Functional Requirements** - Basic performance, security, accessibility notes
6. **High-Level Data Entities** - Entity names and relationships only (NO table definitions or schemas)
7. **Release Plan** - Simple milestones from MVP to GA

The prompt MUST end with:
```
Save this PRD to: <ARTIFACT_ROOT>/docs/design_prd.md
STOP after saving. Do not generate any code, tables, APIs, or proceed with other tasks.
```
````

**System Prompt:**

```
You are generating a prompt that users will copy into their AI coding assistant.

Your output should be a complete, ready-to-use prompt that when pasted into Cursor or Copilot will:
1. Create ONLY a simple Product Requirements Document
2. Save it to `<ARTIFACT_ROOT>/docs/design_prd.md` (where `<ARTIFACT_ROOT>` is the workshop project root — resolve it first; on Databricks Genie Code that is your `/Workspace/Users/<email>/<repo>`, NOT the `.assistant/skills` clone; never assume the page's working directory)
3. NOT generate any code, scripts, table definitions, or API specifications

CRITICAL: Your generated prompt MUST start with clear instructions telling the AI to ONLY create the PRD document and save it to `<ARTIFACT_ROOT>/docs/design_prd.md`, and to NOT do anything else. Focus on High Value workflows with Happy Path only.

The prompt should be focused and specific to {use_case_title}, incorporating the use case context provided.

**OUTPUT FORMAT RULES:**
- Output the prompt directly as plain markdown text - do NOT wrap the entire output in code blocks or backticks
- Use proper markdown formatting: ## for headers, - for bullet points, **text** for bold
- For code blocks within your output (like file paths or specific instructions to include verbatim), use triple backticks on their own lines
- Do NOT use single backticks for multi-line content
- The output should render properly when displayed as markdown
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0). These prompts assume you are working in that codebase with a coding assistant enabled.

**Capture your artifact root first (client-aware).** This step writes a file *before* `bootstrap` runs, so invoke `vibecoding-state.resolve_root` to resolve `<ARTIFACT_ROOT>` — the workshop project root that relative artifact paths resolve against (it reads `artifact_root` from `## Environment Capabilities` if a state file already exists, otherwise detects the active client, `artifact_root` + `skills_install_root`; it is gate-free and writes no state file, but it ensures `<ARTIFACT_ROOT>` exists). Echo the rule to yourself: **artifacts land under `<ARTIFACT_ROOT>`** — your repo root on Cursor/Copilot, your user project root `/Workspace/Users/<email>/<repo>` on Databricks Genie Code (the repo is cloned separately at `/Workspace/Users/<email>/.assistant/skills/<repo>` for skill loading only) — **never the page's current working directory** (on Genie Code the CWD is page-type-dependent). Ensure `<ARTIFACT_ROOT>` exists, then write the PRD to `<ARTIFACT_ROOT>/docs/design_prd.md`.

---

## Steps to Apply

1. **Copy the generated prompt** using the copy button
2. **Paste it into your AI coding assistant**
3. **Let the AI generate the PRD** - it will create a `<ARTIFACT_ROOT>/docs/design_prd.md` file
4. **Review the generated PRD** carefully
   - Validate assumptions
   - Ensure all user personas are accurately represented
5. **DO NOT proceed to the next step** until you are satisfied with the PRD

**IMPORTANT:** This step ONLY generates the PRD document. No code or scripts should be created.

---

## After Generation

1. **Customize user personas** based on your actual target users
2. **Prioritize features** using MoSCoW method
3. **Refine acceptance criteria** - ensure all Given/When/Then scenarios are testable
4. **Get stakeholder sign-off** before proceeding to design

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected PRD Deliverables

### Document Sections
- **Summary** - Product vision, problem statement, personas, goals
- **Scope** - MVP vs V1/V2 with MoSCoW prioritization
- **User Journeys** - End-to-end flows with success/failure paths
- **Functional Requirements** - Numbered requirements with acceptance criteria
- **Non-Functional Requirements** - Performance, security, accessibility
- **Data & System Design** - Entity model, APIs, integrations
- **Risks & Dependencies** - What could go wrong
- **Release Plan** - Milestones from MVP to GA
- **Requirements Coverage Checklist** - Validation of completeness

### Quality Metrics
- Every requirement has acceptance criteria
- All user journeys have success AND failure paths
- Edge cases and error states are documented
- Analytics events are specified for key actions

</details>

---
