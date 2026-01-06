* Use english language for everything like comments, descriptions or readme/markdown files
* Use `docker compose up` to have a working environment
* Always fix issues reported by `docker compose exec web npm run type-check`
* Try to fix issues reported by `docker compose exec web npm run lint`
* Always provide and run Integration Tests to cover processes and workflows you are working on
* Always refactor code you are touching, to reduce complexity
* Always create/update a document handoff.md in the root project directory, which contains a (brief) summary of what we've most recently worked on.
  The goal is that if the context window gets too crowded, we can restart with a new task, 
  and the new agent can pick up where you left off using the handoff document (describing what we were most recently working on).
* Work doggedly. Your goal is to be autonomous as long as possible.
  If you know the user's overall goal, and there is still progress you can make towards that goal,
  continue working until you can no longer make progress.
* Work smart. When debugging, take a step back and think deeply about what might be going wrong.
  When something is not working as intended, add logging to check your assumptions.
* Use ETL (extraction, transformation/enrichment and load) for external connections like API
* Use MVC, Service Repository Pattern, Repository Pattern and Composables Pattern to keep everything encapsulated and to keep logic out of frontend views