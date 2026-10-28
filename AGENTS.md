# Architecture rules
- Keep login session state in one root-mounted account provider with a single identity-transition subscription; this avoids competing listeners and stale account controls.
- Store personal profile fields in owner-scoped public.profiles; grades remain in the existing local store until a separate restoration/sync request.