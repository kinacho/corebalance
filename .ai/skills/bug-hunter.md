# Skill: Bug Hunter

## Purpose
Find the root cause of an application bug or crash.

## Inputs
- Bug description, stack trace, or failing test case.

## Workflow
1. Locate the file and lines referenced in the crash trace.
2. Read the local lines using `view_file` (with line ranges).
3. Draft a reproduction test case or verify the execution values.
4. Correct the logic error.

## Output Format
- Brief summary of the bug origin and the proposed fix code block.

## Token Pitfalls to Avoid
- Do not read unrelated files or scan the whole repository.
- Avoid printing full files in explanation logs.

## When Not to Use
- Do not use when planning new architecture or layout styling updates.
