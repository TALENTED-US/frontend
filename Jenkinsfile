pipeline {
    agent any

    environment {
        NGINX_HOST = credentials('nginx-ec2-host')
        DEPLOY_DIR = '/var/www/buttie'
    }

    stages {
        stage('Build') {
            steps {
                sh '''
                    npm ci
                    npm run build
                '''
            }
        }

        stage('Deploy') {
            steps {
                sshagent(credentials: ['nginx-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=accept-new ubuntu@$NGINX_HOST \
                          "rm -rf ${DEPLOY_DIR:?}/*"

                        scp -o StrictHostKeyChecking=accept-new -r dist/. \
                          ubuntu@$NGINX_HOST:$DEPLOY_DIR/
                    '''
                }
            }
        }
    }
    post {
    success {
        withCredentials([string(
            credentialsId: 'slack-webhook-fe',
            variable: 'SLACK_WEBHOOK'
        )]) {
            sh """
                curl -sS -X POST \
                  -H 'Content-Type: application/json' \
                  --data '{"text":"✅ Buttie Frontend 배포 성공\\n빌드: #${env.BUILD_NUMBER}\\n로그: ${env.BUILD_URL}console"}' \
                  "\$SLACK_WEBHOOK"
            """
        }
    }

    failure {
        withCredentials([string(
            credentialsId: 'slack-webhook-fe',
            variable: 'SLACK_WEBHOOK'
        )]) {
            sh """
                curl -sS -X POST \
                  -H 'Content-Type: application/json' \
                  --data '{"text":"❌ Buttie Frontend 배포 실패\\n빌드: #${env.BUILD_NUMBER}\\n로그: ${env.BUILD_URL}console"}' \
                  "\$SLACK_WEBHOOK"
            """
        }
    }
}
}
