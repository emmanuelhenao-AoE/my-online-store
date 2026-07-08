pipeline {
  agent {
    docker {
      image 'node:20-alpine'
      args '-u root'
    }
  }

  options {
    timestamps()
    timeout(time: 15, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
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
  }

  post {
    failure {
      echo "BUILD FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
      echo "Open console: ${env.BUILD_URL}"
      // Uncomment after Slack is configured in Jenkins:
      // slackSend(
      //   channel: '#ci-alerts',
      //   color: 'danger',
      //   message: "❌ ${env.JOB_NAME} #${env.BUILD_NUMBER} failed on ${env.BRANCH_NAME ?: 'unknown'}\n${env.BUILD_URL}"
      // )
    }
    success {
      echo "BUILD PASSED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    }
  }
}
