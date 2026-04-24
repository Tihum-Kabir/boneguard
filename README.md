# BoneGuard — Clinical Bone Metastasis Detection

AI-powered whole-body bone scintigraphy analysis with explainable AI and RAG chatbot.

## Stack

| Component | Technology | Hosted on |
|-----------|-----------|-----------|
| AI inference (DenseNet + Grad-CAM) | Python FastAPI | HuggingFace Spaces |
| API gateway | Node.js Express | Railway / localhost |
| Frontend | Next.js + Tailwind | Vercel / localhost |
| Chatbot embeddings | Gemini API | Google AI Studio |
| Chatbot generation | Groq LLaMA 3.3 70B | Groq Cloud |

---

## Quick start (local)

### Prerequisites
- Node.js 18+
- Git

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/boneguard.git
cd boneguard
```

### 2. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in your keys in backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
# Fill in your values in frontend/.env.local
```

### 3. Re-generate vector store (Bonne chatbot knowledge base)
```bash
cd bonne-chatbot
npm install
node scripts/ingest.js
cd ..
```

### 4. Install and run
```bash
# Double-click start.bat on Windows
# OR manually:

# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

Open http://localhost:3000

---

## Docker (run everything with one command)

### Prerequisites
- Docker Desktop installed

### Run
```bash
# Copy and fill in your env file
cp .env.example .env
# Edit .env with your real API keys

# Start everything
docker-compose up --build

# Stop
docker-compose down
```

Open http://localhost:3000

---

## Environment variables reference

| Variable | Where | Description |
|----------|-------|-------------|
| `HF_API_URL` | backend/.env | Your HuggingFace Space URL |
| `GEMINI_API_KEY` | backend/.env | Gemini API key (embeddings) |
| `GROQ_API_KEY` | backend/.env | Groq API key (chat generation) |
| `VECTORSTORE_PATH` | backend/.env | Path to vectorstore.json |
| `NEXT_PUBLIC_BACKEND_URL` | frontend/.env.local | Backend server URL |

---

## Deployment (production hosting)

### Backend → Railway
1. Go to railway.app → New Project → Deploy from GitHub
2. Select this repo → select `backend/` as root
3. Add environment variables in Railway dashboard
4. Railway gives you a URL like `https://boneguard-backend.railway.app`

### Frontend → Vercel
1. Go to vercel.com → New Project → Import from GitHub
2. Select this repo → set root to `frontend/`
3. Add `NEXT_PUBLIC_BACKEND_URL=https://boneguard-backend.railway.app`
4. Deploy → Vercel gives you `https://boneguard.vercel.app`

### AI Server → HuggingFace Spaces (already deployed)
- Already running at: https://tihumkabir-boneguard-api.hf.space

---

## Adding more PDFs to Bonne

1. Extract PDF text to a `.txt` file
2. Drop it in `bonne-chatbot/data/`
3. Run `node bonne-chatbot/scripts/ingest.js`
4. Restart backend

---

## Project structure

```
boneguard/
  backend/                    Node.js API gateway
    server.js
    package.json
    Dockerfile
    .env.example
  frontend/                   Next.js app
    pages/
      index.js
    components/
      ChatPanel.js
      UploadZone.js
      ProbabilityBar.js
      ImageViewer.js
      ClinicalReport.js
      PDFExport.js
      ErrorBanner.js
      LoadingState.js
    styles/
      globals.css
    Dockerfile
    .env.example
  bonne-chatbot/              RAG chatbot
    backend/
      chat.js
    data/
      bone_metastases_text.txt
      vectorstore.json         (gitignored — regenerate with ingest.js)
    scripts/
      ingest.js
  docker-compose.yml
  .gitignore
  README.md
```
