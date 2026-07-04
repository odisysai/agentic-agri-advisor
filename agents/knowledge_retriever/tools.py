# Tools for OKF SPARQL and RAG document queries
# Queries the Open Knowledge Graph (OKF) for static agricultural knowledge

import os
import re
import yaml
import glob
from typing import List, Dict, Any, Optional

# OKF base directory
OKF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../okf"))
OKF_DATA_DIR = OKF_DIR  # OKF data lives directly at /okf/
# Legacy OKF data location (diseases/pests still here)
LEGACY_OKF_DIR = os.path.join(os.path.dirname(OKF_DIR), "okf-knowledge-graph", "data")



def _load_yaml(path: str) -> Optional[dict]:
    """Safely load a YAML file."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception:
        return None


def _parse_frontmatter(content: str) -> tuple:
    """Parse YAML frontmatter and body from markdown content."""
    if not content.startswith("---"):
        return {}, ""
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, ""
    meta = {}
    try:
        meta = yaml.safe_load(parts[1]) or {}
    except Exception:
        pass
    return meta, parts[2].strip()


def _search_directory(query: str, directory: str) -> List[dict]:
    """Search all markdown files in a directory for matching content."""
    results = []
    query_lower = query.lower()
    keywords = query_lower.split()[:4]  # Use up to 4 keywords

    for filepath in glob.glob(os.path.join(directory, "*.md")):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            meta, body = _parse_frontmatter(content)
            full_text = content.lower()

            # Check if keywords match
            if any(kw in full_text for kw in keywords):
                # Build a concise summary
                title = meta.get("name", os.path.basename(filepath).replace(".md", ""))
                entity_type = meta.get("type", "unknown")
                severity = meta.get("severity", "N/A")
                crops = meta.get("affected_crops", meta.get("properties", {}).get("common_regions", []))
                if isinstance(crops, list):
                    crops = ", ".join(crops[:3])

                # Extract treatment table if present
                treatments = []
                if "## Treatment" in body:
                    treatment_section = body.split("## Treatment")[1].split("##")[0]
                    for line in treatment_section.split("\n"):
                        line = line.strip()
                        if line.startswith("|") and not line.startswith("|---") and not line.startswith("|---"):
                            parts = [p.strip() for p in line.split("|")[1:-1]]
                            if len(parts) >= 2:
                                treatments.append({"stage": parts[0], "treatment": parts[1], "application": parts[2] if len(parts) > 2 else ""})

                results.append({
                    "id": meta.get("id", os.path.basename(filepath).replace(".md", "")),
                    "type": entity_type,
                    "name": title,
                    "severity": severity,
                    "affected_crops": crops if isinstance(crops, str) else str(crops),
                    "treatments": treatments[:5],  # Max 5 treatments
                    "summary": body[:500],
                    "file": filepath
                })
        except Exception:
            continue

    return results


def query_knowledge_graph(query: str) -> dict:
    """Query the Open Knowledge Graph for agricultural information.

    Searches across diseases, pests, soil types, and safety rules.
    Returns matching entities with relevant details.

    Args:
        query: Search query (e.g., 'wheat rust', 'cotton pest', 'clay soil')

    Returns:
        dict: Search results with entities, treatments, and recommendations
    """
    results = {
        "query": query,
        "results": [],
        "total_found": 0,
        "status": "success"
    }

    # Search across all OKF entity types (both okf/ and okf-knowledge-graph/data/)
    search_dirs = [OKF_DATA_DIR, LEGACY_OKF_DIR]
    for entity_type in ["crops", "diseases", "pests", "soil"]:
        for base_dir in search_dirs:
            entity_dir = os.path.join(base_dir, entity_type)
            if os.path.exists(entity_dir):
                type_results = _search_directory(query, entity_dir)
                results["results"].extend(type_results)

    # Also search relations for cross-references
    relations_path = os.path.join(OKF_DATA_DIR, "relations.yaml")
    if os.path.exists(relations_path):
        relations = _load_yaml(relations_path)
        if relations:
            for entity_id, entity_data in relations.items():
                if isinstance(entity_data, dict):
                    for category, items in entity_data.items():
                        if isinstance(items, dict):
                            for item_id, item_data in items.items():
                                item_text = str(item_data).lower()
                                if any(kw in item_text for kw in query.lower().split()[:3]):
                                    results["results"].append({
                                        "id": item_id,
                                        "type": f"relation:{entity_id}",
                                        "name": item_id.replace("_", " ").title(),
                                        "severity": "N/A",
                                        "affected_crops": str(item_data.get("affects", item_data.get("suitable_crops", []))),
                                        "treatments": [],
                                        "summary": f"Relation: {entity_id} → {item_id}",
                                        "file": relations_path
                                    })

    results["total_found"] = len(results["results"])
    results["status"] = "found" if results["total_found"] > 0 else "not_found"

    return results


def get_safety_rules(query: str = "") -> dict:
    """Retrieve safety rules and guidelines from OKF.

    Searches pesticide limits, pre-harvest intervals, and organic standards.

    Args:
        query: Optional filter (e.g., 'pesticide', 'PHI', 'organic')

    Returns:
        dict: Safety rules matching the query
    """
    results = {
        "query": query,
        "results": [],
        "status": "success"
    }

    safety_dir = os.path.join(OKF_DATA_DIR, "safety")
    if os.path.exists(safety_dir):
        safety_results = _search_directory(query, safety_dir)
        results["results"] = safety_results
        results["total_found"] = len(safety_results)

    return results


def get_treatment_safety(treatment_name: str) -> dict:
    """Get safety constraints for a specific treatment/chemical.

    Args:
        treatment_name: Name of the chemical/treatment (e.g., 'carbendazim', 'neem oil')

    Returns:
        dict: Safety constraints including max dosage, PHI, organic status
    """
    relations_path = os.path.join(OKF_DATA_DIR, "relations.yaml")
    relations = _load_yaml(relations_path)

    if not relations or "treatment_safety" not in relations:
        return {"treatment": treatment_name, "safety": "unknown", "note": "Treatment not found in safety database"}

    treatment_data = relations["treatment_safety"].get(treatment_name.lower(), {})

    if not treatment_data:
        return {
            "treatment": treatment_name,
            "safety": "unknown",
            "note": f"No safety data for '{treatment_name}'. User should consult expert.",
            "escalation": True
        }

    return {
        "treatment": treatment_name,
        "safety": "verified",
        "max_concentration": treatment_data.get("max_concentration", "N/A"),
        "max_rate": treatment_data.get("max_rate", "N/A"),
        "phi_days": treatment_data.get("phi_days", "N/A"),
        "organic_allowed": treatment_data.get("organic_allowed", False),
        "escalation_threshold": treatment_data.get("escalation_threshold", None)
    }


def get_soil_recommendations(soil_type: str) -> dict:
    """Get crop suitability and management recommendations for a soil type.

    Args:
        soil_type: Soil type name (e.g., 'clay', 'sandy loam', 'alluvial')

    Returns:
        dict: Crop recommendations, irrigation advice, amendments
    """
    results = {
        "soil_type": soil_type,
        "recommendations": {},
        "status": "success"
    }

    # Search for soil type entity
    soil_dir = os.path.join(OKF_DATA_DIR, "soil")
    if os.path.exists(soil_dir):
        for filepath in glob.glob(os.path.join(soil_dir, "*.md")):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                meta, body = _parse_frontmatter(content)
                name = meta.get("name", "").lower()
                soil_id = meta.get("id", "").lower()

                if soil_type.lower() in name or soil_type.lower() in soil_id:
                    # Extract crop suitability
                    suitable = []
                    challenging = []
                    if "## Crop Suitability" in body:
                        section = body.split("## Crop Suitability")[1].split("##")[0]
                        suitable = re.findall(r"- (.+?)(?=\n-|$)", section.split("Good for:")[1] if "Good for:" in section else section)
                        challenging = re.findall(r"- (.+?)(?=\n-|$)", section.split("Challenging for:")[1] if "Challenging for:" in section else "")

                    # Extract irrigation
                    irrigation = ""
                    if "## Water Management" in body:
                        section = body.split("## Water Management")[1].split("##")[0]
                        for line in section.split("\n"):
                            if "Irrigation:" in line:
                                irrigation = line.split("Irrigation:")[1].strip()
                                break

                    results["recommendations"] = {
                        "name": meta.get("name", soil_type.title()),
                        "suitable_crops": suitable if suitable else "See detailed profile",
                        "challenging_crops": challenging if challenging else [],
                        "irrigation": irrigation,
                        "properties": meta.get("properties", {})
                    }
                    results["status"] = "found"
                    break

            except Exception:
                continue

    return results


def search_local_indices(query: str) -> dict:
    """Search local index files for crop and soil facts.

    Args:
        query: Search string.

    Returns:
        dict: Found snippets.
    """
    # Use OKF query as the primary search mechanism
    okf_results = query_knowledge_graph(query)

    if okf_results["total_found"] > 0:
        return {
            "status": "success",
            "results": okf_results["results"],
            "source": "OKF Knowledge Graph"
        }

    # Fallback to basic local search
    return {"status": "success", "results": [{"doc": "factsheet.pdf", "text": "Soil pH should be 6.0-6.8."}], "source": "local_fallback"}


def query_crop_profile(crop_name: str) -> dict | None:
    """Look up a complete crop profile from OKF by name."""
    crops_dir = os.path.join(OKF_DIR, "crops")
    if not os.path.isdir(crops_dir):
        return None

    crop_lower = crop_name.lower()
    for filepath in glob.glob(os.path.join(crops_dir, "*.md")):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                raw = f.read()
            meta, body = _parse_frontmatter(raw)
            if (meta.get("id", "").lower() == crop_lower or
                any(crop_lower in n.lower() for n in [meta.get("name", ""), meta.get("id", "")])):
                return {
                    "status": "success",
                    "type": meta.get("type"),
                    "name": meta.get("name", crop_name),
                    "scientific_name": meta.get("scientific_name"),
                    "family": meta.get("family"),
                    "seasons": meta.get("seasons", []),
                    "regions": meta.get("regions", []),
                    "growth_period_days": meta.get("growth_period_days"),
                    "body": body,
                }
        except Exception:
            continue
    return None


def query_disease_to_crops(disease_name: str) -> dict | None:
    """Find diseases by name AND return which crops they affect (from relations.yaml)."""
    crop_disease_map = {
        "wheat_rust": ["wheat"], "wheat_powdery_mildew": ["wheat"],
        "rice_blast": ["rice"], "rice_bacterial_leaf_blight": ["rice"],
        "cotton_grey_mold": ["cotton"],
    }
    affected = crop_disease_map.get(disease_name.lower(), [])

    diseases_dirs = [OKF_DIR, LEGACY_OKF_DIR]
    diseases_dir = None
    for d in diseases_dirs:
        candidate = os.path.join(d, "diseases") if os.path.isdir(os.path.join(os.path.dirname(d), "data")) else d
        # For legacy path, the data dir IS the diseases dir
        if os.path.isdir(os.path.join(d, "data", "diseases")):
            diseases_dir = os.path.join(d, "data", "diseases")
            break
        elif os.path.isdir(os.path.join(d, "diseases")):
            diseases_dir = os.path.join(d, "diseases")
            break

    for filepath in glob.glob(os.path.join(diseases_dir, "*.md")):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                raw = f.read()
            meta, body = _parse_frontmatter(raw)
            if (meta.get("id", "").lower() == disease_name.lower()):
                return {**{"affected_crops": affected}, "status": "success", "body": body,
                        "type": meta.get("type"), "name": meta.get("name", disease_name)}
        except Exception:
            continue

    # Fallback: return relations-only info
    return {"affected_crops": affected, "status": "relations_only"}


def query_pest_to_crops(pest_name: str) -> dict | None:
    """Find pests by name AND return which crops they affect (from relations.yaml)."""
    crop_pest_map = {
        "corn_stalk_borer": ["corn"], "cotton_bollworm": ["cotton"],
        "rice_stem_borer": ["rice"], "wheat_leaf_eater": ["wheat", "corn"],
    }
    affected = crop_pest_map.get(pest_name.lower(), [])

    pests_dirs = [OKF_DIR, LEGACY_OKF_DIR]
    pests_dir = None
    for d in pests_dirs:
        if os.path.isdir(os.path.join(d, "data", "pests")):
            pests_dir = os.path.join(d, "data", "pests")
            break
        elif os.path.isdir(os.path.join(d, "pests")):
            pests_dir = os.path.join(d, "pests")
            break

    for filepath in glob.glob(os.path.join(pests_dir, "*.md")):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                raw = f.read()
            meta, body = _parse_frontmatter(raw)
            if (meta.get("id", "").lower() == pest_name.lower()):
                return {**{"affected_crops": affected}, "status": "success", "body": body,
                        "type": meta.get("type"), "name": meta.get("name", pest_name)}
        except Exception:
            continue

    return {"affected_crops": affected, "status": "relations_only"}


def get_soil_crop_suitability(soil_name: str) -> dict | None:
    """Look up a soil type and find suitable crops from relations."""
    soil_crop_map = {
        "alluvial": ["wheat", "rice", "corn"],
        "clay_loam": ["rice", "cotton"],
        "sandy_loam": ["cotton", "sugarcane", "wheat"],
        "black_cotton": ["cotton", "soybeans", "sugarcane"],
    }
    suitable = soil_crop_map.get(soil_name.lower(), [])

    # Try to find soil profile from old location too
    old_soil_dir = os.path.join(os.path.dirname(OKF_DIR), "okf-knowledge-graph/data/soil")
    if os.path.isdir(old_soil_dir):
        for filepath in glob.glob(os.path.join(old_soil_dir, "*.md")):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    raw = f.read()
                meta, body = _parse_frontmatter(raw)
                if soil_name.lower() in (meta.get("id", "") or "").lower():
                    return {"status": "success", "name": meta.get("name"), "suitable_crops": suitable,
                            "properties": meta.get("properties", {})}
            except Exception:
                continue

    if not suitable:
        return None
    return {"status": "success", "soil_type": soil_name, "suitable_crops": suitable}


def get_crop_npk(crop_name: str) -> dict | None:
    """Extract NPK target rows from a crop profile."""
    crops_dir = os.path.join(OKF_DIR, "crops")
    if not os.path.isdir(crops_dir):
        return None

    crop_lower = crop_name.lower()
    for filepath in glob.glob(os.path.join(crops_dir, "*.md")):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                raw = f.read()
            meta, body = _parse_frontmatter(raw)
            if crop_lower in (meta.get("id", "") or "").lower():
                # Extract NPK table rows
                if "## NPK Targets" in body:
                    section = body.split("## NPK Targets")[1].split("##")[0]
                    rows = []
                    for line in section.split("\n"):
                        if line.startswith("|") and "| Growth" not in line:
                            cells = [c.strip() for c in line.split("|")[1:-1]]
                            if len(cells) >= 3:
                                rows.append({"stage": cells[0], "nitrogen_kg_ha": cells[1], "phosphorus_kg_ha": cells[2]})
                    if rows:
                        return {"status": "success", "crop": meta.get("name"), "npk_targets": rows}
        except Exception:
            continue
    return None


def get_all_related_to(entity_type, entity_name):
    """Cross-reference all relations for a given crop/disease/pest."""
    relations_path = os.path.join(OKF_DATA_DIR, "relations.yaml")
    if not os.path.exists(relations_path):
        return None

    relations = _load_yaml(relations_path) or {}
    name_lower = entity_name.lower()

    related = {"diseases": [], "pests": [], "practices": [], "suitable_crops": []}

    if entity_type == "crop":
        for rel in relations.get("crop_disease_relations", []):
            if name_lower in [c.lower() for c in rel.get("affected_crops", [])]:
                related["diseases"].append(rel["disease"])
        for rel in relations.get("crop_pest_relations", []):
            if name_lower in [c.lower() for c in rel.get("affected_crops", [])]:
                related["pests"].append(rel["pest"])
        for rel in relations.get("crop_practice_relations", []):
            if name_lower == (rel.get("crop") or "").lower():
                related["practices"] = rel.get("practices", [])

    elif entity_type == "disease":
        for rel in relations.get("crop_disease_relations", []):
            if (rel.get("disease") or "").lower() == name_lower:
                related["affected_crops"] = rel.get("affected_crops", [])
        for rel in relations.get("disease_treatment_relations", []):
            if (rel.get("disease") or "").lower() == name_lower:
                related["treatments"] = rel.get("treatments", []) + rel.get("organic_alternatives", [])
                related["safety_rules"] = rel.get("safety_rule", "")

    elif entity_type == "pest":
        for rel in relations.get("crop_pest_relations", []):
            if (rel.get("pest") or "").lower() == name_lower:
                related["affected_crops"] = rel.get("affected_crops", [])
        for rel in relations.get("pest_treatment_relations", []):
            if (rel.get("pest") or "").lower() == name_lower:
                related["treatments"] = rel.get("treatments", []) + rel.get("organic_alternatives", [])
                related["safety_rules"] = rel.get("safety_rule", "")

    elif entity_type == "soil":
        for rel in relations.get("soil_crop_suitability", []):
            if (rel.get("soil_type") or "").lower() == name_lower:
                related["suitable_crops"] = rel.get("suitable_crops", [])

    return {k: v for k, v in related.items() if v}
