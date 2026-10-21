import { type AnalysisResponse } from "@/lib/api";

export const SAMPLE_PROMPT_SUGGESTIONS = [
  {
    category: "Robotics",
    title: "Subterranean Quadruped Pipeline Inspection Robot",
    prompt:
      "An autonomous solar-assisted quadruped robotic inspection platform for subterranean pipeline fault detection. The system navigates unmapped pipe networks without GPS, utilizes an acoustic-visual sensor array to localize micro-fissures, features adaptive magnetic gaited climbing for curved geometry, and transmits low-bandwidth semantic delta telemetry to an external SCADA monitoring hub.",
  },
  {
    category: "Cleantech",
    title: "Atmospheric Water Harvesting via Photothermal MOFs",
    prompt:
      "A passive, solar-driven atmospheric water harvesting system utilizing photothermal metal-organic frameworks (MOFs). The apparatus absorbs humidity during nighttime cooling cycles, uses concentrated daytime photothermal desorption to release vapor, and condenses potable water in low-relative-humidity arid environments without active electrical grid power.",
  },
  {
    category: "Energy Storage",
    title: "Solid-State Sodium-Ion Battery with Dual Ceramic Barrier",
    prompt:
      "A non-flammable solid-state sodium-ion battery architecture utilizing a dual-layer ceramic-polymer hybrid solid electrolyte. Features an engineered interphase layer preventing dendrite propagation, high-voltage Prussian blue analogue cathode, and rapid ambient-temperature ionic conductivity (>1 mS/cm) for sustainable grid storage.",
  },
  {
    category: "Biomedical",
    title: "Sub-Millisecond Neural EMG Prosthetic Controller",
    prompt:
      "A wearable surface electromyography (sEMG) neural interface system for bionic upper-limb prosthetics. Combines 64-channel dry-contact graphene electrode arrays with an ultra-low-power neuromorphic edge spiking neural network processor to predict multivariable hand kinematics with sub-10ms neuromuscular latency.",
  },
];

export const SAMPLE_INNOVATION_REPORT: AnalysisResponse = {
  innovation_id: "demo-sample-pipeline-robot",
  structured_idea: {
    title: "Autonomous Quadruped Robotic Platform for Subterranean Pipeline Fault Detection",
    domain: "Robotics & Infrastructure Maintenance",
    problem_statement:
      "Underground and underwater pipelines suffer from micro-fissures and stress fractures that are inaccessible to human technicians, frequently causing catastrophic environmental leaks before traditional tethered robotic probes or inline inspection pigs can detect them.",
    proposed_solution:
      "An agile autonomous quadruped robot utilizing acoustic-visual sensory fusion for non-destructive testing, adaptive gait locomotion for irregular pipeline interiors, and low-latency semantic telemetry broadcast.",
    key_features: [
      {
        id: "F1",
        description: "Acoustic-visual sensor fusion for real-time micro-fissure and corrosion localization",
        category: "Sensing & Perception",
        search_queries: ["acoustic emission sensor fusion pipe fissure detection", "multi-modal pipeline crack localization"],
      },
      {
        id: "F2",
        description: "Adaptive gaited quadruped locomotion over uneven sediment and variable curved pipe geometry",
        category: "Mechanical & Locomotion",
        search_queries: ["curved pipe crawling quadruped adaptive gait", "in-pipe legged robot locomotion"],
      },
      {
        id: "F3",
        description: "High-frequency resonant inductive wireless docking and recharging mechanism",
        category: "Power Subsystem",
        search_queries: ["subsea resonant inductive charging robot", "in-pipe wireless power transfer dock"],
      },
      {
        id: "F4",
        description: "Bandwidth-optimized semantic delta telemetry protocol for low-power SCADA integration",
        category: "Communications & Edge Computing",
        search_queries: ["subterranean acoustic telemetry pipeline monitoring", "low-bandwidth SCADA robot telemetry"],
      },
    ],
    target_applications: [
      "Municipal wastewater and potable water conduit integrity monitoring",
      "Offshore oil & gas subsea pipeline non-destructive testing (NDT)",
      "Chemical refinery underground transport pipe inspection",
    ],
    technical_components: {
      hardware: [
        "Quadrupedal titanium chassis with high-torque brushless servo actuators",
        "Dual-frequency ultrasonic transducer array and stereo camera housing",
        "Resonant magnetic inductive receiver coil and IP68 sealed battery pack",
      ],
      software: [
        "Real-time inverse kinematics gait controller with curvature adaptation",
        "Acoustic guided wave signal processing and defect localization pipeline",
        "Semantic delta telemetry compression engine for low-bandwidth modems",
      ],
      methods: [
        "Autonomous visual-acoustic non-destructive evaluation (NDE)",
        "Automated dock-seeking and inductive resonance charging cycle",
        "SCADA event-triggered alarm prioritization broadcast",
      ],
    },
    selected_paths: ["protect", "build"],
  },
  feature_matrix: {
    innovation_id: "demo-sample-pipeline-robot",
    title: "Autonomous Quadruped Robotic Platform for Subterranean Pipeline Fault Detection",
    domain: "Robotics & Infrastructure Maintenance",
    search_timestamp: "2026-10-14T20:00:00Z",
    search_sources: ["openalex", "arxiv", "uspto"],
    limitations: [
      "Search is limited to public English-language scientific publications and USPTO patent grants as of October 2026.",
      "Novelty signals represent statistical text similarity across 250M+ documents and do not constitute formal legal patent prosecution.",
    ],
    methodology: {
      apis_queried: ["OpenAlex (250M+ Academic Works)", "arXiv (Preprints)", "USPTO (US Patents)"],
      api_health: { openalex: "ok", arxiv: "ok", uspto: "ok" },
      hybrid_fusion: "Reciprocal Rank Fusion (RRF, k=60) combining Okapi BM25 and all-MiniLM-L6-v2 embeddings",
      total_documents_scanned: 198,
      timestamp: "2026-10-14T20:00:00Z",
      feature_audits: [
        {
          feature_id: "F1",
          feature_description: "Acoustic-visual sensor fusion for real-time micro-fissure and corrosion localization",
          total_candidates_found: 48,
          total_after_fusion: 10,
          queries_run: [
            { source: "openalex", status: "ok", query: "acoustic emission stereo optical pipeline fissure", results_count: 24 },
            { source: "arxiv", status: "ok", query: "ultrasonic guided wave pipe inspection", results_count: 14 },
            { source: "uspto", status: "ok", query: "acoustic sensor ring in-pipe camera", results_count: 10 },
          ],
        },
        {
          feature_id: "F2",
          feature_description: "Adaptive gaited quadruped locomotion over uneven sediment and variable curved pipe geometry",
          total_candidates_found: 12,
          total_after_fusion: 5,
          queries_run: [
            { source: "openalex", status: "ok", query: "magnetic footpad quadruped climbing pipe", results_count: 4 },
            { source: "arxiv", status: "ok", query: "legged locomotion curved cylindrical tube", results_count: 6 },
            { source: "uspto", status: "ok", query: "in-pipe walking robot magnetic gait", results_count: 2 },
          ],
        },
        {
          feature_id: "F3",
          feature_description: "High-frequency resonant inductive wireless docking and recharging mechanism",
          total_candidates_found: 135,
          total_after_fusion: 10,
          queries_run: [
            { source: "openalex", status: "ok", query: "resonant inductive power transfer underwater", results_count: 65 },
            { source: "arxiv", status: "ok", query: "high frequency inductive coupler subsea", results_count: 38 },
            { source: "uspto", status: "ok", query: "subsea charging station alignment dock", results_count: 32 },
          ],
        },
        {
          feature_id: "F4",
          feature_description: "Bandwidth-optimized semantic delta telemetry protocol for low-power SCADA integration",
          total_candidates_found: 3,
          total_after_fusion: 3,
          queries_run: [
            { source: "openalex", status: "ok", query: "semantic delta telemetry pipeline acoustic", results_count: 1 },
            { source: "arxiv", status: "ok", query: "low bandwidth chirp spread spectrum acoustic modem", results_count: 2 },
            { source: "uspto", status: "ok", query: "low power acoustic telemetry SCADA pipe", results_count: 0 },
          ],
        },
      ],
    },
    features: [
      {
        id: "F1",
        description: "Acoustic-visual sensor fusion for real-time micro-fissure and corrosion localization",
        coverage: "medium",
        total_matches: 48,
        prior_art: [
          {
            title: "Multi-modal Acoustic and Optical Inspection for Subsea Pipeline Integrity",
            source: "openalex",
            similarity: 0.78,
            rrf_score: 0.0328,
            keyword_score: 0.85,
            rank_rrf: 1,
            evidence_sentence:
              "We integrate high-frequency acoustic emission probes with optical stereo cameras to detect surface micro-cracks under pressurized fluid flow.",
            url: "https://openalex.org/W3124982104",
          },
          {
            title: "Ultrasonic Guided Wave Localization on Cylindrical Shells",
            source: "arxiv",
            similarity: 0.64,
            rrf_score: 0.0315,
            keyword_score: 0.72,
            rank_rrf: 2,
            evidence_sentence:
              "Guided wave dispersion curves show acoustic energy concentration near circumferential discontinuities in steel pipe walls.",
            url: "https://arxiv.org/abs/2304.11029",
          },
          {
            title: "Autonomous Non-Destructive Testing Vehicle for Gas Conduits",
            source: "uspto",
            similarity: 0.58,
            rrf_score: 0.0308,
            keyword_score: 0.65,
            rank_rrf: 3,
            evidence_sentence:
              "An inspection apparatus comprising an acoustic sensor ring and a front-mounted illumination camera for conduit defect categorization.",
            url: "https://patents.google.com/patent/US9841392B2",
          },

        ],
      },
      {
        id: "F2",
        description: "Adaptive gaited quadruped locomotion over uneven sediment and variable curved pipe geometry",
        coverage: "low",
        total_matches: 12,
        prior_art: [
          {
            title: "Legged Locomotion Inside Confined Cylindrical Environments",
            source: "arxiv",
            similarity: 0.61,
            evidence_sentence:
              "Gait transitions from trotting to bracing enable stability in curved pipes with radii between 400mm and 800mm.",
            url: "https://arxiv.org/abs/2208.04912",
          },
          {
            title: "Magnetic Footpad Adhesion for In-Pipe Quadruped Climbing",
            source: "openalex",
            similarity: 0.52,
            evidence_sentence:
              "Permanent rare-earth magnetic arrays embedded in compliant footpads allow vertical navigation inside ferrous tubes.",
            url: "https://openalex.org/W4291881729",
          },
        ],
      },
      {
        id: "F3",
        description: "High-frequency resonant inductive wireless docking and recharging mechanism",
        coverage: "high",
        total_matches: 135,
        prior_art: [
          {
            title: "Resonant Inductive Power Transfer for Subsea Autonomous Vehicles",
            source: "openalex",
            similarity: 0.86,
            evidence_sentence:
              "High-frequency 85kHz inductive couplers deliver 1.2kW charging across 20mm seawater gaps with 91% transfer efficiency.",
            url: "https://openalex.org/W2991048123",
          },
          {
            title: "Subsea Recharging Station with Conical Alignment Dock",
            source: "uspto",
            similarity: 0.74,
            evidence_sentence:
              "A subsea charging station with magnetic guide cones for passive alignment of autonomous underwater vehicles.",
            url: "https://patents.google.com/patent/US10493855B2",
          },
        ],
      },
      {
        id: "F4",
        description: "Bandwidth-optimized semantic delta telemetry protocol for low-power SCADA integration",
        coverage: "none",
        total_matches: 3,
        prior_art: [
          {
            title: "Low-Bandwidth Acoustic Modems for Subterranean Telemetry",
            source: "arxiv",
            similarity: 0.43,
            evidence_sentence:
              "Chirp-spread spectrum acoustic modulation yields 120 bps throughput across 1.5km of liquid-filled pipe infrastructure.",
            url: "https://arxiv.org/abs/2103.09458",
          },
        ],
      },
    ],
  },
  scores: {
    prior_art_density: {
      score: 48,
      explanation:
        "Moderate prior art density. While pipeline non-destructive testing and inductive charging are active research fields, gaited quadruped locomotion in confined pipelines exhibits substantial unoccupied white space.",
      references: ["OpenAlex W3124982104", "US9841392B2"],
    },
    feature_novelty: {
      score: 74,
      explanation:
        "High novelty signal in Feature F4 (semantic delta telemetry) and F2 (pipe-curvature adaptive quadruped gait). Prior art predominantly utilizes wheeled or track-driven crawlers.",
      references: ["arXiv 2208.04912"],
    },
    combination_distinctiveness: {
      score: 82,
      explanation:
        "Exceptionally high combination novelty. No single retrieved academic publication or patent combines agile quadruped gait, multi-modal acoustic-visual fissure fusion, and resonant in-pipe docking.",
      references: ["OpenAlex W4291881729", "US10493855B2"],
    },
    research_freshness: {
      score: 88,
      explanation:
        "Strong recent activity: 72% of matching literature and preprint submissions were published within the past 36 months, indicating an accelerating technological frontier.",
      references: ["arXiv 2304.11029", "OpenAlex W4291881729"],
    },
    evidence_strength: {
      score: 91,
      explanation:
        "High evidence confidence with verbatim sentence extractions across peer-reviewed IEEE robotics conferences and active USPTO pipeline testing patents.",
      references: ["US9841392B2", "IEEE Transactions on Industrial Electronics"],
    },
    search_confidence: {
      score: 85,
      explanation:
        "Triangulated over 250M+ OpenAlex records, 2.4M+ arXiv preprints, and USPTO PatentsView grants with semantic similarity thresholds above 0.70 on core features.",
      references: ["OpenAlex API", "arXiv API", "USPTO PatentsView"],
    },
  },
  assessment_summary:
    "The submitted innovation demonstrates a compelling combination of mechanical agility and sensor fusion tailored for high-risk industrial inspection. While standard non-destructive testing (NDT) sensor arrays and inductive power couplers are well-documented in existing patent literature, the specific deployment of adaptive quadrupedal kinematics inside curved fluid conduits represents an unoccupied technological niche.\n\nTraditional in-pipe inspection vehicles (PIGs and track-driven crawlers) struggle with complex pipe bends, valve bottlenecks, and accumulated sediment. The proposed combination of gaited stepping with permanent magnet adherence and acoustic emission localization creates substantial inventive step over current USPTO reference art.\n\nFrom a commercialization standpoint, this innovation exhibits prime eligibility for Provisional Patent Drafting (Protect Path) focused on the kinematics-telemetry coupling claims, accompanied by a targeted Kickstarter or Indiegogo hardware campaign for industrial inspection pilot units.",
  report: {
    status: "sample_verified",
    executive_summary: "High novelty pipeline inspection quadruped with substantial inventive step.",
  },
  provenance: {
    innovation_id: "demo-sample-pipeline-robot",
    version: 1,
    document_hash: "a4f8921e5b8d4c9876543210fedcba9876543210abcdef0123456789abcdef01",
    previous_hash: null,
    created_at: "2026-10-14T20:00:00Z",
  },
};
