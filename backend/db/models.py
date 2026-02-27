"""SQLite schema definitions for the schools database."""

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS schools (
    urn INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    phase TEXT,
    admissions_policy TEXT,
    age_low INTEGER,
    age_high INTEGER,
    num_pupils INTEGER,
    postcode TEXT,
    latitude REAL,
    longitude REAL,
    ofsted_rating TEXT,
    ofsted_date TEXT,
    ks2_reading REAL,
    ks2_maths REAL,
    ks4_attainment8 REAL,
    ks4_progress8 REAL,
    ks4_dest_education REAL,
    ks4_dest_apprenticeships REAL,
    ks4_dest_employment REAL,
    ks5_dest_higher_education REAL,
    ks5_dest_further_education REAL,
    ks5_dest_apprenticeships REAL,
    ks5_dest_employment REAL,
    ks5_dest_russell_group REAL,
    ks5_dest_oxbridge REAL,
    ks5_dest_top_third REAL,
    fsm_percent REAL,
    ethnicity_white REAL,
    ethnicity_mixed REAL,
    ethnicity_asian REAL,
    ethnicity_black REAL,
    ethnicity_other REAL,
    ethnicity_white_british REAL,
    ethnicity_irish REAL,
    ethnicity_gypsy_roma REAL,
    ethnicity_other_white REAL,
    ethnicity_mixed_white_black_caribbean REAL,
    ethnicity_mixed_white_black_african REAL,
    ethnicity_mixed_white_asian REAL,
    ethnicity_other_mixed REAL,
    ethnicity_indian REAL,
    ethnicity_pakistani REAL,
    ethnicity_bangladeshi REAL,
    ethnicity_chinese REAL,
    ethnicity_other_asian REAL,
    ethnicity_black_caribbean REAL,
    ethnicity_black_african REAL,
    ethnicity_other_black REAL
);

CREATE INDEX IF NOT EXISTS idx_schools_lat_lng ON schools(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_schools_postcode ON schools(postcode);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
"""

CATCHMENT_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS catchment (
    urn INTEGER NOT NULL,
    year INTEGER NOT NULL,
    last_distance_offered REAL,
    offers_made INTEGER,
    applications INTEGER,
    PRIMARY KEY (urn, year)
);
CREATE INDEX IF NOT EXISTS idx_catchment_urn ON catchment(urn);
"""

COLUMNS = [
    "urn", "name", "type", "phase", "admissions_policy", "age_low", "age_high",
    "num_pupils", "postcode", "latitude", "longitude",
    "ofsted_rating", "ofsted_date",
    "ks2_reading", "ks2_maths", "ks4_attainment8", "ks4_progress8",
    "ks4_dest_education", "ks4_dest_apprenticeships", "ks4_dest_employment",
    "ks5_dest_higher_education", "ks5_dest_further_education",
    "ks5_dest_apprenticeships", "ks5_dest_employment",
    "ks5_dest_russell_group", "ks5_dest_oxbridge", "ks5_dest_top_third",
    "fsm_percent",
    "ethnicity_white", "ethnicity_mixed", "ethnicity_asian",
    "ethnicity_black", "ethnicity_other",
    "ethnicity_white_british", "ethnicity_irish", "ethnicity_gypsy_roma",
    "ethnicity_other_white",
    "ethnicity_mixed_white_black_caribbean", "ethnicity_mixed_white_black_african",
    "ethnicity_mixed_white_asian", "ethnicity_other_mixed",
    "ethnicity_indian", "ethnicity_pakistani", "ethnicity_bangladeshi",
    "ethnicity_chinese", "ethnicity_other_asian",
    "ethnicity_black_caribbean", "ethnicity_black_african", "ethnicity_other_black",
]
