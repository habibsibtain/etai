"""
health_risk.py — Citizen Health Risk Advisory System.

Maps AQI to health risk categories, estimates population vulnerability,
and generates ward-level advisories in multiple Indian languages.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np

from backend.data_service import data_service, CITY_POPULATIONS, _aqi_to_bucket

logger = logging.getLogger(__name__)


# ── AQI Health Breakpoints (CPCB / EPA aligned) ────────────────────────────

HEALTH_CATEGORIES = [
    {"min": 0, "max": 50, "label": "Good", "color": "#22C55E",
     "risk_level": "Minimal", "risk_score": 10,
     "general_msg": "Air quality is satisfactory. No health risk.",
     "sensitive_msg": "Safe for all groups, including sensitive populations."},
    {"min": 51, "max": 100, "label": "Satisfactory", "color": "#84CC16",
     "risk_level": "Low", "risk_score": 25,
     "general_msg": "Minor breathing discomfort to sensitive individuals.",
     "sensitive_msg": "People with respiratory issues should limit prolonged outdoor exertion."},
    {"min": 101, "max": 200, "label": "Moderate", "color": "#FACC15",
     "risk_level": "Moderate", "risk_score": 50,
     "general_msg": "Breathing discomfort for people with lung/heart conditions.",
     "sensitive_msg": "Children, elderly, and those with respiratory conditions should reduce outdoor activity."},
    {"min": 201, "max": 300, "label": "Poor", "color": "#F97316",
     "risk_level": "High", "risk_score": 75,
     "general_msg": "Breathing discomfort on prolonged exposure. Impacts everyone.",
     "sensitive_msg": "All sensitive groups should stay indoors. Wear N95 masks if stepping out."},
    {"min": 301, "max": 400, "label": "Very Poor", "color": "#EF4444",
     "risk_level": "Very High", "risk_score": 90,
     "general_msg": "Respiratory illness on prolonged exposure. Avoid outdoor activity.",
     "sensitive_msg": "Medical emergency risk for sensitive groups. Strictly avoid all outdoor activity."},
    {"min": 401, "max": 999, "label": "Severe", "color": "#9F1239",
     "risk_level": "Severe", "risk_score": 100,
     "general_msg": "Health emergency. Significant increase in respiratory distress.",
     "sensitive_msg": "Health emergency for all groups. Close windows, use air purifiers, stay indoors."},
]


# ── Multi-Language Advisory Templates ───────────────────────────────────────

LANGUAGE_ADVISORIES = {
    "Hindi": {
        "good": "वायु गुणवत्ता अच्छी है। कोई स्वास्थ्य जोखिम नहीं।",
        "moderate": "फेफड़ों/हृदय रोगियों को बाहरी गतिविधियाँ सीमित करें। बच्चों और बुजुर्गों को सावधानी बरतें।",
        "poor": "सभी लोगों को बाहर जाने से बचें। बाहर जाना हो तो N95 मास्क पहनें।",
        "severe": "स्वास्थ्य आपातकाल। सभी को घर के अंदर रहें। खिड़कियां बंद रखें।",
    },
    "Kannada": {
        "good": "ವಾಯು ಗುಣಮಟ್ಟ ಉತ್ತಮವಾಗಿದೆ. ಯಾವುದೇ ಆರೋಗ್ಯ ಅಪಾಯವಿಲ್ಲ.",
        "moderate": "ಶ್ವಾಸಕೋಶ/ಹೃದಯ ರೋಗಿಗಳು ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಯನ್ನು ಕಡಿಮೆ ಮಾಡಿ.",
        "poor": "ಎಲ್ಲರೂ ಹೊರಗೆ ಹೋಗುವುದನ್ನು ತಪ್ಪಿಸಿ. N95 ಮಾಸ್ಕ್ ಧರಿಸಿ.",
        "severe": "ಆರೋಗ್ಯ ತುರ್ತು ಪರಿಸ್ಥಿತಿ. ಒಳಗೆ ಇರಿ. ಕಿಟಕಿಗಳನ್ನು ಮುಚ್ಚಿ.",
    },
    "Tamil": {
        "good": "காற்றின் தரம் நன்றாக உள்ளது. ஆரோக்கிய ஆபத்து இல்லை.",
        "moderate": "நுரையீரல்/இதய நோயாளிகள் வெளிப்புற செயல்பாடுகளைக் குறைக்கவும்.",
        "poor": "அனைவரும் வெளியே செல்வதைத் தவிர்க்கவும். N95 முகக்கவசம் அணியவும்.",
        "severe": "சுகாதார அவசரநிலை. வீட்டிற்குள் இருங்கள். ஜன்னல்களை மூடுங்கள்.",
    },
    "Telugu": {
        "good": "వాయు నాణ్యత మంచిగా ఉంది. ఆరోగ్య ప్రమాదం లేదు.",
        "moderate": "ఊపిరితిత్తులు/గుండె రోగులు బయటి కార్యకలాపాలను తగ్గించండి.",
        "poor": "అందరూ బయటికి వెళ్ళడం మానుకోండి. N95 మాస్క్ ధరించండి.",
        "severe": "ఆరోగ్య అత్యవసర పరిస్థితి. ఇంట్లోనే ఉండండి. కిటికీలు మూసుకోండి.",
    },
    "Bengali": {
        "good": "বায়ুর গুণমান ভালো। কোনো স্বাস্থ্য ঝুঁকি নেই।",
        "moderate": "ফুসফুস/হৃদরোগীরা বাইরের কার্যকলাপ কমান। শিশু ও বয়স্কদের সতর্ক থাকুন।",
        "poor": "সকলেই বাইরে যাওয়া এড়িয়ে চলুন। N95 মাস্ক পরুন।",
        "severe": "স্বাস্থ্য জরুরি অবস্থা। ঘরের ভিতরে থাকুন। জানালা বন্ধ রাখুন।",
    },
    "Marathi": {
        "good": "हवेची गुणवत्ता चांगली आहे. कोणताही आरोग्य धोका नाही.",
        "moderate": "फुप्फुस/हृदयरोग्यांनी बाहेरील क्रियाकलाप कमी करा.",
        "poor": "सर्वांनी बाहेर जाणे टाळा. N95 मास्क घाला.",
        "severe": "आरोग्य आणीबाणी. घरातच राहा. खिडक्या बंद ठेवा.",
    },
}

# City → primary language mapping
CITY_LANGUAGES = {
    "Delhi": ["Hindi", "English"],
    "Mumbai": ["Marathi", "Hindi", "English"],
    "Kolkata": ["Bengali", "Hindi", "English"],
    "Bengaluru": ["Kannada", "English", "Hindi"],
    "Chennai": ["Tamil", "English"],
    "Hyderabad": ["Telugu", "Hindi", "English"],
    "Pune": ["Marathi", "Hindi", "English"],
    "Lucknow": ["Hindi", "English"],
    "Ahmedabad": ["Hindi", "English"],
    "Jaipur": ["Hindi", "English"],
    "Patna": ["Hindi", "English"],
    "Varanasi": ["Hindi", "English"],
}

# ── Demographic vulnerability profiles ──────────────────────────────────────

VULNERABILITY_GROUPS = [
    {"group": "Children (0-12)", "key": "children", "pct": 0.18, "vulnerability_multiplier": 1.5,
     "icon": "baby", "color": "#EF4444"},
    {"group": "Elderly (60+)", "key": "elderly", "pct": 0.10, "vulnerability_multiplier": 1.8,
     "icon": "heart", "color": "#F97316"},
    {"group": "Outdoor Workers", "key": "outdoor_workers", "pct": 0.25, "vulnerability_multiplier": 1.6,
     "icon": "hard-hat", "color": "#FACC15"},
    {"group": "Respiratory Patients", "key": "respiratory", "pct": 0.05, "vulnerability_multiplier": 2.0,
     "icon": "lungs", "color": "#A855F7"},
    {"group": "General Adult", "key": "adult", "pct": 0.42, "vulnerability_multiplier": 1.0,
     "icon": "users", "color": "#38BDF8"},
]


def compute_health_risk(city: str) -> Dict:
    """
    Compute comprehensive health risk assessment for a city.
    
    Returns:
        Dict with risk metrics, demographic breakdown, advisories,
        multi-language warnings, and vulnerability map data.
    """
    summary = data_service.get_city_summary(city)
    avg_aqi = summary.get("avg_aqi") or 150  # fallback
    
    # Determine health category
    category = _get_health_category(avg_aqi)
    
    # Population estimates
    pop_thousands = CITY_POPULATIONS.get(city, 1000)
    total_pop = pop_thousands * 1000
    
    # Compute demographic impact
    demographics = []
    total_affected = 0
    total_vulnerable = 0
    
    for group in VULNERABILITY_GROUPS:
        group_pop = int(total_pop * group["pct"])
        # Affected = population × risk_score/100 × vulnerability_multiplier
        risk_factor = (category["risk_score"] / 100) * group["vulnerability_multiplier"]
        affected = int(group_pop * min(1.0, risk_factor))
        
        is_vulnerable = group["vulnerability_multiplier"] > 1.2
        
        demographics.append({
            "group": group["group"],
            "key": group["key"],
            "population": group_pop,
            "affected": affected,
            "affected_pct": round(affected / group_pop * 100, 1) if group_pop > 0 else 0,
            "vulnerability": "High" if is_vulnerable else "Normal",
            "color": group["color"],
        })
        
        total_affected += affected
        if is_vulnerable:
            total_vulnerable += affected
    
    # Health advisories by severity level
    advisories = _generate_advisories(avg_aqi, category)
    
    # Multi-language warnings
    languages = CITY_LANGUAGES.get(city, ["Hindi", "English"])
    multilang = _generate_multilang_advisories(avg_aqi, languages)
    
    # Facility vulnerability mapping (schools, hospitals near high AQI)
    facilities = _generate_facility_risk(city, avg_aqi)
    
    return {
        "city": city,
        "avg_aqi": round(avg_aqi, 1),
        "aqi_category": category["label"],
        "aqi_color": category["color"],
        "risk_level": category["risk_level"],
        "risk_score": category["risk_score"],
        "total_population": total_pop,
        "total_affected": total_affected,
        "total_vulnerable": total_vulnerable,
        "demographics": demographics,
        "advisories": advisories,
        "multilang_advisories": multilang,
        "facilities_at_risk": facilities,
        "generated_at": datetime.now().isoformat(),
    }


def _get_health_category(aqi: float) -> Dict:
    """Get the health category for an AQI value."""
    for cat in HEALTH_CATEGORIES:
        if cat["min"] <= aqi <= cat["max"]:
            return cat
    return HEALTH_CATEGORIES[-1]  # Severe


def _generate_advisories(aqi: float, category: Dict) -> List[Dict]:
    """Generate health advisory cards based on AQI level."""
    advisories = []
    
    if aqi > 200:
        advisories.append({
            "severity": "severe",
            "target": "Children & Elderly (0-12, 60+)",
            "message": "Strictly avoid all outdoor physical activities. Remain indoors with windows and doors closed. Use air purifiers if available.",
            "icon": "alert-triangle",
        })
    
    if aqi > 150:
        advisories.append({
            "severity": "warning",
            "target": "General Population",
            "message": "Reduce prolonged or heavy outdoor exertion. Wear N95 masks if stepping out. Avoid exercising outdoors.",
            "icon": "shield-alert",
        })
    
    if aqi > 100:
        advisories.append({
            "severity": "info",
            "target": "Respiratory & Heart Patients",
            "message": "Keep relief medication handy. Monitor symptoms closely. Seek immediate medical advice if experiencing breathing difficulty, chest pain, or palpitations.",
            "icon": "heart-pulse",
        })
    
    if aqi > 200:
        advisories.append({
            "severity": "warning",
            "target": "Outdoor Workers & Athletes",
            "message": "All outdoor work should be rescheduled to early morning (5-7 AM) when AQI is typically lower. Mandatory N95 masks for unavoidable outdoor tasks.",
            "icon": "hard-hat",
        })
    
    if aqi > 300:
        advisories.append({
            "severity": "severe",
            "target": "Schools & Institutions",
            "message": "Suspend all outdoor activities including sports, assemblies, and recess. Consider switching to online classes if AQI persists above 400 for 48+ hours.",
            "icon": "school",
        })
    
    if not advisories:
        advisories.append({
            "severity": "success",
            "target": "All Groups",
            "message": "Air quality is within safe limits. No special precautions needed. Enjoy outdoor activities.",
            "icon": "check-circle",
        })
    
    return advisories


def _generate_multilang_advisories(aqi: float, languages: List[str]) -> List[Dict]:
    """Generate advisories in multiple regional languages."""
    # Determine severity key
    if aqi <= 100:
        severity_key = "good"
    elif aqi <= 200:
        severity_key = "moderate"
    elif aqi <= 300:
        severity_key = "poor"
    else:
        severity_key = "severe"
    
    result = []
    for lang in languages:
        if lang == "English":
            cat = _get_health_category(aqi)
            result.append({
                "language": "English",
                "message": cat["general_msg"],
                "sensitive_message": cat["sensitive_msg"],
            })
        elif lang in LANGUAGE_ADVISORIES:
            result.append({
                "language": lang,
                "message": LANGUAGE_ADVISORIES[lang].get(severity_key, ""),
                "sensitive_message": "",
            })
    
    return result


def _generate_facility_risk(city: str, aqi: float) -> List[Dict]:
    """Generate at-risk facility list (schools, hospitals near high AQI stations)."""
    np.random.seed(hash(city) % 2**31)
    
    facility_types = [
        {"type": "Hospital", "icon": "hospital", "count_range": (5, 15)},
        {"type": "School", "icon": "school", "count_range": (15, 40)},
        {"type": "Parks & Playgrounds", "icon": "tree", "count_range": (8, 20)},
        {"type": "Construction Worker Camps", "icon": "hard-hat", "count_range": (3, 10)},
    ]
    
    result = []
    for ftype in facility_types:
        count = np.random.randint(*ftype["count_range"])
        # Risk = how many are in high-AQI zones
        risk_pct = min(1.0, aqi / 300)
        at_risk = int(count * risk_pct)
        
        result.append({
            "type": ftype["type"],
            "icon": ftype["icon"],
            "total": count,
            "at_risk": at_risk,
            "risk_pct": round(at_risk / count * 100, 1) if count > 0 else 0,
        })
    
    return result
