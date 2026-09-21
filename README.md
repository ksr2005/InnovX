# InnovX

AI-Powered Innovation Discovery, Validation & Commercialization Engine

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Then fill in your API keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Required API Keys
- **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey) (free)
- **Supabase**: Create project at [supabase.com](https://supabase.com) (free tier)

### Free Data Sources (No keys needed)
- OpenAlex: 250M+ academic works
- arXiv: CS/EE/Math/Physics preprints
- USPTO PatentsView: US patent database
