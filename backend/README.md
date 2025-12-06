
# Hex20 Nightly Test Demo (Modular - Option B)

**What this is:** A modular demo project that simulates CubeSat telemetry ingestion, scheduled nightly processing,
AI-based anomaly detection (IsolationForest + Linear Regression + Rule checks), and a Streamlit GUI for interaction.

**Structure:**
- `src/telemetry` : telemetry generator and binary reader/writer
- `src/ai` : anomaly detection & predictors (load models)
- `src/pipeline` : processing pipeline that ties telemetry -> AI -> outputs
- `src/scheduler` : APScheduler job example to run nightly (or test every minute)
- `src/ui` : Streamlit app for interactive GUI
- `model/` : trained models (isoforest.joblib, lr_battery.joblib, scaler.joblib)
- `data/` : telemetry.bin, battery_timeseries.png, flagged_events.csv (if present)

## Quick start (local)
1. Create and activate a Python 3.10+ venv and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. To run the GUI (recommended for demo):
   ```bash
   streamlit run src/ui/app.py
   ```
3. To run the scheduler (runs pipeline on schedule):
   ```bash
   python -m src.scheduler.nightly_scheduler
   ```
4. To run the pipeline manually:
   ```bash
   python -m src.pipeline.process_pipeline --input data/telemetry.bin --output data/processed.csv
   ```

## Notes
- The included `model/` folder contains example trained models created for a synthetic dataset.
- For a production setup, retrain models on real CubeSat telemetry and tune thresholds.
- The scheduler is configured for demo (runs every 1 minute). Change cron schedule in `nightly_scheduler.py` for real nightly runs.
