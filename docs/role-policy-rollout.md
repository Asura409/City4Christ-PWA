# Role policy rollout — pending backend enforcement

Frontend policy now requires a global Super Admin role AND the relevant capability
for member administration, role management, and church-wide group administration.
Nobody receives administrative name-editing controls. Scoped group membership
management requires an exact ministry-leader assignment and matching capability.

These display checks do not secure the API. Deployment is pending the backend work
below, and the complete role migration has not been performed.

## Backend requirements

- Reject administrative member-name PATCH requests. Preserve self-service PATCH /me.
- Restrict all role grants/revocations and group leader appointments to Super Admin.
- Remove obsolete global group and member administration grants from operational roles.
- Enforce group scope on membership approval, denial, and removal.
- For ordinary leader removals, protect the creator, current appointed leaders and
  Super Admins. Derive target status from authoritative database records.
- Provide a per-target `canRemove` boolean on group roster records. Default absence
  is denied in the frontend for scoped leaders until this contract is implemented.
  Reauthorize every removal at write time; never trust a client-provided flag.
- Keep Super Admin membership removal distinct from leadership revocation; audit
  actions and preserve last-administrator/last-leader safeguards.
- Re-evaluate authorization for existing sessions after role changes.
- Review and migrate existing assignments without deleting memberships or content.

Existing tests that expect Staff to administer members or appoint leaders represent
the previous policy and must be migrated with the backend fixtures. The new focused
boundary tests cover denial despite obsolete capability grants.
