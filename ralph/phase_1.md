## Phase 1 - Descriptions

### Requirements Definition
During the human + LLM conversation that produces specs:
* Discuss JTBD and break into topics of concern
* Use subagents to load external context as needed
* Discuss and define acceptance criteria - what observable, verifiable outcomes indicate success
* Keep criteria behavioral (outcomes), not implementation (how to build it)
* LLM writes specs including acceptance criteria however makes most sense for the spec
* Acceptance criteria become the foundation for deriving test requirements in planning phase

### Define Requirements (LLM conversation)
* Discuss project ideas → identify Jobs to Be Done (JTBD)
* Break individual JTBD into topic(s) of concern
* Use subagents to load info from URLs into context
* LLM understands JTBD topic of concern: subagent writes specs/FILENAME.md for each topic

### Use Claude's AskUserQuestionTool for Planning
During Phase 1 (Define Requirements), use Claude's built-in AskUserQuestionTool to systematically explore JTBD, topics of concern, edge cases, and acceptance criteria through structured interview before writing specs.

When to use: Minimal/vague initial requirements, need to clarify constraints, or multiple valid approaches exist.

Invoke: "Interview me using AskUserQuestion to understand [JTBD/topic/acceptance criteria/...]"

Claude will ask targeted questions to clarify requirements and ensure alignment before producing specs/*.md files.

Flow:
1. Start with known information →
2. Claude interviews via AskUserQuestion →
3. Iterate until clear →
4. Claude writes specs with acceptance criteria →