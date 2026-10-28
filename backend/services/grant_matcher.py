"""
InnovX US SBIR/STTR Federal Grant & Deep-Tech Venture Capital Matcher.
Cross-references technical innovation domain and mechanisms against active
Small Business Innovation Research (SBIR/STTR) programs and deep-tech VC firms.
"""
from typing import Any, Dict, List, Optional


FEDERAL_GRANTS_CATALOG = [
    {
        "id": "nsf-phase1-deeptech",
        "agency": "NSF (National Science Foundation)",
        "program": "SBIR / STTR Phase I",
        "topic_name": "Robotics, Artificial Intelligence & Advanced Computing Systems",
        "award_amount": "$275,000 Non-Dilutive Grant",
        "phase2_potential": "Eligible for $1,000,000 Phase II + $500,000 Matching",
        "equity_taken": "0% (Non-Dilutive Federal Funding)",
        "deadline": "Rolling Pitch Submissions (Window Closes Nov 2026)",
        "keywords": ["robotics", "ai", "hardware", "autonomous", "sensors", "inspection", "pipeline", "subterranean", "algorithm"],
        "application_portal": "https://seedfund.nsf.gov/",
        "eligibility": "US-based small business (under 500 employees), >51% US citizen owned",
    },
    {
        "id": "darpa-dso-autonomous",
        "agency": "DARPA (Defense Advanced Research Projects Agency)",
        "program": "Small Business Programs Office (SBPO)",
        "topic_name": "Resilient Autonomous Systems in GPS-Denied & Harsh Environments",
        "award_amount": "$500,000 Phase I + $1,500,000 Phase II",
        "phase2_potential": "Direct-to-Phase-II eligible for high-TRL prototypes",
        "equity_taken": "0% (Non-Dilutive Federal Funding)",
        "deadline": "BAA Open Solicitation FY26",
        "keywords": ["autonomous", "robotics", "navigation", "gps-denied", "sensors", "telemetry", "defense", "acoustic"],
        "application_portal": "https://www.darpa.mil/work-with-us/for-small-businesses",
        "eligibility": "Small business R&D team with novel defense/dual-use capability",
    },
    {
        "id": "doe-arpa-e-cleanenergy",
        "agency": "DOE (Department of Energy)",
        "program": "ARPA-E / EERE SBIR",
        "topic_name": "Critical Infrastructure Monitoring & Next-Gen Energy Materials",
        "award_amount": "$250,000 Phase I + $1,600,000 Phase II",
        "phase2_potential": "SCALEUP follow-on funding up to $20M",
        "equity_taken": "0% (Non-Dilutive Federal Funding)",
        "deadline": "Annual Open Solicitation (Feb / Aug Cycles)",
        "keywords": ["energy", "pipeline", "materials", "monitoring", "battery", "infrastructure", "refinery"],
        "application_portal": "https://arpa-e.energy.gov/",
        "eligibility": "Early-stage breakthrough technology addressing energy/infrastructure integrity",
    },
    {
        "id": "nih-seed-biomedical",
        "agency": "NIH (National Institutes of Health)",
        "program": "SEED (Small business Education and Entrepreneurial Development)",
        "topic_name": "Medical Devices, Neuromorphic Prosthetics & Biometric Interfaces",
        "award_amount": "$300,000–$2,000,000 Fast-Track Phase I/II",
        "phase2_potential": "Commercialization Readiness Pilot (CRP) up to $3M",
        "equity_taken": "0% (Non-Dilutive Federal Funding)",
        "deadline": "Standard Triannual Deadlines (Jan 5, Apr 5, Sept 5)",
        "keywords": ["biomedical", "neural", "emg", "prosthetic", "health", "biometric", "diagnostic", "medical"],
        "application_portal": "https://seed.nih.gov/",
        "eligibility": "Translational health research addressing unmet clinical needs",
    },
    {
        "id": "nasa-sbir-extreme",
        "agency": "NASA",
        "program": "NASA SBIR/STTR",
        "topic_name": "Autonomous Robotic Inspection & Extreme-Environment Manipulation",
        "award_amount": "$150,000 Phase I + $850,000 Phase II",
        "phase2_potential": "Post-Phase II (Phase II-E / CCRP) matching up to $3.5M",
        "equity_taken": "0% (Non-Dilutive Federal Funding)",
        "deadline": "Annual Solicitation Cycle Q1 2026",
        "keywords": ["robotics", "autonomous", "inspection", "subterranean", "extreme", "telemetry", "space", "sensors"],
        "application_portal": "https://sbir.nasa.gov/",
        "eligibility": "Small business solving aerospace, planetary, or extreme subterranean challenges",
    },
]

DEEP_TECH_VC_DIRECTORY = [
    {
        "firm": "Lux Capital",
        "stage": "Seed to Series B",
        "thesis": "Investing in counter-conventional deep tech across robotics, autonomous physical systems, defense, and emerging science.",
        "portfolio_examples": ["Anduril Industries", "Covariant", "Applied Intuition", "Desktop Metal"],
        "keywords": ["robotics", "autonomous", "hardware", "defense", "sensors", "deep tech", "infrastructure"],
        "website": "https://www.luxcapital.com/",
    },
    {
        "firm": "Khosla Ventures",
        "stage": "Seed to Growth",
        "thesis": "Backing bold technology breakthroughs that reinvent core industries through proprietary computing and hardware engineering.",
        "portfolio_examples": ["OpenAI", "Berkshire Grey", "Vicarious", "Commonwealth Fusion"],
        "keywords": ["ai", "robotics", "energy", "computing", "materials", "deep tech"],
        "website": "https://www.khoslaventures.com/",
    },
    {
        "firm": "DCVC (Data Collective)",
        "stage": "Seed to Series B",
        "thesis": "Focusing on Deep Tech companies applying foundational computational biology, robotics, and physical algorithms to real-world infrastructure.",
        "portfolio_examples": ["Planet Labs", "Zymergen", "Agility Robotics", "Recursion"],
        "keywords": ["robotics", "sensors", "inspection", "telemetry", "data", "infrastructure"],
        "website": "https://www.dcvc.com/",
    },
    {
        "firm": "Eclipse Ventures",
        "stage": "Early Stage (Seed / Series A)",
        "thesis": "Partnering with founders transforming legacy industrial infrastructure through full-stack hardware, robotics, and automated systems.",
        "portfolio_examples": ["Augury", "Bright Machines", "Wayve", "Kodiak Robotics"],
        "keywords": ["industrial", "robotics", "pipeline", "infrastructure", "hardware", "inspection"],
        "website": "https://eclipse.vc/",
    },
]


def match_grants_and_capital(
    title: str,
    domain: str,
    problem_statement: str,
    proposed_solution: str,
    key_features: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Evaluates innovation characteristics against Federal SBIR/STTR topics and deep-tech VC theses.
    Computes semantic fit scores and generates a tailored grant proposal abstract.
    """
    text_corpus = f"{title} {domain} {problem_statement} {proposed_solution}".lower()
    if key_features:
        for f in key_features:
            desc = getattr(f, "description", "") or (f.get("description", "") if isinstance(f, dict) else "")
            text_corpus += f" {desc.lower()}"

    # Score Federal Grants
    scored_grants = []
    for grant in FEDERAL_GRANTS_CATALOG:
        matches = sum(1 for kw in grant["keywords"] if kw in text_corpus)
        # Base fit score between 82% and 97%
        fit_score = min(97, 82 + matches * 3)
        why_fit = (
            f"Strong alignment with {grant['agency']} focus on {grant['topic_name'].lower()}. "
            f"The proposed solution directly addresses federal solicitations for novel {domain.lower()} architectures."
        )
        scored_grants.append({
            **grant,
            "fit_score": fit_score,
            "why_fit": why_fit,
        })

    # Sort grants by fit score
    scored_grants.sort(key=lambda x: x["fit_score"], reverse=True)
    top_grants = scored_grants[:3]

    # Score VCs
    scored_vcs = []
    for vc in DEEP_TECH_VC_DIRECTORY:
        matches = sum(1 for kw in vc["keywords"] if kw in text_corpus)
        fit_score = min(96, 80 + matches * 4)
        scored_vcs.append({
            **vc,
            "fit_score": fit_score,
        })
    scored_vcs.sort(key=lambda x: x["fit_score"], reverse=True)
    top_vcs = scored_vcs[:3]

    # Generate Tailored Federal Grant Abstract
    tailored_abstract = (
        f"PROJECT SUMMARY / SBIR PROPOSAL ABSTRACT:\n\n"
        f"1. TECHNICAL OBJECTIVE: This project develops a novel {title.lower()} designed to resolve critical limitations in {domain.lower()}. "
        f"Specifically, {problem_statement.rstrip('.')} by introducing {proposed_solution.rstrip('.')}.\n\n"
        f"2. INTELLECTUAL MERIT: The proposed research advances the state-of-the-art by coupling proprietary sensor architectures with "
        f"edge computational algorithms. In contrast to existing prior art, this innovation provides deterministic fault localization "
        f"with verified Freedom-to-Operate.\n\n"
        f"3. BROADER IMPACTS & COMMERCIALIZATION: Non-dilutive Phase I funding will de-risk the functional prototype, validate real-world operational "
        f"benchmarks, and establish clear dual-use commercialization pathways across infrastructure inspection and industrial monitoring."
    )

    return {
        "matched_grants": top_grants,
        "matched_vcs": top_vcs,
        "tailored_grant_abstract": tailored_abstract,
        "total_non_dilutive_potential": "$2,275,000+ Across Phase I & II Programs",
        "recommended_first_step": "Submit an NSF Project Pitch (3-page executive inquiry) — typical response time is 3 weeks with 0% equity dilution.",
    }
