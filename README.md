# My Online Store

Demo storefront for learning **CI/CD** with GitHub, Jenkins (Docker Desktop), and Slack.

## What you can do in the site

- Browse products
- Add items to a cart (stock limits enforced)
- See tax (7%) and shipping ($5.99, free at $75+)
- Validate a checkout form (name, email, address, ZIP)

Business logic lives in `src/` and is covered by automated tests in `tests/`.

## Quick start

```bash
npm install
npm test
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## How this CI/CD flow works

```text
You commit to a secondary branch (feature/*, fix/*, etc.)
        ↓
GitHub notifies Jenkins (webhook or Multibranch scan)
        ↓
Jenkins runs:  npm ci  →  npm test
        ↓
   ┌────┴────┐
 fail       pass
   ↓          ↓
 Slack ❌   merge branch → master and push
            Slack ✅
        ↓
GitHub Pages updates from master (your live site)
```

- **Failing tests:** Slack gets a failure message; `master` is left alone.
- **Passing tests:** Slack gets a success message; Jenkins merges the branch into `master`.
- Pushing directly to `master` still runs tests + Slack, but does **not** merge (avoids loops).

---

## 1. Run tests locally (same as Jenkins)

```bash
npm test
```

Tests live in `tests/store.test.js` (18 checks).

---

## 2. Start Jenkins on Docker Desktop

1. Start [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. From this project folder:

```bash
docker compose up -d --build
```

3. Open [http://localhost:8080](http://localhost:8080).
4. Unlock with:

```bash
docker exec my-online-store-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

5. Install **suggested plugins**, then also install:
   - **Pipeline: Multibranch**
   - **GitHub Branch Source** (or GitHub plugin)
6. Create your admin user.

---

## 3. Add Jenkins credentials

**Manage Jenkins → Credentials → (global) → Add Credentials**

### A) GitHub push token — ID: `github-push`

| Field | Value |
|-------|--------|
| Kind | Username with password |
| Username | your GitHub username |
| Password | a [Personal Access Token](https://github.com/settings/tokens) with **`repo`** scope |
| ID | `github-push` |

### B) Slack webhook — ID: `slack-webhook`

1. In Slack: create an [Incoming Webhook](https://api.slack.com/messaging/webhooks) for a channel (e.g. `#ci-alerts`).
2. In Jenkins:

| Field | Value |
|-------|--------|
| Kind | Secret text |
| Secret | the webhook URL (`https://hooks.slack.com/services/...`) |
| ID | `slack-webhook` |

---

## 4. Create a Multibranch Pipeline job

1. **New Item → Multibranch Pipeline** (name e.g. `my-online-store`).
2. **Branch Sources → Add source → GitHub** (or Git):
   - Owner / Repository: `emmanuelhenao-AoE/my-online-store`
   - Credentials: `github-push` (or browse token)
3. **Build Configuration:** by Jenkinsfile, path `Jenkinsfile`.
4. **Scan Multibranch Pipeline Triggers:** periodically (e.g. 1 minute) **or** add a GitHub webhook (below).
5. Save → Jenkins discovers branches and builds them.

### Optional: GitHub webhook (instant builds)

Repo → **Settings → Webhooks → Add webhook**

- Payload URL: `http://YOUR_PUBLIC_JENKIN_URL/github-webhook/`  
  (From a home PC you need a tunnel such as [ngrok](https://ngrok.com/) → `https://xxxx.ngrok.io/github-webhook/`)
- Content type: `application/json`
- Events: **Just the push event**

Without a public URL, use **Scan Multibranch Pipeline Now** after each push, or the periodic scan.

---

## 5. Practice the full loop

```bash
git checkout -b feature/demo-change
# edit something small (keep tests green)
git add .
git commit -m "demo: small safe change"
git push -u origin feature/demo-change
```

Then in Jenkins: scan/build that branch.

**Expect:** tests green → branch merged into `master` → Slack success.

To see failure:

1. Change an `expect(...)` in `tests/store.test.js` so it fails.
2. Commit + push to a feature branch.
3. **Expect:** Slack failure; `master` unchanged.

---

## GitHub Pages (the live site)

| URL | What you see |
|-----|----------------|
| `https://github.com/emmanuelhenao-AoE/my-online-store` | Repository (code + README) |
| `https://emmanuelhenao-AoE.github.io/my-online-store/` | Hosted website |

Pages settings: **Settings → Pages → Deploy from a branch → `master` / root**.

After a green merge to `master`, refresh the `*.github.io` URL to see the update.

---

## Project layout

```text
my-online-store/
  index.html / app.js / styles.css   # website UI
  src/                               # cart, products, validation
  tests/store.test.js                # Vitest suite (npm test)
  Jenkinsfile                        # test → merge → Slack
  jenkins/Dockerfile                 # Jenkins image with Node 20
  docker-compose.yml
```

## Important notes

- Credential IDs in Jenkins **must** be exactly `github-push` and `slack-webhook` (see `Jenkinsfile`).
- Prefer working on **feature branches**, not directly on `master`, so the auto-merge path is exercised.
- Auto-merge will fail if Git has real conflicts — resolve them on the feature branch and push again.
- This lab uses **Jenkins merge-to-master**. Many teams instead use **Pull Requests + required checks** (no auto-merge). Both demonstrate CI/CD; PR protection is more common in industry.
