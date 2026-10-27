import sys
import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, RobustScaler

# Ensure project root is accessible in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

OUTPUT_DIR = os.path.join(ROOT_DIR, "data", "malmem")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Load Preprocessed Kaggle MalMem File
input_file = os.path.join(ROOT_DIR, "Obfuscated-MalMem2022.csv")
print(f"Loading {input_file}...")
df = pd.read_csv(input_file, low_memory=False)
df.columns = df.columns.str.strip()
raw_count = len(df)
print(f"Loaded Shape: {df.shape}")

# 2. Verification Checks
print("=== Verification & Integrity Check ===")
# Handle Inf / NaN values if any exist
df.replace([np.inf, -np.inf], np.nan, inplace=True)
nan_count = df.isnull().sum().sum()
if nan_count > 0:
    print(f"Warning: Found {nan_count} NaN values. Imputing with median...")
    df.fillna(df.median(numeric_only=True), inplace=True)
else:
    print("Verification Passed: No NaN or Infinite values found.")

# Remove exact duplicates
init_len = len(df)
df.drop_duplicates(inplace=True)
if init_len != len(df):
    print(f"Removed {init_len - len(df)} duplicate records.")

# 3. Label Processing
if 'Class' not in df.columns or 'Category' not in df.columns:
    raise KeyError("Dataset must contain both 'Class' and 'Category' columns.")

df['Class'] = df['Class'].astype(str).str.strip()
df['Category'] = df['Category'].astype(str).str.strip()

# Encoders
le_class = LabelEncoder()
df['Class_Encoded'] = le_class.fit_transform(df['Class'])
class_mapping = {cls: int(idx) for idx, cls in enumerate(le_class.classes_)}

le_category = LabelEncoder()
df['Category_Encoded'] = le_category.fit_transform(df['Category'])
category_mapping = {cat: int(idx) for idx, cat in enumerate(le_category.classes_)}

joblib.dump(le_class, os.path.join(OUTPUT_DIR, "class_encoder.pkl"))
joblib.dump(le_category, os.path.join(OUTPUT_DIR, "category_encoder.pkl"))

# Separate Numerical Features
non_feature_cols = ['Class', 'Category', 'Class_Encoded', 'Category_Encoded', 'Raw_Class']
feature_cols = [c for c in df.columns if c not in non_feature_cols]
print(f"Verified {len(feature_cols)} memory feature columns.")

# 4. Stratified Split (Stratified on 'Class' to avoid single-instance category errors)
X = df[feature_cols]
meta_df = df[['Class', 'Category', 'Class_Encoded', 'Category_Encoded']]

# 70% Train, 30% Temp
X_train_raw, X_temp_raw, meta_train, meta_temp = train_test_split(
    X, meta_df, test_size=0.30, stratify=meta_df['Class'], random_state=42
)

# 15% Val, 15% Test
X_val_raw, X_test_raw, meta_val, meta_test = train_test_split(
    X_temp_raw, meta_temp, test_size=0.50, stratify=meta_temp['Class'], random_state=42
)

# 5. Robust Scaling (Fit strictly on Train)
scaler = RobustScaler()
X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train_raw), columns=feature_cols)
X_val_scaled = pd.DataFrame(scaler.transform(X_val_raw), columns=feature_cols)
X_test_scaled = pd.DataFrame(scaler.transform(X_test_raw), columns=feature_cols)
joblib.dump(scaler, os.path.join(OUTPUT_DIR, "scaler.pkl"))

# Combine features with metadata targets into unified dataframes
def merge_features_and_labels(feat_df, label_df):
    return pd.concat([feat_df.reset_index(drop=True), label_df.reset_index(drop=True)], axis=1)

train_full = merge_features_and_labels(X_train_scaled, meta_train)
val_full = merge_features_and_labels(X_val_scaled, meta_val)
test_full = merge_features_and_labels(X_test_scaled, meta_test)

# 6. Federated Partitioning (Windows 10 vs Kali Linux)
# Windows 10: Benign + Trojan dumps
# Kali Linux: Spyware + Ransomware dumps
win_mask = train_full['Category'].str.contains('Benign|Trojan', case=False, regex=True)
kali_mask = train_full['Category'].str.contains('Spyware|Ransomware', case=False, regex=True)

# Distribute remaining/unmatched samples by index
unassigned_mask = ~(win_mask | kali_mask)
if unassigned_mask.sum() > 0:
    win_mask = win_mask | (unassigned_mask & (train_full.index % 2 == 0))
    kali_mask = kali_mask | (unassigned_mask & (train_full.index % 2 != 0))

win_train = train_full[win_mask].reset_index(drop=True)
kali_train = train_full[kali_mask].reset_index(drop=True)

# 7. Save Files
win_train.to_csv(os.path.join(OUTPUT_DIR, "windows_train.csv"), index=False)
kali_train.to_csv(os.path.join(OUTPUT_DIR, "kali_train.csv"), index=False)
val_full.to_csv(os.path.join(OUTPUT_DIR, "validation.csv"), index=False)
test_full.to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)

# 8. Save Preprocessing Metadata
metadata = {
    "dataset_name": "CIC-MalMem-2022",
    "status": "Verified & Federated-Ready",
    "timestamp": datetime.now().isoformat(),
    "raw_records_count": raw_count,
    "clean_records_count": len(df),
    "feature_count": len(feature_cols),
    "feature_columns": feature_cols,
    "class_mapping": class_mapping,
    "category_mapping": category_mapping,
    "partition_statistics": {
        "windows_10_client": {
            "total_samples": len(win_train),
            "class_distribution": win_train['Class'].value_counts().to_dict(),
            "category_distribution": win_train['Category'].value_counts().to_dict()
        },
        "kali_linux_client": {
            "total_samples": len(kali_train),
            "class_distribution": kali_train['Class'].value_counts().to_dict(),
            "category_distribution": kali_train['Category'].value_counts().to_dict()
        },
        "server_validation": {
            "total_samples": len(val_full),
            "class_distribution": val_full['Class'].value_counts().to_dict()
        },
        "server_test": {
            "total_samples": len(test_full),
            "class_distribution": test_full['Class'].value_counts().to_dict()
        }
    }
}

with open(os.path.join(OUTPUT_DIR, "preprocessing_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=4)

print("\n=== MalMem-2022 Processing Complete ===")
print(f"Windows 10 Train : {win_train.shape}")
print(f"Kali Linux Train : {kali_train.shape}")
print(f"Validation Set   : {val_full.shape}")
print(f"Test Set         : {test_full.shape}")
print(f"Metadata file    : {os.path.join(OUTPUT_DIR, 'preprocessing_metadata.json')}")
