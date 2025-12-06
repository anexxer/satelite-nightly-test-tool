
import asyncio
import os
import sys
import threading
import time
import struct
from contextlib import asynccontextmanager
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to sys.path to ensure absolute imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.ai.anomaly_detector import AnomalyDetector
from src.telemetry.generator import FIELD_NAMES

# --- Simulation Logic ---


class TelemetrySimulator:
    def __init__(self):
        self.data_buffer = []
        self.max_buffer_size = 1000
        self.running = False
        self.tick_count = 0
        self.detector = AnomalyDetector(
            model_path="model/isoforest.joblib",
            scaler_path="model/scaler.joblib",
            lr_path="model/lr_battery.joblib"
        )
        self.lock = threading.Lock()
        
        # Simulation state
        self.current_anomaly_type = None
        self.anomaly_duration = 0
    
    def start(self):
        if not self.running:
            self.running = True
            threading.Thread(target=self._run_loop, daemon=True).start()
    
    def stop(self):
        self.running = False


    def _generate_point(self, t):
        # Math from generator.py
        orbit = np.sin(2*np.pi*t/90)
        
        # Base dynamics
        # Noise increased slightly for visibility
        battery = 3.9 - 0.0002*(t % 1440) + 0.05*(max(0, orbit)) + np.random.normal(0,0.02)
        solar = 0.2 + 0.15*(max(0, orbit)) + np.random.normal(0,0.02)
        temp = 25 + 4*orbit + np.random.normal(0,0.8)
        cpu = max(1, min(95, 20 + int(np.random.normal(0,5))))
        comm = 0
        
        # Extras (noise)
        extras = [np.random.normal(0,1) for _ in range(8)]
        
        # Automatic Random Anomaly Injection (approx every 30-60s)
        if self.anomaly_duration == 0 and np.random.random() < 0.02:
            rand_type = np.random.choice(['battery', 'temp', 'comm'])
            self.inject(rand_type)
        
        # Apply Active Anomaly
        if self.anomaly_duration > 0:
            if self.current_anomaly_type == 'battery':
                battery -= np.random.uniform(0.5, 1.2) # Stronger drop
            elif self.current_anomaly_type == 'temp':
                temp += np.random.uniform(15, 50)      # Stronger spike
            elif self.current_anomaly_type == 'comm':
                comm = 2
            
            self.anomaly_duration -= 1
            if self.anomaly_duration <= 0:
                self.current_anomaly_type = None

        point = {
            "timestamp": int(time.time() * 1000), 
            "battery_v": float(battery),
            "solar_i": float(solar),
            "temp": float(temp),
            "cpu": int(cpu),
            "comm": int(comm),
            "id": t
        }
        
        for i, val in enumerate(extras):
            point[f"extra{i}"] = float(val)
            
        return point

    def _run_loop(self):
        while self.running:
            point = self._generate_point(self.tick_count)
            self.tick_count += 1
            
            # AI Prediction
            # FEATURES = ["battery_v","solar_i","temp","cpu"] + [f"extra{i}" for i in range(8)]
            feats = [point['battery_v'], point['solar_i'], point['temp'], point['cpu']]
            feats.extend([point[f"extra{i}"] for i in range(8)])
            
            features = np.array([feats])
            
            is_anomaly = 0
            iso_score = 0.0
            
            if self.detector.iso and self.detector.scaler:
                try:
                    flag, scores = self.detector.predict_iso(features)
                    is_anomaly = int(flag[0])
                    iso_score = float(scores[0])
                except Exception as e:
                    print(f"Prediction error: {e}")

            # Append metadata
            point['iso_flag'] = is_anomaly
            point['iso_score'] = iso_score
            point['combined_flag'] = 1 if (is_anomaly or point['battery_v'] < 3.2 or point['temp'] > 70 or point['comm'] == 2) else 0
            
            with self.lock:
                self.data_buffer.append(point)
                if len(self.data_buffer) > self.max_buffer_size:
                    self.data_buffer.pop(0)
            
            time.sleep(1.0) 

    def get_latest(self, n=50):
        with self.lock:
            return list(self.data_buffer[-n:])

    def inject(self, anomaly_type):
        self.current_anomaly_type = anomaly_type
        self.anomaly_duration = 5 # Anomaly lasts 5 seconds (5 data points)


# --- API Setup ---

simulator = TelemetrySimulator()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting simulation...")
    # Pre-fill buffer slightly
    for i in range(50):
        simulator._run_loop()
        if i == 0: simulator.running = True # Hack to run loop once 
        simulator.running = False
    
    simulator.start()
    yield
    # Shutdown
    simulator.stop()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnomalyRequest(BaseModel):
    type: str

@app.get("/telemetry")
def get_telemetry():
    return simulator.get_latest(300)

@app.get("/stats")
def get_stats():
    data = simulator.get_latest(300)
    if not data:
        return {"critical": 0, "warning": 0, "normal": 0}
    
    critical = sum(1 for d in data if d['battery_v'] < 3.2 or d['temp'] > 70 or d['comm'] == 2)
    warning = sum(1 for d in data if d['combined_flag'] == 1) - critical
    normal = len(data) - critical - warning
    
    return {"critical": critical, "warning": max(0, warning), "normal": max(0, normal)}

@app.post("/inject_anomaly")
def inject_anomaly(req: AnomalyRequest):
    if req.type not in ['battery', 'temp', 'comm']:
        raise HTTPException(status_code=400, detail="Invalid anomaly type")
    simulator.inject(req.type)
    return {"status": "injected", "type": req.type}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
