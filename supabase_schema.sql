-- ============================================================
-- InnovX Database Schema for Supabase (PostgreSQL + pgvector)
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Profiles (extends Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'creator',  -- creator | buyer | both
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Core Innovation Records
CREATE TABLE IF NOT EXISTS innovations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    raw_input TEXT NOT NULL,
    structured_data JSONB,             -- AI-structured output (StructuredIdea)
    status TEXT DEFAULT 'draft',       -- draft | analyzing | completed | archived
    visibility TEXT DEFAULT 'private', -- private | marketplace | published
    current_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Extracted Technical Features
CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,          -- F1, F2, etc.
    description TEXT NOT NULL,
    category TEXT,
    search_queries TEXT[],
    embedding VECTOR(384),             -- all-MiniLM-L6-v2 embedding dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Search Results / Prior Art
CREATE TABLE IF NOT EXISTS prior_art_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL,
    source TEXT NOT NULL,              -- openalex | arxiv | uspto
    title TEXT NOT NULL,
    authors TEXT,
    publication_date TEXT,
    abstract TEXT,
    url TEXT,
    similarity_score FLOAT,
    evidence_sentence TEXT,            -- null if no match
    metadata JSONB,
    embedding VECTOR(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Assessment Scores
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    prior_art_density FLOAT,
    feature_novelty FLOAT,
    combination_distinctiveness FLOAT,
    research_freshness FLOAT,
    evidence_strength FLOAT,
    search_confidence FLOAT,
    summary_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Provenance Chain (Cryptographic SHA-256 hash chain)
CREATE TABLE IF NOT EXISTS provenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    document_hash TEXT NOT NULL,       -- SHA-256
    previous_hash TEXT,                -- hash of previous version (null for v1)
    snapshot JSONB NOT NULL,           -- full innovation state at this version
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Marketplace Listings (Week 3)
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    public_title TEXT NOT NULL,
    public_description TEXT NOT NULL,  -- sanitized, non-confidential
    domain TEXT,
    stage TEXT,                        -- concept | detailed_design | prototype | mvp
    available_for TEXT[],              -- ['sale', 'license', 'co_development']
    preferred_terms TEXT,
    status TEXT DEFAULT 'active',      -- active | paused | closed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Access Requests (Week 3 NDA Gating)
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    requestor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nda_accepted BOOLEAN DEFAULT FALSE,
    nda_accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',     -- pending | approved | rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Messages (Week 3)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Uploaded Files (Week 2 Innovation Vault)
CREATE TABLE IF NOT EXISTS innovation_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,           -- Supabase storage path
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Campaign Drafts (Week 4 Crowdfunding)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID REFERENCES innovations(id) ON DELETE CASCADE,
    platform TEXT,                     -- kickstarter | indiegogo | crowd_supply | general
    campaign_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE innovations ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_art_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE innovation_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
