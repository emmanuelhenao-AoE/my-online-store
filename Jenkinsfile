/**
 * CI/CD pipeline for my-online-store
 *
 * Feature / secondary branches:
 *   1. Checkout → npm ci → npm test
 *   2. If green → merge into master and push
 *   3. Email: success or failure
 *
 * master:
 *   1. Run tests only (no merge)
 *   2. Email: success or failure
 *
 * Jenkins credentials:
 *   github-push → GitHub username + PAT (repo scope)
 *
 * Jenkins system config (Manage Jenkins → System → E-mail Notification):
 *   SMTP server, port, TLS, username, password (see README)
 */

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    GITHUB_REPO = 'emmanuelhenao-AoE/my-online-store'
    TARGET_BRANCH = 'master'
    // Change to your inbox — Jenkins sends build alerts here
    NOTIFY_EMAIL = 'emmanuel.estrada@arrayofengineers.com'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.CURRENT_BRANCH = env.BRANCH_NAME ?: env.GIT_BRANCH?.replaceFirst(/^origin\//, '') ?: 'unknown'
          echo "Building branch: ${env.CURRENT_BRANCH}"
        }
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Test') {
      steps {
        sh 'npm test'
      }
    }

    stage('Merge to master') {
      when {
        allOf {
          expression { env.CURRENT_BRANCH != env.TARGET_BRANCH }
          expression { env.CURRENT_BRANCH != 'main' }
          expression { env.CURRENT_BRANCH != 'unknown' }
        }
      }
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'github-push',
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_PASS'
          )
        ]) {
          sh '''
            set -e

            git config user.email "jenkins-ci@users.noreply.github.com"
            git config user.name "Jenkins CI"

            git remote set-url origin \
              "https://${GIT_USER}:${GIT_PASS}@github.com/${GITHUB_REPO}.git"

            git fetch --no-tags origin \
              "+refs/heads/${TARGET_BRANCH}:refs/remotes/origin/${TARGET_BRANCH}"
            git fetch --no-tags origin \
              "+refs/heads/${CURRENT_BRANCH}:refs/remotes/origin/${CURRENT_BRANCH}"

            git checkout -B "${TARGET_BRANCH}" "origin/${TARGET_BRANCH}"
            git merge --no-ff "origin/${CURRENT_BRANCH}" \
              -m "ci: merge ${CURRENT_BRANCH} after green tests (#${BUILD_NUMBER})"

            git push origin "HEAD:${TARGET_BRANCH}"

            echo "Merged ${CURRENT_BRANCH} → ${TARGET_BRANCH} and pushed."
          '''
        }
      }
    }
  }

  post {
    success {
      script {
        def merged = (env.CURRENT_BRANCH != env.TARGET_BRANCH && env.CURRENT_BRANCH != 'main')
        def detail = merged
          ? "Tests passed. Merged ${env.CURRENT_BRANCH} → ${env.TARGET_BRANCH}."
          : "Tests passed on ${env.CURRENT_BRANCH} (no merge)."
        notifyEmail(
          "[CI PASS] ${env.JOB_NAME} #${env.BUILD_NUMBER}",
          """Build succeeded.

${detail}

Branch: ${env.CURRENT_BRANCH}
Build:  ${env.BUILD_URL}
"""
        )
      }
    }
    failure {
      script {
        notifyEmail(
          "[CI FAIL] ${env.JOB_NAME} #${env.BUILD_NUMBER}",
          """Build failed.

Tests or merge failed on ${env.CURRENT_BRANCH}.
Master was NOT updated.

Build: ${env.BUILD_URL}
"""
        )
      }
    }
  }
}

/**
 * Sends email via Jenkins mailer (requires SMTP in Manage Jenkins → System).
 * Skips gracefully if NOTIFY_EMAIL is empty or SMTP is not configured.
 */
void notifyEmail(String subject, String body) {
  def to = env.NOTIFY_EMAIL?.trim()
  if (!to) {
    echo "Email skipped: set NOTIFY_EMAIL in Jenkinsfile."
    return
  }

  try {
    mail to: to,
         subject: subject,
         body: body
    echo "Email sent to ${to}"
  } catch (err) {
    echo "Email failed (check SMTP under Manage Jenkins → System): ${err}"
  }
}
