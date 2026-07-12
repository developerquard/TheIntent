# 🚀 SocialDiscovery - Next-Gen Social Media Platform 2026

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0-blue.svg)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org)

A privacy-first, intent-governed social discovery platform with AI-powered recommendations, real-time messaging, and modern UX.

## ✨ Key Features

### 🎯 Core Features
- **Intent-Based Discovery**: Every action is governed by explicit intent policies
- **AI-Powered Feed**: Advanced ML recommendations with diversity enforcement
- **Real-time Messaging**: WebSocket-based instant messaging with typing indicators
- **Stories**: 24-hour ephemeral content with view tracking
- **Live Streaming**: WebRTC-based live video streaming
- **Advanced Search**: Full-text search powered by Meilisearch
- **Content Moderation**: AI-powered automated moderation

### 🛡️ Privacy & Security
- **End-to-End Encryption**: Secure messaging with E2EE
- **Zero-Knowledge Auth**: Privacy-preserving authentication
- **GDPR Compliant**: Full data portability and right to be forgotten
- **Content Warnings**: Customizable content filtering
- **Advanced Blocking**: Comprehensive blocking and muting system

### 🤖 AI/ML Features
- **Personalized Recommendations**: Hybrid content + collaborative filtering
- **Smart Moderation**: Automated content moderation with ML
- **Trending Detection**: Real-time trend identification
- **Sentiment Analysis**: Post and comment sentiment tracking
- **Image Recognition**: Automated image tagging and NSFW detection

### 💎 Modern UX
- **Glassmorphism UI**: Beautiful, modern design with depth
- **Dark Mode**: Eye-friendly dark theme
- **Micro-animations**: Smooth, delightful interactions
- **Infinite Scroll**: Seamless content loading
- **PWA Support**: Install as native app

## 🏗️ Architecture

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Frontend │────▶│ API Gateway │────▶│ Backend │
│ (Next.js) │ │ (Nginx) │ │ (Node.js) │
└─────────────────┘ └─────────────────┘ └─────────────────┘
│
┌────────────────────────────────────────────────┼────────────────┐
│ │ │
┌───────▼────────┐ ┌──────────────┐ ┌────────────────▼──┐ ┌──────────▼───────┐
│ PostgreSQL │ │ Redis │ │ ML Services │ │ WebSocket │
│ (Primary DB) │ │ (Cache) │ │ (Python) │ │ (Real-time) │
└────────────────┘ └──────────────┘ └───────────────────┘ └──────────────────┘
│ │ │ │
┌───────▼──────────────┐ │ ┌────────▼────────┐ ┌────────▼─────────┐
│ Meilisearch │ │ │ Vector DB │ │ RabbitMQ │
│ (Search Engine) │ │ │ (Qdrant) │ │ (Message Queue)│
└──────────────────────┘ │ └─────────────────┘ └──────────────────┘
│
┌────────▼────────┐
│ MinIO/S3 │
│ (Object Store)│
└─────────────────┘

markdown
Copy code

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/LOLA0786/Socialdiscovery.git
cd Socialdiscovery
Install dependencies

bash
Copy code
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# ML Services
cd ../ml-services
pip install -r requirements.txt
Set up environment variables

bash
Copy code
cp .env.example .env
# Edit .env with your configuration
Start services with Docker Compose

bash
Copy code
docker-compose up -d
Run database migrations

bash
Copy code
cd backend
npx prisma migrate dev
npx prisma generate
Start development servers

bash
Copy code
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: WebSocket Server
cd backend
npm run ws:dev

# Terminal 4: ML Services
cd ml-services
uvicorn main:app --reload
Access the application

Frontend: http://localhost:3000

Backend API: http://localhost:3001

API Docs: http://localhost:3001/api-docs

WebSocket: ws://localhost:3002

ML Services: http://localhost:8000

📚 API Documentation
Authentication
Register
bash
Copy code
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "johndoe",
  "fullName": "John Doe"
}
Login
bash
Copy code
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
Posts
Create Post
bash
Copy code
POST /api/v1/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello World!",
  "type": "TEXT",
  "visibility": "PUBLIC",
  "hashtags": ["hello", "world"]
}
Get Feed
bash
Copy code
GET /api/v1/posts/feed?page=1&limit=20&type=foryou
Authorization: Bearer <token>
Full API documentation available at /api-docs when running the server.
🧪 Testing
bash
Copy code
# Backend tests
cd backend
npm test
npm run test:e2e
npm run test:coverage

# Frontend tests
cd frontend
npm test
npm run test:coverage

# ML tests
cd ml-services
pytest
pytest --cov
📦 Deployment
Docker Production Build
bash
Copy code
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
Kubernetes Deployment
bash
Copy code
kubectl apply -f infrastructure/kubernetes/
kubectl get pods -n socialdiscovery
📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

Made with ❤️ by the SocialDiscovery Team
