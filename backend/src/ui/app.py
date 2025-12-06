# src/ui/app.py
import streamlit as st
import pandas as pd
import numpy as np
import joblib
import os
import matplotlib.pyplot as plt
from datetime import datetime

st.set_page_config(layout="wide", page_title="Hex20 Nightly Demo — Improved UI")

# ---- Helpers ----
DATA_BIN = "data/telemetry.bin"
PROCESSED_CSV = "data/processed.csv"
FLAGGED_CSV = "data/flagged_events.csv"
MODEL_DIR = "model"

FEATURES = ["battery_v","solar_i","temp","cpu"] + [f"extra{i}" for i in range(8)]

def load_processed():
    if os.path.exists(PROCESSED_CSV):
        df = pd.read_csv(PROCESSED_CSV)
        # ensure ts is readable
        if "ts" in df.columns:
            try:
                df["ts_human"] = pd.to_datetime(df["ts"], unit="s")
            except Exception:
                df["ts_human"] = df["ts"]
        return df
    else:
        # fallback to read raw bin if processed csv not found
        try:
            from src.telemetry.generator import read_bin
            df = read_bin(DATA_BIN)
            df["ts_human"] = pd.to_datetime(df["ts"], unit="s")
            return df
        except Exception:
            return pd.DataFrame()

def load_models(model_dir=MODEL_DIR):
    iso, lr, scaler = None, None, None
    try:
        iso = joblib.load(os.path.join(model_dir, "isoforest.joblib"))
    except Exception:
        iso = None
    try:
        lr = joblib.load(os.path.join(model_dir, "lr_battery.joblib"))
    except Exception:
        lr = None
    try:
        scaler = joblib.load(os.path.join(model_dir, "scaler.joblib"))
    except Exception:
        scaler = None
    return iso, lr, scaler

def compute_health_summary(df):
    # rule-based critical: battery < 3.2 or temp > 70 or comm==2
    if df.empty: 
        return {"critical":0,"warning":0,"normal":0}
    rule = ((df["battery_v"] < 3.2) | (df["temp"] > 70) | (df["comm"]==2))
    iso = df.get("iso_flag", pd.Series(0, index=df.index)).fillna(0).astype(int)
    lr = df.get("lr_batt_flag", pd.Series(0, index=df.index)).fillna(0).astype(int)
    combined = ((rule) | (iso==1) | (lr==1))
    critical = int(rule.sum())
    warning = int(((combined) & (~rule)).sum())
    normal = int((~combined).sum())
    return {"critical":critical,"warning":warning,"normal":normal}

def zscore_explain(df, idx, features=FEATURES, top_k=3):
    # compute simple z-scores using mean/std on the dataset
    vals = {}
    if df.empty or idx not in df.index:
        return vals
    feat_arr = df[features].fillna(0.0)
    mu = feat_arr.mean()
    sd = feat_arr.std().replace(0, 1e-6)
    row = feat_arr.loc[idx]
    z = ((row - mu) / sd).abs().sort_values(ascending=False)
    top = z.head(top_k)
    for f,score in top.items():
        vals[f] = float(score)
    return vals

def plot_timeseries(df, metric, anomalies_mask=None, ax=None):
    if df.empty:
        return None
    x = df["ts_human"]
    y = df[metric]
    if ax is None:
        fig, ax = plt.subplots(figsize=(8,3))
    else:
        fig = ax.figure
    ax.plot(x, y, label=metric)
    if anomalies_mask is not None and anomalies_mask.any():
        ax.scatter(x[anomalies_mask], y[anomalies_mask], color="red", s=20, label="anomaly")
    ax.set_ylabel(metric)
    ax.legend(loc="upper right", fontsize="small")
    ax.grid(alpha=0.2)
    return fig

# ---- Load data + models ----
st.title("Hex20 — Nightly Telemetry Test (Improved UI)")
st.markdown("Interactive dashboard that shows telemetry, model predictions, and explanations. "
            "Use the Controls to re-run processing or trigger demo anomalies.")

df = load_processed()
iso_model, lr_model, scaler = load_models()

# Top summary
summary = compute_health_summary(df)
col_a, col_b, col_c, col_d = st.columns([2,1,1,1])
with col_a:
    st.subheader("Telemetry overview")
    if df.empty:
        st.info("No telemetry found. Run processing or generate telemetry first.")
    else:
        st.write(f"Rows: **{len(df):,}** — Time range: **{df['ts_human'].min()}** → **{df['ts_human'].max()}**")
with col_b:
    st.metric("Critical", summary["critical"], delta=None)
with col_c:
    st.metric("Warnings", summary["warning"], delta=None)
with col_d:
    st.metric("Normal", summary["normal"], delta=None)

st.markdown("---")

# Controls & actions
ctrl1, ctrl2, ctrl3 = st.columns([1,1,1])
with ctrl1:
    if st.button("Run processing now"):
        st.info("Running pipeline (this will call your local pipeline).")
        # call pipeline; requires PYTHONPATH set in environment or package installed
        try:
            # Use os.system to preserve user's environment; user must ensure PYTHONPATH or package set
            cmd = 'python -m src.pipeline.process_pipeline --input data/telemetry.bin --output data/processed.csv --model_dir model'
            st.code(cmd, language="bash")
            res = os.system(cmd)
            if res == 0:
                st.success("Processing finished. Reloading data...")
                df = load_processed()
            else:
                st.error("Processing returned non-zero exit code. Check console for errors.")
        except Exception as e:
            st.error(f"Failed to run pipeline: {e}")
with ctrl2:
    if st.button("Inject demo anomaly (non-destructive)"):
        # Create an in-memory anomaly preview: mark last row as low battery/high temp or add sample
        st.warning("Injecting demo anomaly into view only (does not modify files).")
        if not df.empty:
            df = df.copy()
            i = df.index[-1]
            df.loc[i, "battery_v"] = df.loc[i, "battery_v"] - 0.8
            df.loc[i, "temp"] = df.loc[i, "temp"] + 35
            df.loc[i, "comm"] = 2
            # Mark flags for UI demo
            df.loc[i, "rule_flag"] = 1
            df.loc[i, "combined_flag"] = 1
            df.loc[i, "iso_flag"] = 1
with ctrl3:
    st.write("Models available:")
    if os.path.exists(MODEL_DIR):
        st.write(os.listdir(MODEL_DIR))
    else:
        st.info("No model directory found")

st.markdown("---")

# Main layout: left charts, right details
left, right = st.columns([2,1])

# Left: Time series plots
with left:
    st.header("Time-series dashboard")
    if df.empty:
        st.info("No data to plot")
    else:
        # choose window / filters
        max_rows = st.slider("Rows to show (most recent)", min_value=100, max_value=min(5000, len(df)), value=800, step=100)
        df_view = df.tail(max_rows).reset_index(drop=True)

        # anomalies mask
        anomalies_mask = df_view.get("combined_flag", pd.Series(0, index=df_view.index)).fillna(0).astype(int).astype(bool)

        # Battery plot with prediction (if LR model present)
        fig_batt = plot_timeseries(df_view, "battery_v", anomalies_mask)
        # overlay predicted next values if lr_model present: compute sliding windows and predict next for each valid point
        if lr_model is not None:
            try:
                win = 5
                batt_series = df_view["battery_v"].fillna(method="ffill").values
                Xw = []
                idxs = []
                for i in range(len(batt_series)-win):
                    Xw.append(batt_series[i:i+win])
                    idxs.append(i+win)
                if len(Xw) > 0:
                    preds = lr_model.predict(np.array(Xw))
                    # create a series aligned with idxs
                    pred_series = pd.Series(index=df_view.index, dtype=float)
                    for p_i, idx in enumerate(idxs):
                        pred_series.at[idx] = preds[p_i]
                    ax = fig_batt.axes[0]
                    ax.plot(df_view["ts_human"], pred_series, linestyle="--", label="LR predicted next", alpha=0.7)
                    ax.legend()
            except Exception:
                pass
        st.pyplot(fig_batt)

        # Temp and Solar plots side by side
        fig_temp = plot_timeseries(df_view, "temp", anomalies_mask)
        fig_solar = plot_timeseries(df_view, "solar_i", anomalies_mask)
        cols = st.columns(2)
        with cols[0]:
            st.pyplot(fig_temp)
        with cols[1]:
            st.pyplot(fig_solar)

# Right: anomalies table and explanation
with right:
    st.header("Anomalies & Explanation")
    if df.empty:
        st.info("No telemetry available")
    else:
        # Show counts and quick filter
        show_only_flagged = st.checkbox("Show only flagged events", value=True)
        if "combined_flag" in df.columns:
            if show_only_flagged:
                table = df[df["combined_flag"]==1].copy()
            else:
                table = df.copy()
        else:
            table = df.copy()
        # short display with selectable row
        table_display = table[["ts","ts_human","battery_v","temp","solar_i","cpu","comm","iso_flag","iso_score","lr_batt_flag","rule_flag","combined_flag"]].copy()
        table_display = table_display.sort_values("ts", ascending=False).reset_index(drop=True)
        sel = st.number_input("Select flagged row index (0 = newest)", min_value=0, max_value=max(0, len(table_display)-1), value=0, step=1)
        st.dataframe(table_display.head(200))

        if len(table_display) > 0:
            selected = table_display.iloc[sel]
            st.markdown("#### Selected event details")
            st.write(selected.to_dict())

            # Explain rule-based reasons
            reasons = []
            if selected["battery_v"] < 3.2:
                reasons.append("Battery below 3.2 V")
            if selected["temp"] > 70:
                reasons.append("Temperature > 70°C")
            if selected["comm"] == 2:
                reasons.append("Communication loss (comm==2)")
            if selected.get("iso_flag",0) == 1:
                reasons.append("IsolationForest flagged this point")
            if selected.get("lr_batt_flag",0) == 1:
                reasons.append("Prediction residual (battery) flagged this point")
            if len(reasons) == 0:
                reasons = ["No rule-based reason detected; flagged by combined model logic"]

            st.markdown("**Primary reasons:**")
            for r in reasons:
                st.write("•", r)

            # Show iso_score and top contributing features via simple z-score
            idx_global = table.index[sel] if (show_only_flagged and len(table)>0) else table.index[sel]
            z = zscore_explain(df, idx_global)
            if z:
                st.markdown("**Top feature deviations (z-score)**")
                for f,s in z.items():
                    st.write(f"{f}: z={s:.2f}")

            # Show prediction plot for this selected row: last N points + predicted next
            try:
                st.markdown("**Prediction preview (battery)**")
                # get global index of selected event in original df
                global_idx = table.index[sel]
                window = 12
                start = max(0, global_idx - window)
                sub = df.iloc[start:global_idx+1].copy().reset_index(drop=True)
                fig, ax = plt.subplots(figsize=(6,3))
                ax.plot(sub["ts_human"], sub["battery_v"], marker="o", label="actual")
                if lr_model is not None and len(sub) >= 5:
                    last_win = sub["battery_v"].values[-5:]
                    pred_next = lr_model.predict(last_win.reshape(1,-1))[0]
                    ax.scatter([sub["ts_human"].iloc[-1] + pd.Timedelta(seconds=60)], [pred_next], color="orange", label="predicted next")
                    ax.axhline(sub["battery_v"].mean(), color="gray", alpha=0.2)
                ax.set_ylabel("battery_v (V)")
                ax.legend()
                st.pyplot(fig)
            except Exception as e:
                st.write("Could not render prediction plot:", e)

st.markdown("---")
st.caption("UI built for demo. For production, connect to real telemetry storage and implement persistent annotation & logging.")
