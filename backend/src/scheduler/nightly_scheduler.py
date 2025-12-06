
import time
from apscheduler.schedulers.blocking import BlockingScheduler
from src.pipeline.process_pipeline import run_pipeline

if __name__ == "__main__":
    scheduler = BlockingScheduler()
    # For demo: run every 1 minute. Change to cron for real nightly, e.g. scheduler.add_job(..., 'cron', hour=3)
    scheduler.add_job(run_pipeline, 'interval', minutes=1, args=["data/telemetry.bin","data/processed.csv","model"])
    print("Scheduler started (demo: runs every minute). Ctrl+C to stop.")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("Shutting down scheduler")
