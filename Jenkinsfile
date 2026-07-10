/**
 * CI/CD pipeline for my-online-store
 *
 * Feature / secondary branches:
 *   1. Checkout → npm ci → npm test
 *   2. If green → merge into master and push
 *   3. Email on failure only (pass = no email)
 *
 * Jenkins credentials:
 *   github-push → GitHub username + PAT (repo scope)
 *
 * Gmail SMTP (Manage Jenkins → System → E-mail Notification):
 *   smtp.gmail.com:587, TLS, your Gmail + App Password
 *   System Admin e-mail address = same Gmail
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
    // Your personal inbox — Jenkins sends alerts here
    NOTIFY_EMAIL = 'emmanuelhenao0816@gmail.com'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.CURRENT_BRANCH = env.BRANCH_NAME ?: env.GIT_BRANCH?.replaceFirst(/^origin\//, '') ?: 'unknown'
          echo "Building branch: ${env.CURRENT_BRANCH}"

          // Stop the baseline feedback loop: Jenkins commits build-info.json to master,
          // which must NOT trigger another baseline publish.
          def lastMsg = sh(script: 'git log -1 --pretty=%s', returnStdout: true).trim()
          if (lastMsg.startsWith('ci: update production baseline')) {
            echo "Skipping build — commit is an automated baseline update (${lastMsg})."
            env.SKIP_PIPELINE = 'true'
          } else {
            env.SKIP_PIPELINE = 'false'
          }
        }
      }
    }

    stage('Install') {
      when { expression { env.SKIP_PIPELINE != 'true' } }
      steps {
        sh 'npm ci'
      }
    }

    stage('Test') {
      when { expression { env.SKIP_PIPELINE != 'true' } }
      steps {
        sh '''
          mkdir -p test-results
          set -o pipefail
          npm test 2>&1 | tee test-results/console.txt
        '''
      }
    }

    stage('Merge to master') {
      when {
        allOf {
          expression { env.SKIP_PIPELINE != 'true' }
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

    // Only after a feature-branch merge — NEVER on master builds (that caused the loop).
    stage('Publish baseline') {
      when {
        allOf {
          expression { env.SKIP_PIPELINE != 'true' }
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

            git checkout -B "${TARGET_BRANCH}" "origin/${TARGET_BRANCH}"

            export BRANCH_NAME="${TARGET_BRANCH}"
            node scripts/generate-build-info.mjs

            if git diff --quiet -- build-info.json && git ls-files --error-unmatch build-info.json >/dev/null 2>&1; then
              echo "build-info.json unchanged — skip commit."
              exit 0
            fi

            git add build-info.json
            git commit -m "ci: update production baseline (${BUILD_NUMBER})"
            git pull --rebase origin "${TARGET_BRANCH}"
            git push origin "HEAD:${TARGET_BRANCH}"

            echo "Production baseline published to master."
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Build passed on ${env.CURRENT_BRANCH} — no email sent (failures only)."
    }
    failure {
      script {
        def feature = isFeatureBranch()
        def failureDetails = summarizeFailures()

        def body = """Build FAILED on branch: ${env.CURRENT_BRANCH}

"""
        if (feature) {
          body += """Note: If tests passed but Publish baseline failed, your code may already be on master.
Check GitHub master and the Jenkins console for the exact stage that failed.

"""
        } else {
          body += """master branch build failed — review before deploying.

"""
        }

        body += """What failed:
${failureDetails}

Full build log:
${env.BUILD_URL}
"""
        def subject = feature
          ? "[CI FAIL] ${env.CURRENT_BRANCH} — build failed"
          : "[CI FAIL] master — build failed"

        notifyEmail(subject, body)
      }
    }
  }
}

boolean isFeatureBranch() {
  return env.CURRENT_BRANCH != env.TARGET_BRANCH &&
    env.CURRENT_BRANCH != 'main' &&
    env.CURRENT_BRANCH != 'unknown'
}

/**
 * Pull failed test names/messages from JUnit XML or Vitest console output.
 */
String summarizeFailures() {
  def lines = []

  if (fileExists('test-results/junit.xml')) {
    def xml = readFile('test-results/junit.xml')
    def matcher = (xml =~ /<testcase[^>]*classname="([^"]*)"[^>]*name="([^"]*)"[^>]*>[\s\S]*?<failure[^>]*message="([^"]*)"/)
    while (matcher.find()) {
      def suite = matcher.group(1)
      def testName = matcher.group(2)
      def message = matcher.group(3).replaceAll('&quot;', '"').replaceAll('&amp;', '&').take(240)
      lines << "- ${suite} > ${testName}\n  ${message}"
    }
    matcher = null
  }

  if (lines.isEmpty() && fileExists('test-results/console.txt')) {
    def consoleLines = readFile('test-results/console.txt').readLines()
    consoleLines.eachWithIndex { line, idx ->
      if (line =~ /\sFAIL\s+/ || line.contains(' FAIL  ')) {
        lines << "- ${line.trim()}"
        if (idx + 1 < consoleLines.size()) {
          def next = consoleLines[idx + 1]
          if (next.contains('AssertionError') || next.contains('Expected') || next.contains('expected')) {
            lines << "  ${next.trim()}"
          }
        }
      }
    }
  }

  if (lines.isEmpty()) {
    return 'Could not parse test output. Tests may have passed but a later stage failed (e.g. merge). Check the Jenkins console log.'
  }

  return lines.take(8).join('\n')
}

void notifyEmail(String subject, String body) {
  def to = env.NOTIFY_EMAIL?.trim()
  if (!to || to.contains('YOUR_GMAIL')) {
    echo "Email skipped: set NOTIFY_EMAIL in Jenkinsfile to your personal Gmail."
    return
  }

  try {
    mail to: to,
         subject: subject,
         body: body
    echo "Email sent to ${to}"
  } catch (err) {
    echo "Email failed (configure Gmail SMTP under Manage Jenkins → System): ${err}"
  }
}
