import sqlite3
import os

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "farm_twin.db")

def init_database():
    print(f"Initializing database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Create Farmers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farmers (
        farmer_id TEXT PRIMARY KEY,
        name TEXT,
        language TEXT
    )
    """)
    
    # 2. Create Fields table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fields (
        field_id TEXT PRIMARY KEY,
        farmer_id TEXT,
        name TEXT,
        soil_type TEXT,
        acres REAL,
        irrigation_type TEXT,
        FOREIGN KEY(farmer_id) REFERENCES farmers(farmer_id)
    )
    """)
    
    # 3. Create Plantings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS plantings (
        planting_id TEXT PRIMARY KEY,
        field_id TEXT,
        crop_type TEXT,
        variety TEXT,
        planting_date TEXT,
        stage TEXT,
        nitrogen_ppm REAL,
        moisture_pct REAL,
        health_pct REAL,
        FOREIGN KEY(field_id) REFERENCES fields(field_id)
    )
    """)
    
    # 4. Insert Default Mock Data
    cursor.execute("INSERT OR REPLACE INTO farmers VALUES ('user', 'Nalin Giri', 'Hindi')")
    
    # Fields
    cursor.execute("INSERT OR REPLACE INTO fields VALUES ('field_1', 'user', 'North Hillside', 'Black Clay (Cotton Soil)', 5.0, 'Drip')")
    cursor.execute("INSERT OR REPLACE INTO fields VALUES ('field_2', 'user', 'Riverbed Meadow', 'Red Sandy Loam', 8.0, 'Sprinkler')")
    
    # Plantings
    cursor.execute("INSERT OR REPLACE INTO plantings VALUES ('planting_1', 'field_1', 'Corn', 'PMH-1', '2026-06-01', 'germination', 45.0, 40.0, 100.0)")
    cursor.execute("INSERT OR REPLACE INTO plantings VALUES ('planting_2', 'field_2', 'Wheat', 'Lokwan', '2026-06-10', 'vegetative', 55.0, 45.0, 95.0)")
    
    conn.commit()
    conn.close()
    print("Database initialization completed successfully.")

if __name__ == "__main__":
    init_database()
