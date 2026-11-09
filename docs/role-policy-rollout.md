# Server-authoritative authorization

The frontend loads effective capabilities from `GET /api/v1/me/access`.
Role names are display data and never imply or override a capability. The client
validates the response structure, then matches the requested permission and scope
exactly. New server role and permission names do not require a client allowlist.

Every protected API request must authorize against current server state. UI checks
only determine which controls to display. They never authorize a mutation.
Sensitive role changes are submitted to the server; a server confirmation challenge
opens identity verification, after which the user explicitly resubmits the action.
Self-appointment restrictions, target MFA requirements, and protected roles belong
to the server. Form validation may validate required fields and scope format.

## Server contract

- Return `{ data: { roles: [{ role, scope }], capabilities: [{ permission, scope }] } }`.
  Identifiers must be nonempty strings; scope is a string, with `""` for global grants.
- Filter group lists on the server rather than relying on client role checks.
- Enforce group scope on membership approval, denial, and removal at request time.
- Provide a per-target `canRemove` boolean on group roster records. Default absence
  is denied in the frontend for every actor until this contract is implemented.
  Reauthorize every removal at write time; never trust a client-provided flag.
- Keep Super Admin membership removal distinct from leadership revocation; audit
  actions and preserve last-administrator/last-leader safeguards.
- Re-evaluate authorization for existing sessions after role changes.
- Review and migrate existing assignments without deleting memberships or content.

Changes to which roles receive capabilities must be made and tested in the backend.
The frontend must neither invent grants nor veto valid server-issued grants.
