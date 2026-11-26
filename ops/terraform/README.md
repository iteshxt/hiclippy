# HiClippy infrastructure (Terraform)

HiClippy's existing setup, described as code: the Vercel frontend, the
Render API, the MongoDB Atlas database and the Hostinger DNS for
`hiclippy.online`. This **adopts what is already live**. It never creates
the site from scratch. See `docs/plan-ops.md` for the full plan.

| Service | Provider | Version | What is imported |
| --- | --- | --- | --- |
| Vercel | `vercel/vercel` (partner) | ~> 5.27 | project `clippy`, its 3 domains, `VITE_API_URL` |
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
4. State stays local (gitignored) for now. If it moves, it moves to a
   private remote backend, never into git.

## Setup

```bash
cd ops/terraform
cp terraform.tfvars.example terraform.tfvars   # then fill it in
terraform init
```

Tokens needed (create them with the least access that works):

- **Vercel:** an access token scoped to the `itesh-stuff` team.
- **Render:** an API key, plus the owner ID (`usr-…` or `tea-…`).
- **MongoDB Atlas:** a service account (or API key) with *Project Read Only*
  on the HiClippy project. Read-only is enough for importing and planning.
- **Hostinger:** an API token from hPanel.

## Phase 1: import without changing anything

```bash
terraform plan -generate-config-out=generated.tf
```

Terraform reads each live resource named in `imports.tf` and writes matching
resource blocks to `generated.tf`. Nothing changes in production. Then:

1. Review `generated.tf`. Drop computed or read-only attributes the plan
   complains about.
2. Move the resources into modules (`modules/vercel`, `render`, `atlas`,
   `dns`) with variables and outputs.
3. Run `terraform plan` again. Repeat until it says **No changes**.

Done when `terraform plan` reports *No changes. Your infrastructure matches
the configuration.*

## Files

| File | Purpose |
| --- | --- |
| `versions.tf` | Terraform and provider version pins |
| `providers.tf` | Provider settings; credentials come from variables |
| `variables.tf` | Credentials (sensitive) and the IDs of live resources |
| `imports.tf` | What to adopt, and how to find each one |
| `terraform.tfvars.example` | Template for your local, gitignored `terraform.tfvars` |
