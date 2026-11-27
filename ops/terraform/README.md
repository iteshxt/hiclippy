# HiClippy infrastructure (Terraform)

HiClippy's existing setup, described as code: the Vercel frontend, the
Render API, the MongoDB Atlas database and the Hostinger DNS for
`hiclippy.online`. This **adopts what is already live**. It never creates
the site from scratch. See `docs/plan-ops.md` for the full plan.

| Service | Provider | Version | What is imported |
| --- | --- | --- | --- |
| Vercel | `vercel/vercel` (partner) | ~> 5.27 | project `hiclippy` (team `temp-stuff`), its 2 domains, `VITE_API_URL` |
| Render | `render-oss/render` (partner) | ~> 1.9 | the API web service |
| MongoDB Atlas | `mongodb/mongodbatlas` (partner) | ~> 2.22 | project, cluster, IP access list entry |
| Hostinger | `hostinger/hostinger` (community) | ~> 0.1.23 | apex A, `www` CNAME, Google TXT record |

The Hostinger provider is a community provider, not an official one, and is
still at 0.x. Pin it and read its changelog before upgrading.

## Safety rules

1. **The repo is public.** State files (`*.tfstate`) and `terraform.tfvars`
   hold tokens and passwords. They are gitignored. Never force-add them.
   Run `git status` before every commit in this folder.
2. **`terraform plan` is safe; `terraform apply` changes production.** Phase
   1 only runs `plan`. No `apply` until `plan` says *No changes* and the
   change has been reviewed.
3. **DNS records are replaced, not edited.** Hostinger deletes and recreates
   a record on any change, which takes the site offline for a while.
4. State stays on the laptop, outside the repo (see Setup). If it moves,
   it moves to a private remote backend, never into git.

## Setup

Credentials live in the repo-root `.env.local` (gitignored on every
branch) as `TF_VAR_<variable>` lines, which Terraform reads from the
environment:

```bash
# hiclippy/.env.local
TF_VAR_vercel_api_token=...
TF_VAR_render_api_key=...
TF_VAR_render_owner_id=...
TF_VAR_hostinger_api_token=...
TF_VAR_atlas_client_id=...
TF_VAR_atlas_client_secret=...
TF_VAR_render_service_id=srv-...
```

Load it into the shell, then run Terraform from this folder:

```bash
set -a; . ./.env.local; set +a   # from the repo root
cd ops/terraform
terraform init -backend-config="path=$HOME/.local/share/hiclippy-terraform/terraform.tfstate"
```

The state file lives in `~/.local/share/hiclippy-terraform/`, outside
every checkout, so it can never be committed and survives deleting a
worktree. Keep a backup of it: losing it means re-importing.

A gitignored `terraform.tfvars` works too (see `terraform.tfvars.example`).

Tokens needed (create them with the least access that works):

- **Vercel:** an access token scoped to the `temp-stuff` team.
- **Render:** an API key, plus the owner ID (`usr-…` or `tea-…`).
- **MongoDB Atlas:** a service account (or API key) with *Project Read Only*
  on the HiClippy project. Read-only is enough for importing and planning.
  The laptop's IP changes, so the account's API access list allows the
  ISP range `49.156.0.0/16` (Atlas refuses `0.0.0.0/0` there). If `plan`
  fails with `IP_ADDRESS_NOT_ON_ACCESS_LIST`, add the current IP.
- **Hostinger:** an API token from hPanel.

## Phase 1: import without changing anything

The live resources are described in four modules, and `imports.tf` maps
each one to its live counterpart. Check the match:

```bash
terraform plan
```

**Done on 2026-11-27.** All 11 resources were imported with one
`terraform apply` of a saved plan that contained imports only ("11
imported, 0 added, 0 changed, 0 destroyed"), and `terraform plan` now
reports:

> No changes. Your infrastructure matches the configuration.

From here, `terraform plan` is the drift check: anything changed by hand
in a dashboard shows up as a difference. Any "to change" or "to destroy"
means code and production differ; investigate before applying anything.

### What Terraform does not manage

- **Render environment variables** (`MONGO_URI` and the limits). Render
  never returns their values, so Terraform can't compare them, and writing
  them could wipe the database URI. They stay in the Render dashboard
  (`ignore_changes = [env_vars]`), which also keeps every secret out of
  Terraform.
- Preview deployments, build logs, database contents and users.

### Safety nets in the code

- `prevent_destroy` on the Vercel project, Render service, Atlas project
  and cluster, and every DNS record: a plan that would delete one fails.
- DNS records are defined once in `main.tf` (`local.dns_records`) and used
  by both the module and its imports, so the two can't drift apart.

## Files

| Path | Purpose |
| --- | --- |
| `main.tf` | Calls the four modules with today's real settings |
| `imports.tf` | Maps each module resource to its live counterpart |
| `outputs.tf` | Site, API and health URLs, DNS records, database state (for Nagios) |
| `variables.tf` | Credentials (sensitive) and IDs of live resources |
| `providers.tf` / `versions.tf` | Provider settings and version pins |
| `modules/vercel` | Project, `www` and apex domains, `VITE_API_URL` |
| `modules/render` | The API web service (env vars excluded) |
| `modules/atlas` | Project, M0 cluster, IP access list |
| `modules/dns` | Hostinger DNS records, one resource per record |
| `terraform.tfvars.example` | Template for a local, gitignored `terraform.tfvars` |
