import sys
import os
import gc
import glob
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler, LabelEncoder

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

OUTPUT_DIR = os.path.join(ROOT_DIR, "data", "cicids")
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=== Step 7: Memory-Efficient Loading of 8 CIC-IDS-2017 CSVs ===")
raw_folder = os.path.join(ROOT_DIR, "raw_cicids")
files = sorted(glob.glob(os.path.join(raw_folder, "*.csv")))

if not files:
    raise FileNotFoundError(f"No CSV files found in {raw_folder}")

leakage_cols = ['Flow ID', 'Source IP', 'Source Port', 'Destination IP', 'Timestamp']
df_list = []

for f in files:
    print(f"Reading & chunk-cleaning: {os.path.basename(f)}...")
    df = pd.read_csv(f, encoding='latin-1', low_memory=True)
    df.columns = df.columns.str.strip()

    # Normalize label column
    if 'Label' not in df.columns:
        for col in df.columns:
            if 'label' in col.lower():
                df.rename(columns={col: 'Label'}, inplace=True)
                break

    # Standardize label strings early
    df['Label'] = (
        df['Label']
        .astype(str)
        .str.strip()
        .str.replace('ï¿½', '-', regex=False)
        .str.replace('–', '-', regex=False)
    )

    # Drop leakage columns per-file before concat
    df.drop(columns=[c for c in leakage_cols if c in df.columns], inplace=True, errors='ignore')

    # Replace Inf and drop NaNs
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)

    # Downcast floats & ints to 32-bit to save 50% RAM
    for col in df.select_dtypes(include=['float64']).columns:
        df[col] = df[col].astype(np.float32)
    for col in df.select_dtypes(include=['int64']).columns:
        df[col] = df[col].astype(np.int32)

    df_list.append(df)
    gc.collect()

print("Merging cleaned files...")
cicids = pd.concat(df_list, axis=0, ignore_index=True)
del df_list
gc.collect()

raw_count = len(cicids)
print(f"Total Combined Clean Rows: {raw_count} | Columns: {cicids.shape[1]}")

# 1. Target column definitions
cicids['Category'] = cicids['Label']
cicids['Binary_Class'] = np.where(cicids['Category'].str.upper() == 'BENIGN', 'BENIGN', 'ATTACK')

# 2. Deduplicate
init_len = len(cicids)
cicids.drop_duplicates(inplace=True)
print(f"Dropped {init_len - len(cicids)} duplicate flow records.")
gc.collect()

# 3. Drop Zero-Variance / Constant features
num_cols = cicids.select_dtypes(include=[np.number]).columns
const_cols = [c for c in num_cols if cicids[c].nunique() <= 1]
print(f"Zero-variance features removed ({len(const_cols)}): {const_cols}")
cicids.drop(columns=const_cols, inplace=True)

# 4. Encoders
le_category = LabelEncoder()
cicids['Label'] = le_category.fit_transform(cicids['Category'])
category_mapping = {cat: int(idx) for idx, cat in enumerate(le_category.classes_)}
joblib.dump(le_category, os.path.join(OUTPUT_DIR, "category_encoder.pkl"))

le_binary = LabelEncoder()
cicids['Binary_Class_Encoded'] = le_binary.fit_transform(cicids['Binary_Class'])
binary_mapping = {cls: int(idx) for idx, cls in enumerate(le_binary.classes_)}
joblib.dump(le_binary, os.path.join(OUTPUT_DIR, "binary_class_encoder.pkl"))

meta_cols = ['Category', 'Label', 'Binary_Class', 'Binary_Class_Encoded']
feature_cols = [c for c in cicids.columns if c not in meta_cols]
print(f"Preserved {len(feature_cols)} clean flow features.")

X = cicids[feature_cols]
meta_df = cicids[meta_cols]

print("=== Step 8: Train / Val / Test Split (70 / 15 / 15) ===")
X_train_raw, X_temp_raw, meta_train, meta_temp = train_test_split(
    X, meta_df, test_size=0.30, stratify=meta_df['Binary_Class'], random_state=42
)
del X, meta_df, cicids
gc.collect()

X_val_raw, X_test_raw, meta_val, meta_test = train_test_split(
    X_temp_raw, meta_temp, test_size=0.50, stratify=meta_temp['Binary_Class'], random_state=42
)
del X_temp_raw, meta_temp
gc.collect()

# 5. Robust Scaling
print("Applying Robust Scaling...")
scaler = RobustScaler()
X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train_raw), columns=feature_cols, dtype=np.float32)
del X_train_raw
gc.collect()

X_val_scaled = pd.DataFrame(scaler.transform(X_val_raw), columns=feature_cols, dtype=np.float32)
del X_val_raw
gc.collect()

X_test_scaled = pd.DataFrame(scaler.transform(X_test_raw), columns=feature_cols, dtype=np.float32)
del X_test_raw
gc.collect()

joblib.dump(scaler, os.path.join(OUTPUT_DIR, "scaler.pkl"))

# Assemble splits
train_full = pd.concat([X_train_scaled, meta_train.reset_index(drop=True)], axis=1)
del X_train_scaled, meta_train
gc.collect()

val_full = pd.concat([X_val_scaled, meta_val.reset_index(drop=True)], axis=1)
del X_val_scaled, meta_val
gc.collect()

test_full = pd.concat([X_test_scaled, meta_test.reset_index(drop=True)], axis=1)
del X_test_scaled, meta_test
gc.collect()

print("=== Step 9: Non-IID Federated Partitioning (Ubuntu 1 vs Ubuntu 2) ===")
ubuntu1_keywords = ['BENIGN', 'DoS', 'DDoS', 'PortScan']
u1_mask = train_full['Category'].apply(lambda x: any(k.lower() in x.lower() for k in ubuntu1_keywords))
u2_mask = ~u1_mask

u1_train = train_full[u1_mask].reset_index(drop=True)
u2_train = train_full[u2_mask].reset_index(drop=True)
del train_full
gc.collect()

print("=== Step 10: Saving Network Files & Preprocessing Metadata ===")
u1_train.to_csv(os.path.join(OUTPUT_DIR, "ubuntu1_train.csv"), index=False)
u2_train.to_csv(os.path.join(OUTPUT_DIR, "ubuntu2_train.csv"), index=False)
val_full.to_csv(os.path.join(OUTPUT_DIR, "validation.csv"), index=False)
test_full.to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)

metadata = {
    "dataset_name": "CIC-IDS-2017",
    "status": "Verified & Federated-Ready",
    "timestamp": datetime.now().isoformat(),
    "raw_records_count": raw_count,
    "feature_count": len(feature_cols),
    "feature_columns": feature_cols,
    "zero_variance_dropped": const_cols,
    "category_mapping": category_mapping,
    "binary_class_mapping": binary_mapping,
    "partition_statistics": {
        "ubuntu1_client": {"total_samples": len(u1_train)},
        "ubuntu2_client": {"total_samples": len(u2_train)},
        "server_validation": {"total_samples": len(val_full)},
        "server_test": {"total_samples": len(test_full)}
    }
}

with open(os.path.join(OUTPUT_DIR, "preprocessing_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=4)

print("\n=== CIC-IDS-2017 Preprocessing Finished Successfully ===")
print(f"Ubuntu 1 Train : {u1_train.shape}")
print(f"Ubuntu 2 Train : {u2_train.shape}")
print(f"Validation Set : {val_full.shape}")
print(f"Test Set       : {test_full.shape}")
