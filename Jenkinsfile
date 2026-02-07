pipeline {
    agent any

    parameters {
        choice(
            name: 'BRANCH_NAME',
            choices: ['main', 'develop', 'staging', 'production'],
            description: 'Branch to deploy'
        )
        string(
            name: 'CUSTOM_BRANCH',
            defaultValue: '',
            description: 'Optional override branch'
        )
    }

    environment {
        GIT_BRANCH = "${params.CUSTOM_BRANCH ?: params.BRANCH_NAME}"
    }

    stages {

        stage("Checkout") {
            steps {
                withCredentials([
                    string(credentialsId: 'GITHUB_REPO_URL', variable: 'REPO_URL')
                ]) {
                    git branch: "${env.GIT_BRANCH}",
                        url: "${REPO_URL}"
                }
            }
        }

        stage("Build Images") {
            steps {
                sh '''
                  docker build -t mern-backend:${BUILD_NUMBER} backend/
                  docker build -t mern-frontend:${BUILD_NUMBER} frontend/
                '''
            }
        }

        stage("Security Scan") {
            steps {
                sh '''
                  trivy image --severity CRITICAL --exit-code 1 \
                    mern-backend:${BUILD_NUMBER}
                  trivy image --severity CRITICAL --exit-code 1 \
                    mern-frontend:${BUILD_NUMBER}
                '''
            }
        }

        stage("Package Images") {
            steps {
                sh '''
                  docker save mern-backend:${BUILD_NUMBER} -o backend-${BUILD_NUMBER}.tar
                  docker save mern-frontend:${BUILD_NUMBER} -o frontend-${BUILD_NUMBER}.tar
                '''
            }
        }

        stage("Upload to EC2") {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'remote_ssh_key',
                        keyFileVariable: 'SSH_KEY'
                    ),
                    string(
                        credentialsId: 'remote_server_ip',
                        variable: 'EC2_IP'
                    )
                ]) {
                    sh '''
                      scp -i $SSH_KEY -o StrictHostKeyChecking=no \
                        backend-${BUILD_NUMBER}.tar frontend-${BUILD_NUMBER}.tar \
                        ubuntu@$EC2_IP:/home/ubuntu/mern/
                    '''
                }
            }
        }

        stage("Deploy with Rollback") {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'remote_ssh_key',
                        keyFileVariable: 'SSH_KEY'
                    ),
                    string(credentialsId: 'remote_server_ip', variable: 'EC2_IP'),
                    string(credentialsId: 'MONGO_INITDB_ROOT_USERNAME', variable: 'DB_USER'),
                    string(credentialsId: 'MONGO_INITDB_ROOT_PASSWORD', variable: 'DB_PASS'),
                    string(credentialsId: 'MONGO_DB_NAME', variable: 'DB_NAME'),
                    string(credentialsId: 'ADMIN_TOKEN', variable: 'ADMIN_TOKEN')
                ]) {
                    script {

                        def lastGood = currentBuild.previousSuccessfulBuild?.number ?: BUILD_NUMBER

                        sh """
ssh -i \$SSH_KEY -o StrictHostKeyChecking=no ubuntu@\$EC2_IP \\
"NEW_BUILD=${BUILD_NUMBER} LAST_GOOD=${lastGood} \\
DB_USER='$DB_USER' DB_PASS='$DB_PASS' DB_NAME='$DB_NAME' ADMIN_TOKEN='$ADMIN_TOKEN' bash -s" <<'DEPLOY'

set -e
cd /home/ubuntu/mern

docker network create app-network 2>/dev/null || true
docker volume create mongo-data 2>/dev/null || true

docker rm -f mongo backend frontend || true

docker load -i backend-\${NEW_BUILD}.tar
docker load -i frontend-\${NEW_BUILD}.tar

docker run -d --name mongo --restart unless-stopped \\
  --network app-network \\
  -v mongo-data:/data/db \\
  -e MONGO_INITDB_ROOT_USERNAME="\$DB_USER" \\
  -e MONGO_INITDB_ROOT_PASSWORD="\$DB_PASS" \\
  mongo:6

sleep 5

docker run -d --name backend --restart unless-stopped \\
  --network app-network -p 5003:5003 \\
  -e MONGO_INITDB_ROOT_USERNAME="\$DB_USER" \\
  -e MONGO_INITDB_ROOT_PASSWORD="\$DB_PASS" \\
  -e MONGO_DB_NAME="\$DB_NAME" \\
  -e MONGO_HOST=mongo \\
  -e ADMIN_TOKEN="\$ADMIN_TOKEN" \\
  mern-backend:\$NEW_BUILD


echo "Checking backend health..."

HEALTH_OK=false

for i in \$(seq 1 30); do
  if curl -sf http://localhost:5003/health; then
    HEALTH_OK=true
    break
  fi
  sleep 2
done


if [ "\$HEALTH_OK" != "true" ]; then
  echo "Health check failed, rolling back to build \$LAST_GOOD..."

  docker rm -f backend frontend || true

  docker run -d --name backend --restart unless-stopped \\
    --network app-network -p 5003:5003 \\
    -e MONGO_INITDB_ROOT_USERNAME="\$DB_USER" \\
    -e MONGO_INITDB_ROOT_PASSWORD="\$DB_PASS" \\
    -e MONGO_DB_NAME="\$DB_NAME" \\
    -e MONGO_HOST=mongo \\
    -e ADMIN_TOKEN="\$ADMIN_TOKEN" \\
    mern-backend:\$LAST_GOOD

  docker run -d --name frontend --restart unless-stopped \\
    --network app-network -p 80:80 \\
    -e BACKEND_HOST=backend \\
    -e BACKEND_PORT=5003 \\
    mern-frontend:\$LAST_GOOD

  exit 1
fi


docker run -d --name frontend --restart unless-stopped \\
  --network app-network -p 80:80 \\
  -e BACKEND_HOST=backend \\
  -e BACKEND_PORT=5003 \\
  mern-frontend:\$NEW_BUILD

echo "Deployment successful: Build \$NEW_BUILD"

DEPLOY
"""
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Build ${BUILD_NUMBER} deployed successfully"
        }
        failure {
            echo "Build ${BUILD_NUMBER} failed and rollback was executed"
        }
    }
}
