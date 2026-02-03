MERN Application – End-to-End CI/CD with Jenkins, Docker, and AWS EC2
Overview

This project demonstrates a complete, production-style CI/CD pipeline for a MERN application using Jenkins, Docker, and AWS EC2.

The focus of this assignment is not just application development, but designing, implementing, and debugging a real-world CI/CD workflow with proper secret handling, health checks, and deterministic deployments.

Technology Stack

Backend: Node.js, Express, Mongoose

Frontend: React (served using Nginx)

Database: MongoDB (Docker container with persistent volume)

CI/CD Tool: Jenkins

Containerization: Docker

Deployment Target: AWS EC2 (Ubuntu Linux)

Orchestration: Docker network (no docker-compose, no Kubernetes)

Architecture Overview

Jenkins runs locally and is responsible for building Docker images and deploying them to a remote EC2 instance.

On the EC2 instance:

MongoDB runs as a container with a Docker volume for persistence

Backend runs as a Node.js container

Frontend runs as an Nginx container

All containers communicate over a custom Docker bridge network

The frontend proxies requests to the backend using Docker DNS.

CI/CD Pipeline Flow

Jenkins checks out the source code from GitHub (branch is parameterized).

Jenkins builds Docker images for backend and frontend.

Images are tagged using the Jenkins build number (no use of latest).

Docker images are saved as tar archives.

Jenkins generates runtime metadata files:

images.env for image tags

secrets.env for credentials

Artifacts are securely copied to the EC2 instance using SSH.

On EC2:

Docker network and volume are created if missing

MongoDB container is started

Backend container is started

Jenkins waits for backend health check

Frontend container is started only after backend is healthy

Old unused Docker images are cleaned up.

Deployment fails if the backend does not become healthy within a timeout.

Health Check Strategy

The backend exposes a /health endpoint.

The health endpoint returns success only after:

The backend process is running

MongoDB connection is established successfully

Jenkins waits for the health endpoint before deploying the frontend. A timeout is enforced to avoid infinite waits and to fail fast when configuration errors occur.

Secrets Management

All secrets are stored securely in Jenkins Credentials and are never committed to GitHub.

Secrets include:

MongoDB root username

MongoDB root password

MongoDB database name

Backend admin token

During pipeline execution:

Jenkins writes secrets to a temporary secrets.env file

The file is copied to EC2 and sourced at runtime

No secrets are stored in the repository

Image Versioning and Rollback

Each build produces uniquely versioned Docker images using the Jenkins build number:

mern-backend:build-<number>

mern-frontend:build-<number>

Rollback can be achieved by redeploying a previous build or re-running an older Jenkins job.

The latest tag is intentionally avoided to ensure deterministic deployments.

Container Restart and Stability

All containers are started with the Docker restart policy:

--restart unless-stopped


This ensures:

Automatic container restart on crashes

Stability across EC2 reboots

Logging and Debugging

All services log to stdout and stderr. Docker logs act as the single source of truth.

Common debugging commands on EC2:

docker ps
docker logs backend --tail=100
docker logs mongo --tail=100
docker logs frontend --tail=100


If deployment fails, Jenkins prints backend logs automatically to aid debugging.

Image Cleanup

To prevent disk exhaustion on the EC2 instance, unused Docker images older than 72 hours are removed during deployment:

docker image prune -f --filter "until=72h"

Repository Structure
mern_application/
├── backend/
│   ├── Dockerfile
│   └── server.js
├── frontend/
│   ├── Dockerfile
│   └── nginx.conf.template
├── Jenkinsfile
├── README.md
└── .gitignore

Design Decisions

Docker Compose is not used to demonstrate explicit Docker command knowledge.

Kubernetes is intentionally excluded to focus on core CI/CD fundamentals.

Health checks are mandatory to prevent broken deployments.

Secrets are never committed to source control.

Versioned images ensure safe rollbacks.

What This Project Demonstrates

End-to-end CI/CD pipeline design

Jenkins pipeline as code

Secure secret handling

Docker-based deployments on AWS EC2

Health-driven deployment strategy

Production-style debugging and recovery practices

Final Notes

This project represents a realistic single-EC2 production setup and emphasizes clarity, correctness, and explainability over unnecessary tooling.

It is designed to be easily reviewed, reproduced, and discussed in technical interviews.
