"""
InnovX Automated Bill of Materials (BOM) & Unit Cost Estimator Engine (Day 36).
Decomposes technical inventions into an itemized, realistic Bill of Materials (BOM),
landed component unit costs, batch volume scaling curves (10, 1k, 10k units),
NRE tooling investments, and recommended retail MSRP pricing models.
"""
from typing import Any, Dict, List, Optional
import numpy as np


def estimate_bill_of_materials(
    title: str,
    domain: Optional[str] = "Deep Tech",
    features: Optional[List[Any]] = None,
    components: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Synthesizes an engineering Bill of Materials with unit costs,
    category distribution, and batch volume economies of scale.
    """
    clean_features = []
    if features:
        for f in features:
            if isinstance(f, dict):
                clean_features.append(f.get("description", str(f)))
            else:
                clean_features.append(str(f))

    # Base domain taxonomy heuristic templates
    title_lower = title.lower()
    domain_lower = (domain or "").lower()

    is_biotech_medical = any(k in title_lower or k in domain_lower for k in ["drug", "bio", "cell", "medical", "ultrasound", "cavitation", "therapy", "dna", "pharma"])
    is_robotics_hardware = any(k in title_lower or k in domain_lower for k in ["robot", "actuator", "drone", "motor", "sensor", "vehicle", "autonomous", "quadruped"])
    is_energy_cleantech = any(k in title_lower or k in domain_lower for k in ["battery", "solar", "energy", "grid", "storage", "hydrogen", "photovoltaic"])

    bom_items: List[Dict[str, Any]] = []

    if is_biotech_medical:
        bom_items = [
            {
                "id": "BOM-01",
                "name": "High-Q PZT-4 Piezoelectric Transducer Array (40 kHz)",
                "category": "Sensors & Transducers",
                "quantity": 2,
                "unit_cost_prototype": 145.00,
                "unit_cost_pilot": 48.00,
                "unit_cost_mass": 22.50,
                "supplier_tier": "Specialized Medical OEM (APC International)",
                "lead_time_weeks": 6,
                "criticality": "High (Core Acoustic Generator)",
            },
            {
                "id": "BOM-02",
                "name": "Phospholipid Membrane Lipid Excipient Formulation (GMP Grade)",
                "category": "Chemical & Reagents",
                "quantity": 10,
                "unit_cost_prototype": 85.00,
                "unit_cost_pilot": 24.00,
                "unit_cost_mass": 7.80,
                "supplier_tier": "Biopharma Contract Synthesis (Avanti Polar Lipids)",
                "lead_time_weeks": 4,
                "criticality": "High (Microbubble Envelope)",
            },
            {
                "id": "BOM-03",
                "name": "High-Speed Acoustic Cavitation Driver MCU (ARM Cortex-M7 480MHz)",
                "category": "Compute & Processing",
                "quantity": 1,
                "unit_cost_prototype": 28.50,
                "unit_cost_pilot": 11.20,
                "unit_cost_mass": 6.10,
                "supplier_tier": "Off-the-Shelf Tier 1 (STMicroelectronics)",
                "lead_time_weeks": 2,
                "criticality": "Moderate (Waveform Modulation)",
            },
            {
                "id": "BOM-04",
                "name": "Passive Acoustic Detector Array & Low-Noise RF Preamp",
                "category": "Sensors & Transducers",
                "quantity": 1,
                "unit_cost_prototype": 95.00,
                "unit_cost_pilot": 32.00,
                "unit_cost_mass": 14.50,
                "supplier_tier": "Analog Devices / Custom RF Front-End",
                "lead_time_weeks": 5,
                "criticality": "High (Closed-Loop Feedback)",
            },
            {
                "id": "BOM-05",
                "name": "Medical-Grade Biocompatible PEEK Enclosure & Acoustic Coupler",
                "category": "Mechanical & Tooling",
                "quantity": 1,
                "unit_cost_prototype": 120.00,
                "unit_cost_pilot": 28.00,
                "unit_cost_mass": 9.50,
                "supplier_tier": "ISO 13485 Injection Molding (Protolabs)",
                "lead_time_weeks": 8,
                "criticality": "High (Biocompatibility ISO 10993)",
            },
            {
                "id": "BOM-06",
                "name": "Isolated 40W Switching Medical Power Supply Unit (IEC 60601-1)",
                "category": "Power & Energy",
                "quantity": 1,
                "unit_cost_prototype": 55.00,
                "unit_cost_pilot": 22.00,
                "unit_cost_mass": 11.00,
                "supplier_tier": "Mean Well / CUI Inc",
                "lead_time_weeks": 3,
                "criticality": "Moderate (Patient Electrical Isolation)",
            },
        ]
    elif is_robotics_hardware:
        bom_items = [
            {
                "id": "BOM-01",
                "name": "High-Torque Brushless DC (BLDC) Planetary Actuator Module",
                "category": "Motors & Actuation",
                "quantity": 4,
                "unit_cost_prototype": 180.00,
                "unit_cost_pilot": 65.00,
                "unit_cost_mass": 32.00,
                "supplier_tier": "Direct Drive Robotics OEM",
                "lead_time_weeks": 6,
                "criticality": "High (Locomotion & Torque)",
            },
            {
                "id": "BOM-02",
                "name": "Edge AI Inference Core (NVIDIA Jetson Orin Nano 8GB)",
                "category": "Compute & Processing",
                "quantity": 1,
                "unit_cost_prototype": 299.00,
                "unit_cost_pilot": 210.00,
                "unit_cost_mass": 165.00,
                "supplier_tier": "NVIDIA Distribution Tier 1",
                "lead_time_weeks": 4,
                "criticality": "High (Visual SLAM & Kinematics)",
            },
            {
                "id": "BOM-03",
                "name": "Solid-State LiDAR Distance & Depth Perception Sensor",
                "category": "Sensors & Transducers",
                "quantity": 1,
                "unit_cost_prototype": 160.00,
                "unit_cost_pilot": 75.00,
                "unit_cost_mass": 38.00,
                "supplier_tier": "Livox / RoboSense OEM",
                "lead_time_weeks": 5,
                "criticality": "High (Obstacle Avoidance)",
            },
            {
                "id": "BOM-04",
                "name": "Aerospace CNC 6061-T6 Aluminum Structural Chassis",
                "category": "Mechanical & Tooling",
                "quantity": 1,
                "unit_cost_prototype": 240.00,
                "unit_cost_pilot": 55.00,
                "unit_cost_mass": 21.00,
                "supplier_tier": "5-Axis CNC Milling Contract Fab",
                "lead_time_weeks": 7,
                "criticality": "High (Rigidity & Payload)",
            },
            {
                "id": "BOM-05",
                "name": "24V 15Ah LiFePO4 Smart BMS Battery Pack",
                "category": "Power & Energy",
                "quantity": 1,
                "unit_cost_prototype": 110.00,
                "unit_cost_pilot": 52.00,
                "unit_cost_mass": 31.00,
                "supplier_tier": "Custom Pack Assembler (Samsung SDI Cells)",
                "lead_time_weeks": 4,
                "criticality": "High (Run-time & Safety)",
            },
        ]
    else:
        # General Deep Tech / Hardware System
        bom_items = [
            {
                "id": "BOM-01",
                "name": "Primary Embedded Processing Subsystem & FPGA Core",
                "category": "Compute & Processing",
                "quantity": 1,
                "unit_cost_prototype": 115.00,
                "unit_cost_pilot": 42.00,
                "unit_cost_mass": 21.50,
                "supplier_tier": "Xilinx / AMD Distribution",
                "lead_time_weeks": 4,
                "criticality": "High (Core Algorithmic Pipeline)",
            },
            {
                "id": "BOM-02",
                "name": "Multi-Modal Sensor Transduction & Signal Conditioning Front-End",
                "category": "Sensors & Transducers",
                "quantity": 2,
                "unit_cost_prototype": 75.00,
                "unit_cost_pilot": 28.00,
                "unit_cost_mass": 12.80,
                "supplier_tier": "Texas Instruments / Analog Devices",
                "lead_time_weeks": 3,
                "criticality": "High (Data Acquisition)",
            },
            {
                "id": "BOM-03",
                "name": "Custom 6-Layer Impedance-Controlled PCB Assembly (PCBA)",
                "category": "Electronics & PCBA",
                "quantity": 1,
                "unit_cost_prototype": 85.00,
                "unit_cost_pilot": 19.50,
                "unit_cost_mass": 8.20,
                "supplier_tier": "JLCPCB / Sanmina SMT Assembly",
                "lead_time_weeks": 3,
                "criticality": "High (System Interconnect)",
            },
            {
                "id": "BOM-04",
                "name": "Shielded EMI Anodized Enclosure & Heat Dissipation Spreader",
                "category": "Mechanical & Tooling",
                "quantity": 1,
                "unit_cost_prototype": 95.00,
                "unit_cost_pilot": 24.00,
                "unit_cost_mass": 9.00,
                "supplier_tier": "Extrusion & Sheet Metal Fabricator",
                "lead_time_weeks": 6,
                "criticality": "Moderate (Thermal Regulation)",
            },
            {
                "id": "BOM-05",
                "name": "Regulated Wide-Input DC-DC Power Management Subsystem",
                "category": "Power & Energy",
                "quantity": 1,
                "unit_cost_prototype": 45.00,
                "unit_cost_pilot": 15.00,
                "unit_cost_mass": 6.80,
                "supplier_tier": "Murata / Vicor Power",
                "lead_time_weeks": 2,
                "criticality": "Moderate (Power Stability)",
            },
        ]

    # Calculate Totals across volume tiers
    proto_unit_bom = sum(item["unit_cost_prototype"] * item["quantity"] for item in bom_items)
    pilot_unit_bom = sum(item["unit_cost_pilot"] * item["quantity"] for item in bom_items)
    mass_unit_bom = sum(item["unit_cost_mass"] * item["quantity"] for item in bom_items)

    nre_prototype = 4500.00
    nre_pilot = 18500.00
    nre_mass = 52000.00

    target_hardware_multiplier = 3.6  # Standard deep-tech 65-72% gross margin target
    recommended_msrp = round(mass_unit_bom * target_hardware_multiplier, -1) if mass_unit_bom > 50 else round(mass_unit_bom * target_hardware_multiplier, 0)
    gross_margin_pct = round(((recommended_msrp - mass_unit_bom) / recommended_msrp) * 100, 1)

    # Category Breakdown
    categories: Dict[str, float] = {}
    for item in bom_items:
        cat = item["category"]
        cost = item["unit_cost_pilot"] * item["quantity"]
        categories[cat] = categories.get(cat, 0.0) + cost

    category_breakdown = [
        {"category": k, "pilot_cost": round(v, 2), "percentage": round((v / pilot_unit_bom) * 100, 1)}
        for k, v in sorted(categories.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "title": title,
        "domain": domain,
        "bom_items": bom_items,
        "unit_bom_prototype": round(proto_unit_bom, 2),
        "unit_bom_pilot": round(pilot_unit_bom, 2),
        "unit_bom_mass": round(mass_unit_bom, 2),
        "batch_tiers": [
            {
                "batch_name": "Prototype Run",
                "units": 10,
                "unit_bom": round(proto_unit_bom, 2),
                "nre_tooling_cost": nre_prototype,
                "total_run_investment": round((proto_unit_bom * 10) + nre_prototype, 2),
                "typical_timeline": "4-6 weeks",
                "purpose": "Benchtop validation, lab testing, mentor review",
            },
            {
                "batch_name": "Pilot Pre-Series",
                "units": 1000,
                "unit_bom": round(pilot_unit_bom, 2),
                "nre_tooling_cost": nre_pilot,
                "total_run_investment": round((pilot_unit_bom * 1000) + nre_pilot, 2),
                "typical_timeline": "12-16 weeks",
                "purpose": "Kickstarter early-bird fulfillment, clinical beta tests",
            },
            {
                "batch_name": "Mass Commercial Scale",
                "units": 10000,
                "unit_bom": round(mass_unit_bom, 2),
                "nre_tooling_cost": nre_mass,
                "total_run_investment": round((mass_unit_bom * 10000) + nre_mass, 2),
                "typical_timeline": "24-30 weeks",
                "purpose": "Global enterprise distribution & certified production line",
            },
        ],
        "pricing_model": {
            "recommended_target_msrp": recommended_msrp,
            "target_gross_margin_pct": gross_margin_pct,
            "break_even_units": int(np.ceil(nre_pilot / (recommended_msrp - pilot_unit_bom))),
            "pricing_recommendation": f"At mass scale ($ {round(mass_unit_bom, 2)} unit BOM), a recommended retail MSRP of ${recommended_msrp:,.0f} delivers a healthy {gross_margin_pct}% gross margin.",
        },
        "category_breakdown": category_breakdown,
        "confidence_score": 88,
    }
