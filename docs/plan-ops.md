# HiClippy Ops Plan: Terraform + Nagios

A plan for adding two DevOps tools to HiClippy for the INT333 (DevOps Advance Configuration Management) course project, which needs at least two tools from the syllabus.

- **Terraform**: HiClippy's existing setup (Vercel, Render, MongoDB Atlas, Hostinger DNS) described as code.
- **Nagios**: monitoring of the live product at `hiclippy.online`.

HiClippy is a live, free product with its own domain. This project **adds to it**; nothing is redeployed or rebuilt from scratch. Status: **planning only**, nothing has been created or changed yet.

---

## 1. What the tools do

### Terraform: infrastructure written down as code

Today HiClippy's setup lives in four dashboards: Vercel (frontend and domains), Render (API), Atlas (database) and Hostinger (DNS). The settings were clicked together by hand.

Terraform describes all of it in text files instead, for example:

```hcl
resource "vercel_project_domain" "www" {
  project_id = vercel_project.clippy.id
  domain     = "www.hiclippy.online"
}
```

Two commands matter:

- `terraform plan`: compares the files with what is live and lists the differences. **Changes nothing.**
- `terraform apply`: makes the live setup match the files.

Why it helps:

- **One place**: every service's settings in one folder instead of four dashboards.
- **History**: the files are in git, so every change has a when and a why.
- **Rebuild**: if something is deleted or broken, `apply` puts it back as the files describe.
- **Drift detection**: a setting changed by hand in a dashboard shows up in `plan`.

Because HiClippy already exists, Terraform **imports** it: it reads what is live and writes matching files, without changing anything.

### Nagios: a watchman that keeps checking that things work

Nagios runs on a machine (the laptop, for this project) and runs small checks on a schedule. For HiClippy, every few minutes it asks:

- Does `www.hiclippy.online` load?
- Does the API's `/health` say "healthy"?
- How long did it take to respond?
- When does the HTTPS certificate expire?
- Can a paste actually be saved and read back? (custom plugin)

Each check returns **OK**, **WARNING**, **CRITICAL** or **UNKNOWN**. Nagios shows them on a web dashboard and can alert (email or desktop notification) when something breaks.

Terms:

- **Plugin**: a small script that does one check. Nagios ships many; custom ones can be written in Bash or Python.
- **Soft vs hard state**: one failure is "soft" (maybe a blip). It becomes "hard", and alerts, only after several failures in a row. Useful for Render's free tier, where the first request after sleeping is slow.
- **Downtime**: tell Nagios "maintenance from 2 to 3" so it doesn't alert in that window.

### In one line each

- **Terraform** = *how HiClippy is set up*, kept as code.
- **Nagios** = *whether HiClippy is working right now*, checked continuously.

Terraform defines what should exist; Nagios checks that it actually works.

---

## 2. HiClippy today (read-only survey, 2026-11-25)

| Part | Where | Details |
|---|---|---|
| Frontend | Vercel project **`clippy`** | Vite, Node 24, one environment variable (`VITE_API_URL`). `www.hiclippy.online` is the main address; `hiclippy.online` and `hiclippy.vercel.app` redirect to it (308). Answered 200 in about 0.6 s. Preview deployments need a Vercel sign-in. |
| Domain and DNS | **Hostinger** (nameservers on `dns-parking.com`) | Apex A record points at Vercel, `www` is a CNAME to Vercel, plus a Google site-verification TXT record. No CAA or MX records. |
| HTTPS certificate | Let's Encrypt, issued by Vercel | Expires 2 Jan 2027; Vercel renews it automatically. |
| API | Render, **`clippy-api.onrender.com`** | `/health` returned `{"status":"healthy"}` in about 2 s. Settings live in the Render dashboard (no `render.yaml` in the repo). |
| Database | MongoDB Atlas | Not inspected yet (needs an Atlas API key). |

### Terraform providers (checked on the Terraform registry)

| Service | Provider | Covers |
|---|---|---|
| Vercel | `vercel/vercel` (official) | project, project domains, environment variables, deployment protection, DNS records |
| Render | `render-oss/render` (official) | web service, env groups, notification settings, webhooks |
| MongoDB Atlas | `mongodb/mongodbatlas` (official) | project, cluster, database users, IP access list, alerts |
| Hostinger | `hostinger/hostinger` (official) | DNS records |

Every piece of HiClippy can be described in Terraform.

---

## 3. Safety: working in a branch, and does it break HiClippy?

The work happens on a branch of this repo and is merged into `main` later. **Adding the tools does not break HiClippy**, before or after the merge.

Why it's safe:

- Everything goes in a new folder (`ops/terraform`, `ops/nagios`). The frontend and backend code don't change.
- The Docker builds only use `frontend/` and `backend/`, so `ops/` is not part of any build.
- Terraform and Nagios do nothing just by being in the repo. They only act when run by hand on the laptop.

What will happen (all harmless):

- **Pushing the branch**: Vercel builds a preview of it. Previews need a Vercel sign-in, so the public never sees it, and production is untouched.
- **Merging to `main`**: Vercel (and Render, if it auto-deploys) rebuilds and redeploys. The app code is the same, so the result is the same site.

The real risks are in what gets run later, not in merging:

1. **Secrets in a public repo.** This repo is public. Terraform's state file and variables file hold secrets (API tokens, the Atlas password). Before the first commit, `.gitignore` must exclude `*.tfstate*`, `*.tfvars` and `.terraform/`.
2. **`terraform apply`** is the only command that can change production. Planning and import only run `plan`. No `apply` until `plan` says "No changes", and then only with an explicit OK.
3. **How often Nagios checks** affects Render's free hours (see trade-offs). That's a setting, not something that can break the site.
4. **The paste test plugin** saves a tiny paste that expires in 1 minute and deletes it immediately. Rate limits are per device, so Nagios never uses up real users' limits.

---

## 4. Phases

### Phase 0: Setup (by hand)

- Create a branch for the work.
- Create API tokens for Vercel, Render, Atlas and Hostinger. Keep them in environment variables or a gitignored `.tfvars` file.
- Add the `.gitignore` rules for Terraform **before** anything else is committed.
- Terraform state stays local (gitignored) or in a private remote backend, never in git.

### Phase 1: Terraform, import without changing anything

- Use `import` blocks and `terraform plan -generate-config-out` to bring in:
  - the Vercel project, its domains and its environment variable;
  - the Render web service;
  - the Atlas project, cluster and IP access list;
  - the Hostinger DNS records.
- Tidy the generated code into modules (`vercel`, `render`, `atlas`, `dns`) with variables and outputs.
- **Done when `terraform plan` says "No changes."** There is no `apply` in this phase.
- Syllabus coverage: configuration files, managing resources and dependencies, state and state management, modules, best practices and security.

### Phase 2: Nagios, monitor production

- Build Nagios Core and the standard plugins from source on the laptop, in a Docker container or a small VM. Building from source covers "Compiling and Installing".
- Hosts: `www.hiclippy.online`, `hiclippy.online`, `clippy-api.onrender.com`.
- Checks using built-in plugins:
  - site returns 200 and contains the expected page text;
  - `hiclippy.online` answers 308 and redirects to `www`;
  - HTTPS certificate expiry (WARNING at 30 days, CRITICAL at 7);
  - DNS still resolves to Vercel;
  - API `/health` returns "healthy";
  - response-time thresholds.
- **Custom plugin** (Python): save a paste with a 1-minute expiry, read it back by its code, delete it. Run about every 15 minutes, well within HiClippy's own rate limits.
- Web interface: downtime, comments, acknowledging alerts, soft vs hard states (Render's cold starts show this well).
- Syllabus coverage: installation, plugins (including a custom one), soft and hard states, monitoring web servers, the web interface.

### Phase 3: Connect the two tools (later, only with an explicit OK)

- A first, harmless `apply` that only **adds** something, such as a Render failure notification or an Atlas alert.
- Terraform outputs (domains, API address) generate the Nagios host config, so monitoring follows infrastructure changes.

### Phase 4: Docs and demo

- Architecture diagram.
- Report.
- Screenshots: a clean `terraform plan` and the Nagios dashboard.

---

## 5. Trade-offs to decide

- **Render free tier sleeps after 15 minutes idle.** Checking every 5 minutes keeps it awake: users never hit a cold start, but it uses about 730 of the 750 free instance hours a month, a problem if other free Render services share those hours. Checking every 30 minutes instead means Nagios regularly sees slow first responses.
- **Atlas IP access list.** Render's free tier has no fixed outgoing IP addresses, so the list is probably open to everyone (`0.0.0.0/0`). Terraform will make that visible in code. Worth discussing in the report, not fixing now.
- **Production rule.** Import must end with zero planned changes before any `apply` is ever run.

## 6. Open questions

- Where Nagios runs: Docker container or a small VM on the laptop.
- How often Nagios checks the Render API (see trade-offs).
- Course deadline, and whether the project is solo or a team.
