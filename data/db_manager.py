import sqlite3
import os
import uuid
from datetime import datetime

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "farm_twin.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_profile_data(farmer_id="user"):
    """
    Fetches the farmer's profile, including all fields and their active crop plantings.
    """
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Get farmer info
        cursor.execute("SELECT * FROM farmers WHERE farmer_id = ?", (farmer_id,))
        farmer = cursor.fetchone()
        if not farmer:
            # Fallback/Auto-create default user
            cursor.execute("INSERT INTO farmers VALUES (?, ?, ?)", (farmer_id, "Farmer", "Hindi"))
            conn.commit()
            cursor.execute("SELECT * FROM farmers WHERE farmer_id = ?", (farmer_id,))
            farmer = cursor.fetchone()
            
        profile = {
            "farmer_id": farmer["farmer_id"],
            "name": farmer["name"],
            "language": farmer["language"],
            "fields": []
        }
        
        # Get fields
        cursor.execute("SELECT * FROM fields WHERE farmer_id = ?", (farmer_id,))
        fields = cursor.fetchall()
        
        for field in fields:
            field_data = {
                "field_id": field["field_id"],
                "name": field["name"],
                "soil_type": field["soil_type"],
                "acres": field["acres"],
                "irrigation_type": field["irrigation_type"],
                "planting": None
            }
            
            # Get active crop planting for this field
            cursor.execute("SELECT * FROM plantings WHERE field_id = ?", (field["field_id"],))
            planting = cursor.fetchone()
            if planting:
                field_data["planting"] = {
                    "planting_id": planting["planting_id"],
                    "crop_type": planting["crop_type"],
                    "variety": planting["variety"],
                    "planting_date": planting["planting_date"],
                    "stage": planting["stage"],
                    "nitrogen_ppm": planting["nitrogen_ppm"],
                    "moisture_pct": planting["moisture_pct"],
                    "health_pct": planting["health_pct"]
                }
            
            profile["fields"].append(field_data)
            
        return profile
    finally:
        conn.close()

def save_farmer_field(farmer_id, name, soil_type, acres, irrigation_type, crop_type, variety="Default", stage="germination"):
    """
    Adds a new field and seeds an initial crop planting record for it.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        field_id = f"field_{uuid.uuid4().hex[:8]}"
        planting_id = f"planting_{uuid.uuid4().hex[:8]}"
        planting_date = datetime.now().strftime("%Y-%m-%d")
        
        # Insert Field
        cursor.execute(
            "INSERT INTO fields VALUES (?, ?, ?, ?, ?, ?)",
            (field_id, farmer_id, name, soil_type, float(acres), irrigation_type)
        )
        
        # Insert Planting
        cursor.execute(
            "INSERT INTO plantings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (planting_id, field_id, crop_type, variety, planting_date, stage, 40.0, 45.0, 100.0)
        )
        
        conn.commit()
        return {"field_id": field_id, "planting_id": planting_id}
    finally:
        conn.close()

def update_planting_telemetry(planting_id, moisture_pct, health_pct, nitrogen_ppm):
    """
    Updates the physical telemetry readings for a specific crop planting.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE plantings 
            SET moisture_pct = ?, health_pct = ?, nitrogen_ppm = ? 
            WHERE planting_id = ?
            """,
            (float(moisture_pct), float(health_pct), float(nitrogen_ppm), planting_id)
        )
        conn.commit()
        return True
    finally:
        conn.close()
