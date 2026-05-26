pipeline {
    agent any

    tools {
        nodejs 'node18'
    }

    environment {
        SONAR_TOKEN = credentials('sonarcloud-token')
    }

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

        stage('SonarCloud Analysis') {
            steps {
                withSonarQubeEnv('SonarCloud') {
                    sh '''
                        npx sonar-scanner \
                          -Dsonar.projectKey=Koruji_ynov-ecommerceTEST \
                          -Dsonar.organization=cottin \
                          -Dsonar.sources=src \
                          -Dsonar.host.url=https://sonarcloud.io
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline OK - lint, tests et analyse Sonar passés'
        }
        failure {
            echo 'Pipeline FAILED - vérifie les logs'
        }
    }
}