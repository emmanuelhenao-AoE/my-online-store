# My Online Store

Demo storefront for learning **CI/CD** with GitHub, Jenkins (Docker Desktop), tests, and later Slack.

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

Then open [http://localhost:3000](http://localhost:3000).

## GitHub repo vs live website

| URL | What you see |
|-----|----------------|
| `https://github.com/USER/my-online-store` | The **repository** (code + this README). Normal. |
| `https://USER.github.io/my-online-store/` | The **hosted website** (GitHub Pages). |

Pages must publish the branch that contains root `index.html` (this repo uses `master`):

1. Repo **Settings → Pages → Build and deployment**
2. Source: **Deploy from a branch**
3. Branch: **master** / folder: **/ (root)**
4. Wait a minute, hard-refresh the `*.github.io` URL

(Optional alternative: Source **GitHub Actions**, which uses `.github/workflows/deploy-pages.yml`.)

## Push to GitHub

Create an empty repo on GitHub named `my-online-store`, then:

```bash
git add .
git commit -m "Initial commit: demo store with cart, checkout tests, and Jenkins pipeline"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-online-store.git
git push -u origin main
```

## Run tests (what Jenkins will run)

```bash
npm test
```

To practice a **failing** build: temporarily break an assertion in `tests/store.test.js`, commit, and watch Jenkins go red.

## Jenkins on Docker Desktop

1. Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. From this project folder:

```bash
docker compose up -d
```

3. Open [http://localhost:8080](http://localhost:8080).
4. Get the initial admin password:

```bash
docker exec my-online-store-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

5. Install suggested plugins, create an admin user.
6. Create a **Pipeline** job:
   - Definition: **Pipeline script from SCM**
   - SCM: Git → your GitHub repo URL
   - Script path: `Jenkinsfile`
7. Click **Build Now**. Green = tests passed.

Slack alerts are commented out in `Jenkinsfile` until you configure the Slack plugin and webhook.

## Project layout

```text
my-online-store/
  index.html        # website UI (repo root = GitHub Pages site)
  app.js
  styles.css
  src/              # cart, products, validation, money formatting
  tests/            # Vitest suite (npm test)
  Jenkinsfile       # CI pipeline
  docker-compose.yml
```

## Next steps (after first green build)

1. Connect GitHub webhook so every push triggers Jenkins.
2. Uncomment `slackSend` in `Jenkinsfile` and configure Slack credentials.
3. Protect `main` with a required status check, or only deploy when Jenkins is green.
