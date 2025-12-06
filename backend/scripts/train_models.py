# train_models.py
# Put this file at src/scripts/train_models.py and run with Python in project root.
import os, joblib
import numpy as np, pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
import struct

# paths
DATA_BIN = "data/telemetry.bin"
MODEL_DIR = "model"
os.makedirs(MODEL_DIR, exist_ok=True)

# packet format used in repo
PACKET_FMT = ">I f f f B B H 4f 8f"
PACKET_SIZE = struct.calcsize(PACKET_FMT)
FIELD_NAMES = ["ts","battery_v","solar_i","temp","cpu","comm","flags",
               "qx","qy","qz","qw"] + [f"extra{i}" for i in range(8)]

def read_bin(path=DATA_BIN):
    rows=[]
    with open(path,"rb") as f:
        while True:
            chunk = f.read(PACKET_SIZE)
            if not chunk or len(chunk)<PACKET_SIZE:
                break
            vals = struct.unpack(PACKET_FMT, chunk)
            rows.append(dict(zip(FIELD_NAMES, vals)))
    return pd.DataFrame(rows)

print("Reading telemetry from", DATA_BIN)
df = read_bin(DATA_BIN)
if df.empty:
    raise SystemExit("No telemetry found; run generator first (scripts/generate_and_save.py)")

# features for IsolationForest
features = ["battery_v","solar_i","temp","cpu"] + [f"extra{i}" for i in range(8)]
X = df[features].fillna(0.0).values

# isolate normal subset (assume majority normal) - here take first 70% as "train"
n = int(0.7 * len(X))
X_train = X[:n]

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)

print("Training IsolationForest...")
iso = IsolationForest(n_estimators=200, contamination=0.03, random_state=42)
iso.fit(X_train_s)

# Save scaler and iso model
joblib.dump(scaler, os.path.join(MODEL_DIR,"scaler.joblib"))
joblib.dump(iso, os.path.join(MODEL_DIR,"isoforest.joblib"))
print("Saved IsolationForest and scaler to", MODEL_DIR)

# Train Linear Regression for battery prediction (window method)
win = 5
batt = df["battery_v"].fillna(method="ffill").values
Xw, yw = [], []
for i in range(len(batt)-win-1):
    Xw.append(batt[i:i+win])
    yw.append(batt[i+win])
Xw = np.array(Xw); yw = np.array(yw)
split = int(0.7 * len(Xw))
Xb_train, yb_train = Xw[:split], yw[:split]

print("Training LinearRegression for battery...")
lr = LinearRegression()
lr.fit(Xb_train, yb_train)
joblib.dump(lr, os.path.join(MODEL_DIR,"lr_battery.joblib"))
print("Saved LR model to", MODEL_DIR)

print("All models trained and saved. You can now run the pipeline.")
