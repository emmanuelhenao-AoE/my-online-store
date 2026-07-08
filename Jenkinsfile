/**
 * CI/CD pipeline for my-online-store
 *
 * Feature / secondary branches:
 *   1. Checkout → npm ci → npm test
 *   2. If green → merge into master and push
 *   3. Email on pass or fail (fail includes which test broke)
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
    NOTIFY_EMAIL = 'emmanuelhenaoestrada@gmail.com'
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
        def merged = isFeatureBranch()
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
        def merged = isFeatureBranch()
        def failureDetails = summarizeFailures()

        def body = """Build FAILED on branch: ${env.CURRENT_BRANCH}

"""
        if (merged) {
          body += """*** MASTER WAS NOT UPDATED ***
Your changes on "${env.CURRENT_BRANCH}" were NOT merged to master.
The live site (GitHub Pages) is unchanged.

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
        def subject = merged
          ? "[CI FAIL] ${env.CURRENT_BRANCH} — tests failed, master NOT updated"
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
