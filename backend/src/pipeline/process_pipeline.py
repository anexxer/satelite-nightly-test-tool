
import argparse, os, joblib, numpy as np, pandas as pd
from src.telemetry.generator import read_bin
from src.ai.anomaly_detector import AnomalyDetector

FEATURES = ["battery_v","solar_i","temp","cpu"] + [f"extra{i}" for i in range(8)]

def rule_checks(df):
    # simple rule-based severity flags
    return ((df["battery_v"] < 3.2) | (df["temp"] > 70) | (df["comm"]==2)).astype(int)

def run_pipeline(input_path="data/telemetry.bin", output_csv="data/processed.csv", model_dir="model"):
    df = read_bin(input_path)
    if df.empty:
        print("No telemetry found")
        return
    detector = AnomalyDetector(model_path=os.path.join(model_dir,"isoforest.joblib"),
                               scaler_path=os.path.join(model_dir,"scaler.joblib"),
                               lr_path=os.path.join(model_dir,"lr_battery.joblib"))
    X = df[FEATURES].fillna(0.0).values
    iso_flags, iso_scores = detector.predict_iso(X)
    df["iso_flag"] = iso_flags
    df["iso_score"] = iso_scores
    # simple LR battery residual detection using sliding window
    win = 5
    batt = df["battery_v"].fillna(method="ffill").values
    lr_flags = np.zeros(len(df), dtype=int)
    if detector.lr is not None and len(batt) > win+1:
        Xw, yw = [], []
        for i in range(len(batt)-win-1):
            Xw.append(batt[i:i+win])
            yw.append(batt[i+win])
        Xw = np.array(Xw)
        preds = detector.lr.predict(Xw)
        residuals = np.abs(np.array(yw) - preds)
        thr = residuals.mean() + 3*residuals.std()
        for i, r in enumerate(residuals):
            if r > thr:
                lr_flags[win + i] = 1
    df["lr_batt_flag"] = lr_flags
    df["rule_flag"] = rule_checks(df)
    df["combined_flag"] = ((df["rule_flag"]==1) | (df["iso_flag"]==1) | (df["lr_batt_flag"]==1)).astype(int)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    # save flagged events separately
    df[df["combined_flag"]==1].to_csv(os.path.join(os.path.dirname(output_csv),"flagged_events.csv"), index=False)
    print("Processed", len(df), "rows. Flags saved to", output_csv)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/telemetry.bin")
    parser.add_argument("--output", default="data/processed.csv")
    parser.add_argument("--model_dir", default="model")
    args = parser.parse_args()
    run_pipeline(args.input, args.output, args.model_dir)
