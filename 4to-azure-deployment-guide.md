# Deploying .4to to Azure — The A-to-Z Learning Guide

> Goal: take the `.4to` app (FastAPI backend + PostgreSQL + Redis + photo storage + React Native mobile app) from your laptop to a real, secure, monitored deployment on Microsoft Azure, **and understand why each step exists**.

This guide pairs with `4to-app-spec.md`. The spec says *what* to build; this guide says *how to run it in the cloud*.

---

## 0. How to use this guide

- Work **top to bottom**. Each phase builds on the previous one.
- Every step has four parts: **Why** (the concept), **Do** (commands), **Verify** (how to know it worked), **If it breaks** (common errors).
- Commands are for **Linux/Ubuntu + bash** with the **Azure CLI** (`az`). Everything can also be done in the Azure Portal; the CLI is used because it's repeatable and teaches you what the portal clicks really do.
- Replace anything in `<angle-brackets>`.
- **Do not skip Phase 1 (budget) and Phase 4 (pre-deploy checklist).** They prevent the two most common beginner disasters: a surprise bill and an app that works locally but not in the cloud.
- Prices, free offers, and service names change. Always check the official pricing page and the Azure docs before committing money. This guide tells you *where* to check.

### Suggested pace
| Phase | Topic | Time |
|---|---|---|
| 1–3 | Concepts, budget, accounts, tools | 1 day |
| 4 | Make the app deploy-ready | 2–4 days |
| 5 | Practice deploy (hello-world) | 1 day |
| 6–7 | Build infrastructure + deploy real app | 2–3 days |
| 8–10 | Domain, mobile, CI/CD | 2–3 days |
| 11–13 | Monitoring, security, IaC | ongoing |

---

## 1. First: understand what "deploying" means

**On your laptop** you run `docker compose up` and everything (API, database, Redis, storage) runs on one machine that only you can reach.

**In the cloud** each of those pieces becomes a separate, managed service on the internet:

| Local (Docker Compose) | Azure equivalent | Why it changes |
|---|---|---|
| FastAPI container | **Azure Container Apps** | Runs your container, gives it a public HTTPS URL, scales it |
| Celery worker container | **Azure Container Apps** (second app, no public URL) | Background jobs run separately from the API |
| PostgreSQL container | **Azure Database for PostgreSQL – Flexible Server** | Backups, patching, and failover handled for you |
| Redis container | A small Redis container app (learning) or **Azure Managed Redis** (production) | See note in Phase 6 |
| MinIO (S3-like storage) | **Azure Blob Storage** | Cheap, durable file storage for photo originals |
| `.env` file | **Key Vault** + Container Apps secrets | Secrets must never live in code or images |
| `docker build` on your PC | **Azure Container Registry (ACR)** | A private "app store" for your images |
| Terminal logs | **Log Analytics / Azure Monitor** | Logs from many containers in one searchable place |

The important mindset shift: **your laptop is one computer you control; the cloud is a set of services that talk to each other over a network, each with its own identity, permissions, firewall, and bill.** Deployment is mostly about wiring those correctly and securely.

---

## 2. Azure vocabulary (learn these once, use them forever)

| Term | Plain meaning |
|---|---|
| **Tenant (Microsoft Entra ID)** | Your organization's identity directory: users, apps, identities. |
| **Subscription** | The billing container. All resources live in a subscription and are charged to it. |
| **Resource group (RG)** | A folder for related resources. **Delete the RG = delete everything inside** (great for cleanup). |
| **Resource** | Any single thing: a database, a storage account, a container app. |
| **Region / location** | The datacenter location (e.g., `southeastasia`). Affects latency, price, and available services. |
| **Azure CLI (`az`)** | Command-line tool to create and manage resources. |
| **RBAC** | Role-Based Access Control: "who can do what on which resource." |
| **Managed identity** | An identity Azure gives to your app so it can access other services **without passwords**. |
| **Container Apps environment** | The shared network/logging boundary your container apps run inside. |
| **Ingress** | How traffic reaches your app (external = internet, internal = only inside the environment). |
| **Revision** | An immutable version of a container app; lets you roll back. |
| **SAS URL** | A temporary, scoped URL giving upload/download access to a blob without sharing keys. |
| **VNet / subnet / NSG** | Virtual network, its sections, and its firewall rules (networking topics you'll love later). |
| **Private endpoint** | Gives an Azure service a private IP inside your VNet so it isn't exposed to the internet. |
| **IaC** | Infrastructure as Code: describing resources in files (Bicep/Terraform) instead of clicking. |

---

## 3. Target architecture

```
                        Internet
                            │
        ┌───────────────────┴────────────────────┐
        │  Mobile app (Expo build on phones)     │
        └───────┬─────────────────────┬──────────┘
                │ HTTPS/WSS (API)     │ HTTPS (direct upload/download via SAS URL)
                ▼                     ▼
   ┌─────────────────────────┐   ┌─────────────────────────┐
   │ Container Apps env      │   │ Azure Blob Storage      │
   │  ├─ api  (external)     │──►│  container: originals   │
   │  ├─ worker (no ingress) │   │  container: thumbnails  │
   │  └─ redis (internal)    │   └─────────────────────────┘
   └───────┬─────────────────┘
           │ SSL
           ▼
   ┌─────────────────────────┐    ┌─────────────────────┐
   │ PostgreSQL Flexible Srv │    │ Key Vault (secrets) │
   └─────────────────────────┘    └─────────────────────┘

   ACR (images)   •   Log Analytics (logs)   •   Application Insights (traces)
   FCM (push notifications — Google/Firebase, not Azure)
```

### Why these choices (and not others)?
- **Container Apps** over **VMs**: you don't patch an OS or manage Docker yourself; it scales to zero when idle (cheap for learning). Over **AKS (Kubernetes)**: Kubernetes is powerful but heavy; learn it later once this works.
- **Direct-to-Blob uploads**: a 12 MB photo ×500 photos should never stream through your API. The API only hands out short-lived upload URLs. This keeps API cost low and uploads fast.
- **Managed PostgreSQL**: running your own database in a container means *you* own backups and data loss. Don't do that for real user data.
- **Managed identity**: the API talks to Blob/Key Vault/ACR with an identity, not passwords. Fewer secrets = smaller attack surface.

---

## Phase 1 — Money and safety first

### Step 1.1 Pick your account type
**Why:** the account decides what you can afford to learn on.

- **Azure for Students**: if you have a university email, this is the best starting point. At the time of writing, Microsoft's pages describe it as needing no credit card at sign-up, with starter credit and some free services, renewable while you are a student. The **credit amount and validity differ between regions and pages** (one page shows $100 over 12 months, another shows larger credits with verification), so **read the offer shown to your own account**.
- If credits run out, the subscription can be **disabled** until you upgrade to pay-as-you-go (this is a safety feature: you can't accidentally overspend, but your app will go offline).
- **Azure Free account** (non-student): free credit for 30 days plus some always-free/12-month-free services; requires a card.
- Azure credits typically **can't** be spent on Marketplace/third-party offers.

Read: `https://azure.microsoft.com/free/students`

### Step 1.1b If you only have the GitHub Student Developer Pack (no Azure subscription yet)
**Why:** the pack does not create an Azure subscription by itself. It lists Microsoft Azure as an offer, and you still have to **claim and activate Azure for Students** as a separate step. Azure runs its own eligibility checks; the pack does not override them.

**Do:**
1. **Confirm the pack is approved.** Open `https://education.github.com/pack` while signed in to GitHub and check that your student benefits are active. New approvals can take a few hours to show everywhere.
2. **Find the Azure offer.** On the pack's offers page, open **Microsoft Azure** and follow the claim link. It leads to the Azure for Students sign-up page (`https://azure.microsoft.com/free/students`).
3. **Use a clean browser window** (private/incognito) and sign in with a **Microsoft account**. Use one that can be verified with the same student email or GitHub identity used for the pack.
4. **Complete the student verification** that the sign-up asks for (GitHub verification or your school email, depending on what the page offers). You do not need a credit card at sign-up.
5. **Check what you received:** in the portal, open *Subscriptions* and read the subscription name and offer.

**Verify:** `az account list -o table` (after Step 2.3) shows a subscription named like **Azure for Students**.

**Two things to watch:**
- **Azure for Students Starter vs Azure for Students.** Starter has a $0 spending limit and very limited services (no virtual machines), and it cannot be converted into the full offer. If you land on Starter, first check whether Container Apps, PostgreSQL and Blob Storage can be created. If not, retry the full Azure for Students verification in a new private window, or contact Azure support.
- **One account per person.** If you used an Azure for Students offer in the past, the offer may refuse you. Microsoft Q&A threads show this is a common cause of "unable to claim" errors.

**If activation fails:** wait a few hours after pack approval, try again in a private window, make sure the Microsoft account has your student email added and verified, then ask on Microsoft Q&A or open a support request.

**Other pack perks worth checking** (offers change, read each offer page): GitHub Pro (private repos and more Actions minutes for Phase 10), Copilot Student, and a domain offer through Namecheap, which can replace buying a domain in Phase 8.

### Step 1.2 Set a budget alert BEFORE creating anything
**Why:** cloud billing is usage-based. A forgotten resource keeps costing money. Alerts are your smoke detector.

**Do (Portal):** *Cost Management + Billing → Cost Management → Budgets → Add*
- Scope: your subscription
- Amount: a small number you're comfortable with (e.g., $10/month)
- Alerts at 50%, 80%, 100% → your email

**Verify:** you receive a confirmation email / see the budget listed.

### Step 1.3 Learn the cost drivers of `.4to`
| Resource | Cost behavior | Beginner tip |
|---|---|---|
| Container Apps | Pay per vCPU/memory-second while running; a monthly free grant exists | Use `min-replicas 0` for dev so it sleeps when idle |
| PostgreSQL Flexible | Pays for compute **per hour while running** + storage | Smallest Burstable size; **stop the server when not working** (`az postgres flexible-server stop`) |
| Blob Storage | Pay per GB stored + operations + egress (downloads) | Photos are the main long-term cost driver |
| Container Registry | Small daily fee per registry (Basic tier) | One registry is enough |
| Log Analytics | Pay per GB ingested | Don't log photo bytes or huge payloads |
| Managed Redis | Notably more expensive than a Redis container | Use the container approach while learning |

Use the **Azure Pricing Calculator** (`https://azure.microsoft.com/pricing/calculator`) to estimate before building.

### Step 1.4 Golden rules
1. Put **everything for one environment in one resource group**.
2. **Tag** resources (`project=4to env=dev`).
3. At the end of each study session, ask: "what is still running that I don't need?"
4. When finished practicing: `az group delete --name <rg> --yes --no-wait` removes it all.

---

## Phase 2 — Account and tools

### Step 2.1 Create the account
If you have not claimed Azure yet, do **Step 1.1b** first (the GitHub Student Developer Pack route). Use a private/incognito window to avoid mixing with other Microsoft accounts.

**Verify:** you can sign in at `https://portal.azure.com` and see a subscription under *Subscriptions*.

### Step 2.2 Install the tools on Ubuntu
**Why:** you need the CLI to talk to Azure and Docker to build images.

```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az version

# Docker (if not already installed): follow https://docs.docker.com/engine/install/ubuntu/
docker --version

# Useful extras
sudo apt-get update && sudo apt-get install -y jq postgresql-client git
```

Container Apps commands live in an extension:
```bash
az extension add --name containerapp --upgrade
```

### Step 2.3 Log in and check the subscription
```bash
az login                       # opens a browser
az account list -o table
az account set --subscription "<subscription-name-or-id>"
az account show -o table
```
**Verify:** `az account show` prints the subscription you intend to use. **Always check this before creating resources** — wrong subscription is a classic mistake.

### Step 2.4 Register resource providers
**Why:** Azure services are "providers" that must be enabled once per subscription. Fresh subscriptions often fail with `MissingSubscriptionRegistration` otherwise.

```bash
for p in Microsoft.App Microsoft.OperationalInsights Microsoft.ContainerRegistry \
         Microsoft.DBforPostgreSQL Microsoft.Storage Microsoft.KeyVault \
         Microsoft.ManagedIdentity Microsoft.Insights; do
  az provider register --namespace $p
done
az provider show -n Microsoft.App --query registrationState -o tsv   # wait for "Registered"
```

### Step 2.5 Pick a region
**Why:** closer region = lower latency for your users. For Sri Lanka, typical choices are **Central India, South India, or Southeast Asia (Singapore)**.

Student subscriptions can have **restricted allowed regions**. If you get `RequestDisallowedByAzure` or `RegionDoesNotAllowProvisioning`, try another region from the allowed list. Keep **all resources in the same region** to avoid cross-region latency and egress fees.

### Step 2.6 Set up shell variables
Put these in a file `infra/vars.sh` (**not committed if it contains secrets**) and `source` it in every new terminal.

```bash
# infra/vars.sh
export LOC=southeastasia            # your chosen region
export ENVNAME=dev
export RG=rg-4to-$ENVNAME

# Globally unique names: add your initials/random digits
export SUFFIX=$(echo $RANDOM | md5sum | head -c 5)
export ACR=acr4to$ENVNAME$SUFFIX            # lowercase letters+digits only
export PG=pg-4to-$ENVNAME-$SUFFIX           # lowercase, digits, hyphens
export SA=st4to$ENVNAME$SUFFIX              # 3–24 chars, lowercase letters+digits
export KV=kv-4to-$ENVNAME-$SUFFIX           # 3–24 chars, letters/digits/hyphens
export CAENV=cae-4to-$ENVNAME
export LAW=log-4to-$ENVNAME
export IDNAME=id-4to-api-$ENVNAME
export PGADMIN=dbadmin
export DBNAME=fourto
```
Save the generated `SUFFIX` value somewhere; if you regenerate it you'll "lose" your resource names.

---

## Phase 3 — Mental model of security (read before building)

Three rules that shape every decision below:

1. **No secrets in code, images, or git.** Passwords live in Key Vault/Container Apps secrets; the app reads them from environment variables at runtime.
2. **Least privilege.** Each identity gets only the roles it needs (e.g., the API can read/write blobs but can't delete the subscription).
3. **Minimize exposure.** Only the API is public. The database, Redis, and storage accounts should be reachable only by what needs them (you'll tighten this progressively; see Phase 12).

---

## Phase 4 — Make the app deploy-ready (the pre-deploy checklist)

> This is the most valuable phase. If the app doesn't run cleanly in Docker with environment-based config, the cloud will just make failures harder to see.

### Step 4.0 Prerequisite: a working local app
You should be able to run `docker compose up` and complete the main flow locally: register → upload photo → create Space → share → chat. If you haven't built the app yet, **do Phase 5 with a tiny hello-world API first** and come back here when the real app exists.

### Step 4.1 Version control hygiene
- Code in a Git repo (GitHub), with `main` and feature branches.
- `.gitignore` includes `.env`, `*.pem`, `node_modules`, `__pycache__`, `infra/vars.sh`, build output.
- **Check history for leaked secrets** (`git log -p | grep -i password`). If you ever committed one, **rotate it**; deleting the commit isn't enough.

### Step 4.2 Twelve-factor configuration
**Why:** the same image must run on your laptop, in dev, and in prod, differing only by environment variables.

- Read all settings from environment variables (use `pydantic-settings` in FastAPI).
- Provide `.env.example` listing every variable with fake values.

Minimum variable list for `.4to`:
```
APP_ENV=production
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db?ssl=require
REDIS_URL=redis://host:6379/0
STORAGE_BACKEND=azure            # "s3" for MinIO locally, "azure" in the cloud
AZURE_STORAGE_ACCOUNT=<name>
AZURE_STORAGE_CONTAINER_ORIGINALS=originals
AZURE_STORAGE_CONTAINER_THUMBS=thumbnails
AZURE_CLIENT_ID=<managed identity client id>   # tells DefaultAzureCredential which identity
JWT_SECRET=<long random string>
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=30
CORS_ORIGINS=https://app.example.com
FCM_CREDENTIALS_JSON=<secret>
SENTRY_DSN=<optional>
```
Never give secrets default values in code.

### Step 4.3 Add a storage abstraction (important change from the spec)
**Why:** the spec used S3-compatible storage (MinIO locally). **Azure Blob is not S3-compatible**, so the cloud code path differs.

Create one interface and two implementations:

```python
class StorageBackend(Protocol):
    def create_upload_session(self, key: str, size: int) -> UploadSession: ...
    def create_download_url(self, key: str, expires_minutes: int = 15) -> str: ...
    def delete(self, key: str) -> None: ...
```
- `S3Storage` (MinIO/S3) for local if you want to keep it
- `AzureBlobStorage` for the cloud — or run **Azurite** (Microsoft's local Blob emulator, image `mcr.microsoft.com/azure-storage/azurite`) locally instead of MinIO so dev and prod behave the same.

Azure upload approach: the API creates a **user delegation SAS** URL; the phone uploads the file in **blocks** (`Put Block`), then commits them (`Put Block List`). This is Azure's equivalent of S3 multipart upload and supports resuming.

```python
from datetime import datetime, timedelta, timezone
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, BlobSasPermissions, generate_blob_sas

ACCOUNT = settings.azure_storage_account
cred = DefaultAzureCredential()   # uses AZURE_CLIENT_ID when using a user-assigned identity
svc = BlobServiceClient(f"https://{ACCOUNT}.blob.core.windows.net", credential=cred)

def upload_sas_url(container: str, key: str) -> str:
    start = datetime.now(timezone.utc)
    expiry = start + timedelta(minutes=15)
    udk = svc.get_user_delegation_key(start, expiry)
    sas = generate_blob_sas(
        account_name=ACCOUNT, container_name=container, blob_name=key,
        user_delegation_key=udk, permission=BlobSasPermissions(create=True, write=True),
        expiry=expiry,
    )
    return f"https://{ACCOUNT}.blob.core.windows.net/{container}/{key}?{sas}"
```
Packages: `azure-identity`, `azure-storage-blob`.

### Step 4.4 Health endpoints
**Why:** the platform needs to ask "are you alive?" and "are you ready for traffic?"

```python
@app.get("/healthz")           # liveness: process is up (no dependencies)
def healthz(): return {"status": "ok"}

@app.get("/readyz")            # readiness: can talk to DB/Redis
async def readyz(db=Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"status": "ready"}
```

### Step 4.5 Production Dockerfile
**Why:** smaller images build/pull faster and have fewer vulnerabilities; running as non-root limits damage if compromised.

```dockerfile
# services/api/Dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libvips42 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN adduser --disabled-password --gecos "" appuser && chmod +x scripts/*.sh
USER appuser

EXPOSE 8000
CMD ["scripts/start-api.sh"]
```
`scripts/start-api.sh`:
```bash
#!/bin/sh
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips="*"
```
`scripts/start-worker.sh`:
```bash
#!/bin/sh
exec celery -A app.workers.celery_app worker --loglevel=INFO
```
Why wrapper scripts: they give you a clean, single-string command to run the **same image** as either API or worker.

Add a `.dockerignore` (`.git`, `.env`, `__pycache__`, `tests`, `node_modules`) so secrets and junk never enter the image.

### Step 4.6 Make the app stateless
**Why:** cloud platforms start, stop, and clone containers at will. Anything stored on a container's local disk disappears.

- No uploaded photos on local disk — always Blob.
- No in-memory sessions — use JWT/Redis.
- WebSocket chat with multiple replicas needs Redis pub/sub (already in the spec) so a message sent to replica A reaches users connected to replica B.

### Step 4.7 Database migrations strategy
**Why:** the cloud database starts empty and your schema must be created reliably.

- All schema changes via **Alembic**. Never hand-edit tables.
- Enable the extensions your schema uses. The spec uses `citext`; on Azure PostgreSQL you must **allow-list extensions** at the server level (Step 7.3).
- Decide how migrations run: (a) manually from your PC for now, (b) later as a one-off Container Apps **Job** or a CI step. **Don't** run them automatically at every container start once you have multiple replicas (they would race).

### Step 4.8 Production-grade settings
- `DEBUG=false`; no stack traces returned to clients.
- **CORS**: restrict to real origins (native mobile apps don't need CORS; web viewers do).
- **Rate limiting** on login, friend requests, invites, reminders (already in the spec).
- **Password hashing**: Argon2. **JWT**: short access tokens, refresh rotation.
- **Input limits**: max upload size/count per request; validate MIME type and size server-side.
- **Logging**: structured JSON logs to stdout (containers should log to stdout/stderr, not files). Never log passwords, tokens, or presigned URLs.
- Time: store UTC everywhere.

### Step 4.9 Tests and quality gates
- Unit tests for services, API tests for each endpoint, one end-to-end happy path.
- Linting (`ruff`), formatting, type checks (`mypy`) and dependency audit (`pip-audit`).
- These later become CI checks (Phase 10).

### Step 4.10 Test the production image locally
```bash
docker build -t 4to-api:local services/api
docker run --rm -p 8000:8000 --env-file .env.local 4to-api:local
curl http://localhost:8000/healthz
```
**Verify:** the container runs with only environment variables, no mounted source code. If it only works with `-v $(pwd):/app`, it isn't deploy-ready.

> **Architecture note:** if you ever build on an ARM machine (e.g., Apple Silicon) for Azure (x86), add `--platform linux/amd64`.

### Pre-deploy checklist (tick everything)
- [ ] App runs from a Docker image using only env vars
- [ ] `.env`, keys, and `vars.sh` are git-ignored; no secrets in history
- [ ] `/healthz` and `/readyz` exist
- [ ] Storage abstraction with Azure Blob implementation (or hello-world used for practice)
- [ ] Alembic migrations create the full schema from an empty database
- [ ] Logging goes to stdout in JSON, with no sensitive data
- [ ] CORS, rate limits, and upload limits configured
- [ ] Budget alert set; resource names planned

---

## Phase 5 — Practice deploy (hello-world first)

**Why:** deploying a tiny app first isolates *cloud* problems from *app* problems. You learn the whole pipeline (build → registry → run → URL → logs) with almost nothing that can go wrong in your own code.

Create `hello/app.py`:
```python
from fastapi import FastAPI
import os
app = FastAPI()

@app.get("/")
def root(): return {"app": ".4to", "env": os.getenv("APP_ENV", "unknown")}

@app.get("/healthz")
def healthz(): return {"status": "ok"}
```
`hello/Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn
COPY app.py .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```
Then follow **Steps 6.1 → 6.3 and 7.1 → 7.2** below using `hello` as the image. When you see the JSON at your public URL, you have mastered the core loop. Delete it, then do the real thing.

---

## Phase 6 — Build the infrastructure, step by step

> Always `source infra/vars.sh` first and confirm `az account show`.

### Step 6.1 Resource group
**Why:** the folder that holds and later deletes everything.
```bash
az group create --name $RG --location $LOC --tags project=4to env=$ENVNAME
```
**Verify:** `az group show -n $RG -o table`

### Step 6.2 Container Registry (ACR)
**Why:** Azure needs somewhere private to pull your images from.
```bash
az acr create --resource-group $RG --name $ACR --sku Basic
az acr login --name $ACR
```
`Basic` is the cheapest tier and enough for learning. Keep the admin user **disabled** (default); you'll use managed identity to pull images.

### Step 6.3 Build and push the image
```bash
export TAG=v1
docker build -t $ACR.azurecr.io/4to-api:$TAG services/api
docker push $ACR.azurecr.io/4to-api:$TAG
az acr repository list --name $ACR -o table
```
Alternative: `az acr build` builds in the cloud (**ACR Tasks**), which saves your laptop's RAM, but some free/student subscriptions restrict it. If it errors, use `docker push` as above.

**Tagging tip:** never deploy `latest` to prod; use immutable tags (`v1`, or the Git commit SHA). That makes rollbacks possible and deployments traceable.

### Step 6.4 Log Analytics workspace
**Why:** collects logs from Container Apps so you can search them in Azure.
```bash
az monitor log-analytics workspace create -g $RG -n $LAW -l $LOC
```

### Step 6.5 Identity for the API (user-assigned managed identity)
**Why:** one identity that your API *and* worker use to pull images, access Blob, and read secrets. A user-assigned identity exists independently of the app, which avoids a chicken-and-egg problem (the app needs permission to pull its own image before it can start).
```bash
az identity create -g $RG -n $IDNAME -l $LOC

export ID_RESOURCE=$(az identity show -g $RG -n $IDNAME --query id -o tsv)
export ID_CLIENT=$(az identity show -g $RG -n $IDNAME --query clientId -o tsv)
export ID_PRINCIPAL=$(az identity show -g $RG -n $IDNAME --query principalId -o tsv)

# Allow it to pull images from ACR
export ACR_ID=$(az acr show -n $ACR --query id -o tsv)
az role assignment create --assignee-object-id $ID_PRINCIPAL \
  --assignee-principal-type ServicePrincipal --role AcrPull --scope $ACR_ID
```
Role assignments can take a minute or two to propagate.

### Step 6.6 Container Apps environment
**Why:** the shared "cluster-like" space (network + logging) your apps run in.
```bash
export LAW_ID=$(az monitor log-analytics workspace show -g $RG -n $LAW --query customerId -o tsv)
export LAW_KEY=$(az monitor log-analytics workspace get-shared-keys -g $RG -n $LAW --query primarySharedKey -o tsv)

az containerapp env create -g $RG -n $CAENV -l $LOC \
  --logs-workspace-id $LAW_ID --logs-workspace-key $LAW_KEY
```

### Step 6.7 PostgreSQL Flexible Server (database)
**Why:** managed Postgres gives automated backups, patching, and monitoring.

```bash
export PGPASS='<generate-a-long-random-password>'   # use a password manager; don't commit

az postgres flexible-server create \
  --resource-group $RG --name $PG --location $LOC \
  --admin-user $PGADMIN --admin-password "$PGPASS" \
  --tier Burstable --sku-name Standard_B1ms \
  --storage-size 32 --version 16 \
  --public-access None
```
Notes:
- `Burstable` is the cheapest tier, good for dev. The exact SKU names/availability vary by region; run `az postgres flexible-server list-skus -l $LOC -o table` if the SKU is rejected.
- `--public-access None` = no one can connect until you add rules. Safer start.

Create the database and allow your PC to connect for setup:
```bash
az postgres flexible-server db create -g $RG --server-name $PG --database-name $DBNAME

MYIP=$(curl -s ifconfig.me)
az postgres flexible-server firewall-rule create -g $RG -n $PG \
  --rule-name allow-my-ip --start-ip-address $MYIP --end-ip-address $MYIP
```
Allow-list extensions the schema needs (`citext`):
```bash
az postgres flexible-server parameter set -g $RG --server-name $PG \
  --name azure.extensions --value CITEXT
```
Then enable it inside the DB:
```bash
psql "host=$PG.postgres.database.azure.com dbname=$DBNAME user=$PGADMIN sslmode=require" \
  -c "CREATE EXTENSION IF NOT EXISTS citext;"
```
**Verify:** `psql` connects and `\dx` lists `citext`.

#### Letting the Container Apps reach the database (two options)
| Option | How | Trade-off |
|---|---|---|
| **A. Simple (learning)** | Add the firewall rule "Allow public access from any Azure service" (start/end IP `0.0.0.0`) | Any Azure resource (even other customers') could *attempt* to connect; the password still protects you. Acceptable for dev only. |
| **B. Secure (recommended later)** | Put the Container Apps environment in a **VNet** and use **private access/private endpoint** for Postgres | No public database endpoint at all. Covered in Phase 12. |

For now, option A:
```bash
az postgres flexible-server firewall-rule create -g $RG -n $PG \
  --rule-name allow-azure-services --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
```
> Plan to replace this with option B before real users. Moving to private networking is one of the best DevOps/networking exercises in this project.

Connection string pieces: `postgresql+asyncpg://$PGADMIN:<PASS>@$PG.postgres.database.azure.com:5432/$DBNAME?ssl=require` (asyncpg uses `ssl=require`; psycopg uses `sslmode=require`). Better practice later: create a **separate least-privilege app user** (not the admin) for the API.

### Step 6.8 Storage account (photo originals)
**Why:** durable, cheap object storage — the heart of `.4to`.
```bash
az storage account create -g $RG -n $SA -l $LOC \
  --sku Standard_LRS --kind StorageV2 \
  --allow-blob-public-access false --min-tls-version TLS1_2

# Create containers (private)
az storage container create --account-name $SA --name originals --auth-mode login
az storage container create --account-name $SA --name thumbnails --auth-mode login
```
`Standard_LRS` keeps 3 copies in one datacenter (cheapest). Photos are irreplaceable, so for production consider `ZRS` (across zones) or `GRS` (another region), at higher cost.

If you can't create containers with `--auth-mode login`, first give yourself the role:
```bash
az role assignment create --assignee $(az ad signed-in-user show --query id -o tsv) \
  --role "Storage Blob Data Contributor" \
  --scope $(az storage account show -n $SA -g $RG --query id -o tsv)
```
Now give the **API identity** blob access (this is what lets it mint SAS URLs without any keys):
```bash
az role assignment create --assignee-object-id $ID_PRINCIPAL \
  --assignee-principal-type ServicePrincipal --role "Storage Blob Data Contributor" \
  --scope $(az storage account show -n $SA -g $RG --query id -o tsv)
```
CORS is only needed for **browser** uploads (e.g., a future web viewer), not for native apps. If needed:
```bash
az storage cors add --services b --methods GET PUT HEAD OPTIONS \
  --origins https://app.example.com --allowed-headers '*' --exposed-headers '*' \
  --max-age 3600 --account-name $SA --auth-mode login
```
Later: add a **lifecycle policy** (move thumbnails/old originals to Cool tier) and **soft delete** (recover accidentally deleted photos):
```bash
az storage account blob-service-properties update -n $SA -g $RG \
  --enable-delete-retention true --delete-retention-days 14
```

### Step 6.9 Redis
**Why:** Celery's job queue, rate limiting, and WebSocket pub/sub.

Important facts (as of this writing, from Microsoft's docs): **Azure Cache for Redis is being retired** (Basic/Standard/Premium on 30 Sep 2028, Enterprise earlier) and **Azure Managed Redis** is the replacement. Don't choose Azure Cache for Redis for a new project.

| Option | Use when |
|---|---|
| **Redis as a container app** (internal only) | Learning/dev. Cheapest. Data loss on restart is acceptable for dev (queue/cache only). |
| **Azure Managed Redis** | Production: managed, persistent options, high availability. More expensive; check the pricing page. |

Learning option:
```bash
az containerapp create -g $RG -n ca-4to-redis --environment $CAENV \
  --image redis:7-alpine --ingress internal --transport tcp --target-port 6379 \
  --min-replicas 1 --max-replicas 1 --cpu 0.25 --memory 0.5Gi
```
Inside the environment, your API reaches it at `redis://ca-4to-redis:6379/0`. It is **not** reachable from the internet (internal ingress). Redis here has no password because only apps in the environment can reach it; for production use a managed service with auth/TLS.

### Step 6.10 Key Vault (secrets)
**Why:** central, audited, rotatable storage for secrets.
```bash
az keyvault create -g $RG -n $KV -l $LOC --enable-rbac-authorization true

# Allow yourself to manage secrets, and the API identity to read them
az role assignment create --assignee $(az ad signed-in-user show --query id -o tsv) \
  --role "Key Vault Secrets Officer" --scope $(az keyvault show -n $KV --query id -o tsv)
az role assignment create --assignee-object-id $ID_PRINCIPAL --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope $(az keyvault show -n $KV --query id -o tsv)

az keyvault secret set --vault-name $KV --name jwt-secret --value "$(openssl rand -hex 32)"
az keyvault secret set --vault-name $KV --name database-url \
  --value "postgresql+asyncpg://$PGADMIN:$PGPASS@$PG.postgres.database.azure.com:5432/$DBNAME?ssl=require"
```
**Verify:** `az keyvault secret list --vault-name $KV -o table`

---

## Phase 7 — Deploy the application

### Step 7.1 Deploy the API container app
**Why:** this creates the running, internet-facing service.

First fetch the secrets you stored so you can pass them as Container Apps secrets (simple starting approach; Key Vault references come next):
```bash
export DATABASE_URL=$(az keyvault secret show --vault-name $KV --name database-url --query value -o tsv)
export JWT_SECRET=$(az keyvault secret show --vault-name $KV --name jwt-secret --query value -o tsv)

az containerapp create -g $RG -n ca-4to-api --environment $CAENV \
  --image $ACR.azurecr.io/4to-api:$TAG \
  --registry-server $ACR.azurecr.io \
  --user-assigned $ID_RESOURCE --registry-identity $ID_RESOURCE \
  --target-port 8000 --ingress external \
  --cpu 0.5 --memory 1.0Gi --min-replicas 0 --max-replicas 3 \
  --secrets "database-url=$DATABASE_URL" "jwt-secret=$JWT_SECRET" \
  --env-vars APP_ENV=production \
             DATABASE_URL=secretref:database-url \
             JWT_SECRET=secretref:jwt-secret \
             REDIS_URL=redis://ca-4to-redis:6379/0 \
             STORAGE_BACKEND=azure \
             AZURE_STORAGE_ACCOUNT=$SA \
             AZURE_STORAGE_CONTAINER_ORIGINALS=originals \
             AZURE_STORAGE_CONTAINER_THUMBS=thumbnails \
             AZURE_CLIENT_ID=$ID_CLIENT
```
What each flag teaches:
- `--user-assigned/--registry-identity`: pulls from ACR using the identity (no passwords).
- `--ingress external`: gets a public HTTPS URL automatically.
- `--min-replicas 0`: scales to zero when idle (cheap; the first request after idle has a **cold start** delay).
- `--secrets` + `secretref:`: secrets are stored encrypted by the platform and injected as env vars.
- `AZURE_CLIENT_ID`: tells the Azure SDK which identity to use when the app has more than one.

Get the URL:
```bash
export API_URL=$(az containerapp show -g $RG -n ca-4to-api --query properties.configuration.ingress.fqdn -o tsv)
curl https://$API_URL/healthz
```
**Verify:** JSON `{"status":"ok"}` over HTTPS.

**If it breaks**
| Symptom | Likely cause / fix |
|---|---|
| Revision stuck "Provisioning/Failed" | `az containerapp logs show -g $RG -n ca-4to-api --follow` and check *Revisions* in the portal |
| `ImagePullBackOff`/unauthorized | AcrPull role not propagated yet, or wrong identity id; wait 2–5 min, re-check Step 6.5 |
| `exec format error` | Image built for wrong CPU architecture; rebuild with `--platform linux/amd64` |
| App crashes on start | Missing env var (check logs); app listening on wrong port (must match `--target-port`) |
| 502/504 | Container not listening on `0.0.0.0`, or slow cold start |

### Step 7.2 Run migrations against the cloud database
```bash
export DATABASE_URL_LOCAL="postgresql+asyncpg://$PGADMIN:$PGPASS@$PG.postgres.database.azure.com:5432/$DBNAME?ssl=require"
cd services/api
DATABASE_URL=$DATABASE_URL_LOCAL alembic upgrade head
```
(Your PC IP was allowed in Step 6.7.) **Verify:** `psql ... -c "\dt"` shows your tables.

Later you'll move this into a Container Apps **Job** or a CI step so it doesn't depend on your laptop.

### Step 7.3 Deploy the worker
Same image, different start command, **no ingress**:
```bash
az containerapp create -g $RG -n ca-4to-worker --environment $CAENV \
  --image $ACR.azurecr.io/4to-api:$TAG \
  --registry-server $ACR.azurecr.io \
  --user-assigned $ID_RESOURCE --registry-identity $ID_RESOURCE \
  --command "/app/scripts/start-worker.sh" \
  --cpu 0.5 --memory 1.0Gi --min-replicas 1 --max-replicas 2 \
  --secrets "database-url=$DATABASE_URL" \
  --env-vars APP_ENV=production DATABASE_URL=secretref:database-url \
             REDIS_URL=redis://ca-4to-redis:6379/0 STORAGE_BACKEND=azure \
             AZURE_STORAGE_ACCOUNT=$SA AZURE_CLIENT_ID=$ID_CLIENT
```
`min-replicas 1` because a worker that scales to zero can't notice new queue jobs. (Later you can use event-driven scaling rules.)

### Step 7.4 Test the whole flow in the cloud
1. Register a user via `https://$API_URL/docs` (Swagger UI; **disable `/docs` in production** or protect it).
2. Request an upload session → upload a photo with the SAS URL (use `curl -X PUT -H "x-ms-blob-type: BlockBlob" --data-binary @photo.jpg "<sas-url>"` for a quick test).
3. Confirm the blob appears: `az storage blob list --account-name $SA -c originals --auth-mode login -o table`
4. Confirm the worker generated a thumbnail (check `thumbnails` container and logs).
5. Download the original and compare checksums with the file you uploaded:
   ```bash
   sha256sum photo.jpg downloaded.jpg     # must be identical — your core product promise
   ```

### Step 7.5 Read the logs
```bash
az containerapp logs show -g $RG -n ca-4to-api --follow
```
In the portal: *Log Analytics workspace → Logs*, KQL:
```kusto
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "ca-4to-api"
| order by TimeGenerated desc
| take 100
```

### Step 7.6 Rollbacks and new versions
```bash
# Deploy a new version
az containerapp update -g $RG -n ca-4to-api --image $ACR.azurecr.io/4to-api:v2

# See revisions, and roll back by activating an older one / shifting traffic
az containerapp revision list -g $RG -n ca-4to-api -o table
```
You can enable **multiple revision mode** and split traffic (e.g., 10% to the new version) — a "canary" release, a great DevOps concept to practice.

---

## Phase 8 — Custom domain and HTTPS

**Why:** `ca-4to-api.<random>.<region>.azurecontainerapps.io` is fine for testing; real apps use `api.yourdomain.com`.

1. **Buy a domain** (any registrar). For learning you can skip this and use the default URL.
2. **Get the verification values:**
   ```bash
   az containerapp show -g $RG -n ca-4to-api --query properties.customDomainVerificationId -o tsv
   az containerapp show -g $RG -n ca-4to-api --query properties.configuration.ingress.fqdn -o tsv
   ```
3. **Create DNS records** at your registrar:
   - `CNAME  api  →  <the app fqdn>`
   - `TXT    asuid.api  →  <customDomainVerificationId>`
4. **Bind and get a free managed certificate:**
   ```bash
   az containerapp hostname add  -g $RG -n ca-4to-api --hostname api.yourdomain.com
   az containerapp hostname bind -g $RG -n ca-4to-api --hostname api.yourdomain.com \
      --environment $CAENV --validation-method CNAME
   ```
5. **Verify:** `curl -I https://api.yourdomain.com/healthz` and check the padlock.

Concepts you just learned: DNS records, domain ownership verification, TLS certificates, and why mobile apps should only talk to **HTTPS** endpoints (iOS and Android block plain HTTP by default).

---

## Phase 9 — Connect the mobile app

1. Put the API base URL in config, **not hard-coded**:
   `EXPO_PUBLIC_API_URL=https://api.yourdomain.com`
2. Use **EAS Build** (Expo Application Services) to create installable builds:
   ```bash
   npm i -g eas-cli
   eas login
   eas build:configure
   eas build -p android --profile preview      # installable APK for testing
   ```
3. Environment profiles in `eas.json`: `development` (points to local/dev API), `preview` (dev cloud), `production` (prod cloud).
4. **Push notifications:** create a Firebase project, add the Android app, and give Expo/your API the FCM credentials (store in Key Vault, not in the repo). iOS needs an Apple Developer account (paid); you can ship **Android first**.
5. **Publishing:** Google Play Console has a one-time registration fee; internal testing tracks let you distribute to friends before public release. Check current fees on the official pages.
6. Test on a real phone over mobile data (not just Wi-Fi) and test **large batch uploads with a flaky connection** (airplane mode on/off mid-upload) to confirm resume works.

---

## Phase 10 — CI/CD (automate everything)

**Why:** manual commands don't scale and cause "works on my machine" mistakes. CI/CD makes every merge to `main` test, build, and deploy automatically.

### Pipeline shape
```
push to GitHub ─► lint + tests ─► build image ─► push to ACR ─► deploy to Container Apps ─► smoke test /healthz
```

### Step 10.1 Let GitHub log in to Azure without passwords (OIDC)
**Why:** the old way stores a long-lived secret in GitHub. **OIDC federation** lets GitHub request a short-lived token instead.

1. Entra ID → *App registrations* → New (e.g., `4to-github-deployer`).
2. *Certificates & secrets → Federated credentials → Add* → scenario "GitHub Actions deploying Azure resources": org/repo/branch `main`.
3. Give that app **Contributor** on your resource group (least privilege: just the RG):
   ```bash
   az role assignment create --assignee <app-client-id> --role Contributor \
     --scope /subscriptions/<sub-id>/resourceGroups/$RG
   ```
4. In GitHub → Settings → Secrets and variables → Actions, add: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

> Student/school tenants sometimes **don't allow creating app registrations**. If blocked, use a secret-based service principal as a temporary fallback, or continue deploying manually and return to this later.

### Step 10.2 Workflow file `.github/workflows/deploy-api.yml`
```yaml
name: deploy-api
on:
  push:
    branches: [main]
    paths: ["services/api/**"]

permissions:
  id-token: write      # required for OIDC
  contents: read

env:
  ACR: <your-acr-name>
  RG: rg-4to-dev

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r services/api/requirements.txt -r services/api/requirements-dev.txt
      - run: cd services/api && ruff check . && pytest -q

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Build and push image
        run: |
          az acr login --name $ACR
          docker build -t $ACR.azurecr.io/4to-api:${{ github.sha }} services/api
          docker push $ACR.azurecr.io/4to-api:${{ github.sha }}
      - name: Deploy API and worker
        run: |
          az containerapp update -g $RG -n ca-4to-api    --image $ACR.azurecr.io/4to-api:${{ github.sha }}
          az containerapp update -g $RG -n ca-4to-worker --image $ACR.azurecr.io/4to-api:${{ github.sha }}
      - name: Smoke test
        run: |
          FQDN=$(az containerapp show -g $RG -n ca-4to-api --query properties.configuration.ingress.fqdn -o tsv)
          curl --fail --retry 5 --retry-delay 5 https://$FQDN/healthz
```
(Pin the action versions you actually use, and keep the deployer's permissions minimal.)

### Step 10.3 Environments and approvals
Create a `dev` and a `prod` environment in GitHub; require **manual approval** before deploying to `prod`. Branch protection on `main` (PR + passing checks required).

---

## Phase 11 — Monitoring, alerts, and backups

### Step 11.1 Application Insights / OpenTelemetry
**Why:** logs tell you *what happened*; traces tell you *where time was spent* (e.g., a slow `/spaces/{id}/photos` query).
- Add `azure-monitor-opentelemetry` to the API and set `APPLICATIONINSIGHTS_CONNECTION_STRING` as a secret.
- Optionally keep **Sentry** for error grouping (already in the spec).

### Step 11.2 Alerts to create
| Signal | Threshold idea | Why |
|---|---|---|
| API 5xx rate | > 5% for 5 min | Something is broken |
| API latency p95 | > 2 s | Users feel slowness |
| Container restarts | > 3 in 10 min | Crash loop |
| Postgres CPU / storage | > 80% | Capacity |
| Storage account egress | spike | Cost or abuse |
| Budget | 50/80/100% | Money |
Send alerts to email first; Teams/Slack/webhook later.

### Step 11.3 Uptime check
Create an availability test (App Insights or any external monitor) hitting `https://api.yourdomain.com/healthz` every few minutes.

### Step 11.4 Backups and disaster recovery (the "what if" step)
- **PostgreSQL**: Flexible Server has automated backups with point-in-time restore; check the retention days and raise them for prod. **Practice a restore** into a *new* server once — an untested backup is a hope, not a backup.
- **Blob**: enable **soft delete** (Step 6.8) and consider **versioning**; use ZRS/GRS for production photos.
- **Secrets**: Key Vault soft-delete/purge protection is on by default in new vaults (verify).
- Write down: *"If the database is deleted at 3 AM, here are the exact steps to restore it."*

---

## Phase 12 — Security hardening (your networking + cybersecurity playground)

Do these progressively; each is a mini-project.

1. **Private networking**
   - Create a **VNet** with subnets; deploy the Container Apps environment into it (VNet-integrated).
   - Switch PostgreSQL to **private access** (delegated subnet) or a **private endpoint**; remove the "allow Azure services" rule.
   - Put Blob Storage behind a **private endpoint** for the API/worker path. Note: phones upload via SAS URLs over the public endpoint, so keep the public endpoint enabled but restricted by SAS/RBAC, **or** front it with Azure Front Door.
   - Learn: address spaces/CIDR, subnet delegation, private DNS zones (`privatelink.*`), NSG rules.
2. **Edge protection**: **Azure Front Door + WAF** in front of the API (DDoS filtering, rate limiting, bot rules, managed rule sets).
3. **Identity**
   - Use a **separate least-privilege DB user** for the app.
   - Move secrets to **Key Vault references** in Container Apps so secrets aren't copied into app config.
   - Rotate `JWT_SECRET` and DB passwords on a schedule; consider **Entra ID auth for PostgreSQL** to remove DB passwords entirely.
4. **Supply chain**: enable **Defender for Containers / image scanning**, pin base-image versions, run `pip-audit` and `trivy` in CI, keep dependencies updated (Dependabot).
5. **Data protection**: HTTPS only, TLS 1.2+, encryption at rest (default), consider **customer-managed keys** later; honor account deletion (Step in spec §14) including blobs.
6. **Application security**: test for OWASP API Top 10 issues (broken object-level authorization is the big one for a photo app: *can user A fetch user B's photo ID?*). Write automated tests for those exact cases.
7. **Audit**: enable diagnostic settings so Storage, Key Vault, and PostgreSQL logs flow to Log Analytics. Query for suspicious activity.
8. **Policy**: tag/budget/policy guardrails with **Azure Policy** (e.g., deny public blob access).

---

## Phase 13 — Infrastructure as Code (Bicep) — make it repeatable

**Why:** if your whole setup lives in files, you can rebuild or clone it (dev → staging → prod) in minutes and review infrastructure changes in pull requests.

Learning path:
1. Take what you built with `az` commands and re-express each resource in **Bicep** (`infra/main.bicep` with modules: `registry`, `database`, `storage`, `containerapps`, `keyvault`).
2. Use parameters per environment (`dev.bicepparam`, `prod.bicepparam`).
3. Deploy: `az deployment group create -g $RG -f infra/main.bicep -p infra/dev.bicepparam`
4. Preview changes first: `az deployment group what-if ...`
5. Optional alternative: **Terraform** (cloud-agnostic and widely used in industry).
6. Optional shortcut to study: **Azure Developer CLI (`azd`)** templates, which bundle infra + app deployment.

Good practice: destroy and rebuild the dev environment from code once, to **prove** nothing lives only in your head or in the portal.

---

## Phase 14 — Scaling and performance notes

- **API scaling**: add an HTTP concurrency rule (e.g., scale out at N concurrent requests). Keep `max-replicas` bounded to cap cost.
- **Cold starts**: set `min-replicas 1` on prod API for consistent latency.
- **Database**: add indexes from the spec (§12); use connection pooling (PgBouncer is built in to Flexible Server) and limit pool sizes per replica so many replicas don't exhaust connections.
- **Thumbnails**: serve thumbnails via short-lived SAS URLs or a **CDN** (Azure Front Door/CDN) to cut latency and egress cost.
- **Zip downloads**: generate in the worker and write to a temporary blob with an expiry/lifecycle rule; don't build zips in the API request.
- **Load test** (k6 or Locust) with realistic upload batches before launch.

---

## Phase 15 — Cleanup and cost hygiene

End of a study session:
```bash
# Pause the database (stops compute billing; storage still billed; it auto-restarts after a limited period)
az postgres flexible-server stop -g $RG -n $PG

# Scale the apps to zero
az containerapp update -g $RG -n ca-4to-worker --min-replicas 0
```
Done with the experiment entirely:
```bash
az group delete --name $RG --yes --no-wait
```
Also check *Cost Management → Cost analysis* weekly, grouped by resource, to see what's actually costing money.

---

## Phase 16 — Troubleshooting playbook

| Problem | First checks |
|---|---|
| `az` command says resource provider not registered | Step 2.4 |
| `NameAlreadyExists`/invalid name | Names for ACR/Storage/Key Vault/Postgres are **globally unique** with strict character rules (Step 2.6) |
| `RequestDisallowedByAzure` / region errors | Student subscription region policy → choose an allowed region |
| `AuthorizationFailed` / 403 | Missing RBAC role or it hasn't propagated yet (wait a few minutes); confirm you're in the right subscription |
| App can't read/write blobs | Role `Storage Blob Data Contributor` on the *identity*; `AZURE_CLIENT_ID` env var set; container names correct |
| App can't connect to Postgres | Firewall rule, `ssl=require`, correct host name, password with special characters URL-encoded |
| `citext` errors | Extension not allow-listed or not created (Step 6.7) |
| Uploads work via curl but fail from the phone | Wrong SAS permissions/expiry, clock skew, missing `x-ms-blob-type` header, mixed content/HTTP |
| Chat messages arrive only sometimes | Multiple replicas without Redis pub/sub |
| Cold, slow first request | `min-replicas 0`; set to 1 for production |
| Mystery crashes | `az containerapp logs show`, then KQL; check memory limits (OOM) when processing large images |
| Unexpected bill | Cost analysis by resource; usually Postgres left running, a larger SKU, or high egress |

General debugging habit: **read the error message fully, check logs, change one thing at a time, and write down the fix** in a `docs/runbook.md`.

---

## Phase 17 — Go-live checklist

**Security**
- [ ] No secrets in git, images, or logs; secrets in Key Vault/secret store
- [ ] HTTPS only; custom domain + valid certificate
- [ ] `/docs` and debug endpoints disabled or protected
- [ ] DB not open to the world (private access or tight firewall); app uses its own least-privilege DB user
- [ ] Blob public access disabled; SAS URLs short-lived (≤15 min)
- [ ] Authorization tests prove users can't access others' private-tree photos
- [ ] Rate limits and upload limits enabled

**Reliability**
- [ ] Health probes configured; min replicas appropriate
- [ ] DB backups verified by an actual restore test
- [ ] Blob soft delete on; redundancy level chosen deliberately
- [ ] Rollback procedure tested (previous revision/image tag)

**Operations**
- [ ] Logs, traces, and alerts working (try triggering one on purpose)
- [ ] Budget alerts active; cost reviewed
- [ ] CI/CD deploys from `main` with a manual prod approval
- [ ] Runbook written (restore DB, rotate secrets, roll back, scale up)

**Product/legal**
- [ ] Privacy Policy and Terms (the app stores personal photos)
- [ ] Account deletion removes DB rows *and* blobs
- [ ] Data region choice documented (users may ask where photos live)
- [ ] Store listing assets: icon, screenshots, description (uses the `.4to` lime/white/black brand)

---

## Phase 18 — Suggested learning milestones

| Level | Milestone | Skills gained |
|---|---|---|
| 1 | Hello-world container on Container Apps with HTTPS URL | Docker, ACR, ingress |
| 2 | Real API + Postgres + Blob working in the cloud | Networking basics, secrets, RBAC, managed identity |
| 3 | CI/CD with GitHub Actions + OIDC | Pipelines, automation |
| 4 | Observability: logs, KQL, alerts, dashboards | Monitoring/SRE basics |
| 5 | Private networking: VNet, private endpoints, WAF | Cloud networking & security |
| 6 | Everything as Bicep/Terraform; rebuild from scratch | Infrastructure as Code |
| 7 | (Later) Move to AKS or add Front Door + CDN, multi-region DR | Advanced platform engineering |

Helpful official resources (search these titles on Microsoft Learn): *Azure Container Apps documentation*, *Azure Database for PostgreSQL Flexible Server documentation*, *Azure Blob Storage — user delegation SAS*, *Azure Well-Architected Framework*, *Bicep documentation*, plus the certification path **AZ-900 → AZ-104 → AZ-400** if you want credentials in cloud/DevOps.

---

## Appendix A — Command cheat sheet

```bash
az login | az account show | az account set --subscription <id>
az group create / show / delete
az acr create / login / repository list
az containerapp create / update / show / delete
az containerapp logs show -g $RG -n <app> --follow
az containerapp revision list -g $RG -n <app> -o table
az containerapp env create / show
az postgres flexible-server create / stop / start / show / firewall-rule create
az storage account create | az storage container create | az storage blob list
az keyvault create | az keyvault secret set/show/list
az role assignment create --assignee ... --role ... --scope ...
az identity create / show
az monitor log-analytics workspace create
az deployment group create / what-if        # Bicep
```

## Appendix B — Resource naming reference

| Resource | Pattern | Rules |
|---|---|---|
| Resource group | `rg-4to-<env>` | Unique within subscription |
| Container registry | `acr4to<env><sfx>` | Global, lowercase letters/digits only |
| Storage account | `st4to<env><sfx>` | Global, 3–24, lowercase letters/digits |
| Key Vault | `kv-4to-<env>-<sfx>` | Global, 3–24, letters/digits/hyphens |
| PostgreSQL server | `pg-4to-<env>-<sfx>` | Global, lowercase, digits, hyphens |
| Container Apps env | `cae-4to-<env>` | Per resource group |
| Container app | `ca-4to-<role>` | Per resource group |
| Managed identity | `id-4to-api-<env>` | Per resource group |

## Appendix C — Mapping `.4to` spec → Azure decisions

| Spec item | Azure decision |
|---|---|
| S3-compatible storage + presigned multipart | Azure Blob + user delegation SAS + block upload (+ `StorageBackend` abstraction) |
| MinIO in Docker Compose | Azurite (or keep MinIO behind the abstraction) |
| Redis | Redis container app (dev) → Azure Managed Redis (prod) |
| Celery workers | Second Container App using the same image |
| JWT secret, DB URL, FCM creds | Key Vault → Container Apps secrets/references |
| Sentry/monitoring | Application Insights + Log Analytics (+ Sentry) |
| Hosting (Fly/Railway/VPS) | Azure Container Apps |
| Reminders scheduler | Celery beat as a single-replica app, or Container Apps **Jobs** on a cron schedule |

## Appendix D — A realistic "first week" plan

1. **Day 1:** Account, budget alert, CLI, providers, variables (Phases 1–3).
2. **Day 2–3:** Make the app deploy-ready; production Dockerfile; run it locally from the image (Phase 4).
3. **Day 4:** Hello-world on Azure (Phase 5).
4. **Day 5:** Registry, Postgres, Storage, Key Vault, identity (Phase 6).
5. **Day 6:** Deploy API + worker, run migrations, test an upload end-to-end (Phase 7).
6. **Day 7:** Logs, budget review, tear down or pause everything; write what you learned in `docs/runbook.md`.

Then continue with domain, mobile build, CI/CD, and security hardening at your own pace.
