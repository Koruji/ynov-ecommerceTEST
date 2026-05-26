pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/Koruji/ynov-ecommerceTEST.git', branch: 'main'
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }

    post {
        success {
            echo 'Pipeline OK - lint et tests passés'
        }
        failure {
            echo 'Pipeline FAILED - vérifie les logs'
        }
    }
}