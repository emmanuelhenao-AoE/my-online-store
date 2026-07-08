/**
 * CI/CD pipeline for my-online-store
 *
 * Intended setup: Multibranch Pipeline scanning this GitHub repo.
 *
 * Feature / secondary branches:
 *   1. Checkout the branch commit
 *   2. npm ci + npm test
 *   3. If green → merge that branch into master and push to GitHub
 *   4. Slack: success or failure
 *
 * master / main:
 *   1. Run tests only (no merge — avoids loops)
 *   2. Slack: success or failure
 *
 * Required Jenkins credentials (Manage Jenkins → Credentials):
 *   github-push     → Username + password (GitHub username + PAT with "repo" scope)
 *   slack-webhook   → Secret text (Slack Incoming Webhook URL)
 */

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  environment {
    // Change if you fork the repo
    GITHUB_REPO = 'emmanuelhenao-AoE/my-online-store'
    // Branch that receives merges after green tests
    TARGET_BRANCH = 'master'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          // Normalize branch name across Multibranch / single Pipeline jobs
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

            # Authenticated remote for fetch/push
            git remote set-url origin \
              "https://${GIT_USER}:${GIT_PASS}@github.com/${GITHUB_REPO}.git"

            git fetch origin

            # Bring in latest master, then merge the branch Jenkins just tested
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
          ? "Tests passed. Merged *${env.CURRENT_BRANCH}* → *${env.TARGET_BRANCH}*."
          : "Tests passed on *${env.CURRENT_BRANCH}* (no merge)."
        notifySlack('good', "✅ *${env.JOB_NAME}* #${env.BUILD_NUMBER}\n${detail}\n${env.BUILD_URL}")
      }
    }
    failure {
      script {
        notifySlack(
          'danger',
          "❌ *${env.JOB_NAME}* #${env.BUILD_NUMBER}\nTests or merge failed on *${env.CURRENT_BRANCH}*. Master was NOT updated.\n${env.BUILD_URL}"
        )
      }
    }
  }
}

/**
 * Posts to a Slack Incoming Webhook stored as secret-text credential `slack-webhook`.
 * Escapes text lightly so branch names with quotes do not break JSON.
 */
void notifySlack(String color, String text) {
  withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_WEBHOOK')]) {
    def safe = text
      .replace('\\', '\\\\')
      .replace('"', '\\"')
      .replace('\n', '\\n')
    sh """
      curl -sS -X POST -H 'Content-type: application/json' \
        --data '{"attachments":[{"color":"${color}","mrkdwn_in":["text"],"text":"${safe}"}]}' \
        "\$SLACK_WEBHOOK"
    """
  }
}
