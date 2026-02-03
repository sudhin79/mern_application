pipeline {
    agent any

    parameters {
        string(
            name: 'BRANCH_NAME',
            defaultValue: 'main',
            description: 'Git branch to build and deploy'
        )
    }

    environment {
        REMOTE_USER = "ubuntu"
        REMOTE_DIR  = "/home/ubuntu/mern"

        DOCKER_NETWORK = "app-network"
        MONGO_VOLUME   = "mongo-data"
    }

    stages {

        /* =======================
           1. CHECKOUT (PARAMETERIZED)
        ======================= */
        stage('Checkout Source') {
            steps {
                git branch: "${params.BRANCH_NAME}",
                    url: 'https://github.com/sudhin79/mern_application.git'
            }
        }

        /* =======================
           2. BUILD VERSIONED IMAGES
        ======================= */
        stage('Build Docker Images') {
            steps {
                sh '''
                  docker build -t mern-backend:build-${BUILD_NUMBER} backend
                  docker build -t mern-frontend:build-${BUILD_NUMBER} frontend
                '''
            }
        }

        /* =======================
           3. SAVE IMAGES
        ======================= */
        stage('Save Images') {
            steps {
                sh '''
                  docker save mern-backend:build-${BUILD_NUMBER}  > backend.tar
                  docker save mern-frontend:build-${BUILD_NUMBER} > frontend.tar
                '''
            }
        }

        /* =======================
           4. IMAGE METADATA FILE
        ======================= */
        stage('Create Image Env File') {
            steps {
                sh '''
                  echo "BACKEND_IMAGE=mern-backend:build-${BUILD_NUMBER}" > images.env
                  echo "FRONTEND_IMAGE=mern-frontend:build-${BUILD_NUMBER}" >> images.env
                '''
            }
        }

        /* =======================
           5. SECRETS FILE
        ======================= */
        stage('Create Secrets Env File') {
            steps {
                withCredentials([
                    string(credentialsId: 'MONGO_INITDB_ROOT_USERNAME', variable: 'DB_USER'),
                    string(credentialsId: 'MONGO_INITDB_ROOT_PASSWORD', variable: 'DB_PASS'),
                    string(credentialsId: 'MONGO_DB_NAME', variable: 'DB_NAME'),
                    string(credentialsId: 'ADMIN_TOKEN', variable: 'ADMIN_TOKEN')
                ]) {
                    sh '''
                      echo "DB_USER=$DB_USER" > secrets.env
                      echo "DB_PASS=$DB_PASS" >> secrets.env
                      echo "DB_NAME=$DB_NAME" >> secrets.env
                      echo "ADMIN_TOKEN=$ADMIN_TOKEN" >> secrets.env
                    '''
                }
            }
        }

        /* =======================
           6. COPY TO EC2
        ======================= */
        stage('Copy Artifacts to EC2') {
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'remote_ssh_key', keyFileVariable: 'SSH_KEY'),
                    string(credentialsId: 'remote_server_ip', variable: 'EC2_IP')
                ]) {
                    sh '''
                      scp -i $SSH_KEY -o StrictHostKeyChecking=no \
                      backend.tar frontend.tar images.env secrets.env \
                      ubuntu@$EC2_IP:/home/ubuntu/mern
                    '''
                }
            }
        }

        /* =======================
           7. DEPLOY (HEALTH + TIMEOUT)
        ======================= */
        stage('Deploy on EC2') {
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'remote_ssh_key', keyFileVariable: 'SSH_KEY'),
                    string(credentialsId: 'remote_server_ip', variable: 'EC2_IP')
                ]) {

sh '''
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$EC2_IP << 'EOF'
set -e

DOCKER_NETWORK=app-network
MONGO_VOLUME=mongo-data
REMOTE_DIR=/home/ubuntu/mern

cd $REMOTE_DIR

echo "Loading metadata"
source images.env
source secrets.env

echo "Loading Docker images"
docker load < backend.tar
docker load < frontend.tar

echo "Ensuring network and volume"
docker network inspect $DOCKER_NETWORK >/dev/null 2>&1 || docker network create $DOCKER_NETWORK
docker volume inspect $MONGO_VOLUME >/dev/null 2>&1 || docker volume create $MONGO_VOLUME

echo "Stopping old containers"
docker rm -f mongo backend frontend || true

echo "Starting MongoDB"
docker run -d --name mongo --restart unless-stopped --network $DOCKER_NETWORK \
  -v $MONGO_VOLUME:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=$DB_USER \
  -e MONGO_INITDB_ROOT_PASSWORD=$DB_PASS \
  mongo:6

echo "Starting Backend: $BACKEND_IMAGE"
docker run -d --name backend --restart unless-stopped \
  --network $DOCKER_NETWORK -p 5003:5003 \
  -e MONGO_INITDB_ROOT_USERNAME=$DB_USER \
  -e MONGO_INITDB_ROOT_PASSWORD=$DB_PASS \
  -e MONGO_DB_NAME=$DB_NAME \
  -e MONGO_HOST=mongo \
  -e ADMIN_TOKEN=$ADMIN_TOKEN \
  $BACKEND_IMAGE

echo "Waiting for backend health (max 60s)"
HEALTHY=false
for i in {1..30}; do
  if curl -sf http://localhost:5003/health > /dev/null; then
    HEALTHY=true
    break
  fi
  sleep 2
done

if [ "$HEALTHY" != "true" ]; then
  echo "Backend failed health check"
  docker logs backend --tail=50
  exit 1
fi

echo "Starting Frontend: $FRONTEND_IMAGE"
docker run -d --name frontend --restart unless-stopped \
  --network $DOCKER_NETWORK -p 80:80 \
  -e BACKEND_HOST=backend \
  -e BACKEND_PORT=5003 \
  $FRONTEND_IMAGE

echo "Cleaning old images (older than 72h)"
docker image prune -f --filter "until=72h"

echo "Deployment completed successfully"
EOF
'''
                }
            }
        }
    }

    post {
        success {
            echo "Deployment successful for build ${BUILD_NUMBER} from branch ${params.BRANCH_NAME}"
        }
        failure {
            echo "Deployment failed — check logs"
        }
    }
}

