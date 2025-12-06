
import time, struct, random, os
import numpy as np
import pandas as pd

PACKET_FMT = ">I f f f B B H 4f 8f"
PACKET_SIZE = struct.calcsize(PACKET_FMT)
FIELD_NAMES = ["ts","battery_v","solar_i","temp","cpu","comm","flags",
               "qx","qy","qz","qw"] + [f"extra{i}" for i in range(8)]

def generate_synthetic(n_minutes=1440, sample_interval_sec=60, inject_anoms=False):
    start_ts = int(time.time())
    timestamps = [start_ts + i*sample_interval_sec for i in range(n_minutes)]
    # simple dynamics
    t = np.arange(n_minutes)
    orbit = np.sin(2*np.pi*t/90)
    battery = 3.9 - 0.0002*t + 0.05*(orbit.clip(min=0)) + np.random.normal(0,0.01,n_minutes)
    solar = 0.2 + 0.15*(orbit.clip(min=0)) + np.random.normal(0,0.01,n_minutes)
    temp = 25 + 4*orbit + np.random.normal(0,0.5,n_minutes)
    cpu = np.clip(20 + np.random.normal(0,5,n_minutes).astype(int), 1, 95)
    comm = np.zeros(n_minutes, dtype=int)
    extras = np.random.normal(0,1,(n_minutes,8))
    df = pd.DataFrame({ "ts": timestamps, "battery_v": battery, "solar_i": solar,
                       "temp": temp, "cpu": cpu, "comm": comm, "flags": 0 })
    for i in range(8):
        df[f"extra{i}"] = extras[:,i]
    if inject_anoms:
        idx = np.random.choice(n_minutes, size=max(1,int(n_minutes*0.02)), replace=False)
        df.loc[idx, "battery_v"] -= np.random.uniform(0.3,1.0,size=len(idx))
        df.loc[idx, "temp"] += np.random.uniform(10,40,size=len(idx))
        df.loc[idx, "comm"] = 2
    return df

def pack_row_to_bytes(row):
    vals = (int(row["ts"]), float(row["battery_v"]), float(row["solar_i"]),
            float(row["temp"]), int(row["cpu"]), int(row["comm"]), int(row.get("flags",0)),
            float(row.get("qx",1.0)), float(row.get("qy",0.0)), float(row.get("qz",0.0)), float(row.get("qw",0.0)))
    extras = tuple(float(row[f"extra{i}"]) for i in range(8))
    return struct.pack(PACKET_FMT, *vals, *extras)

def save_to_bin(df, path="data/telemetry.bin"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        for _, row in df.iterrows():
            f.write(pack_row_to_bytes(row))

def read_bin(path="data/telemetry.bin"):
    rows = []
    with open(path, "rb") as f:
        while True:
            chunk = f.read(PACKET_SIZE)
            if not chunk or len(chunk) < PACKET_SIZE:
                break
            vals = struct.unpack(PACKET_FMT, chunk)
            row = dict(zip(FIELD_NAMES, vals))
            rows.append(row)
    return pd.DataFrame(rows)

if __name__ == "__main__":
    df = generate_synthetic(n_minutes=1440, inject_anoms=True)
    save_to_bin(df, "data/telemetry.bin")
    print("Generated and saved telemetry:", len(df))
