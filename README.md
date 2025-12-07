# Satellite Telemetry Dashboard


This project contains a full-stack application for monitoring satellite telemetry with real-time anomaly detection.

## Demo & Screenshots

![Dashboard Overview](./Screenshot%20(135).png)
![Anomaly Detection](./Screenshot%20(136).png)

**[Watch the Demo Video](https://youtu.be/v-s4kzgWZLE)**



## System Architecture

The project mimics a real-world satellite ground station setup with two main components:

### 1. Backend (Python/FastAPI)
The backend acts as the satellite simulator and processing engine.

*   **Telemetry Generator (`src/telemetry/generator.py`)**:
    *   Simulates realistic orbital dynamics using sine waves for temperature and solar currents.
    *   Generates 12-dimensional feature vectors: `[battery, solar, temp, cpu, extra0...extra7]`.
    *   Injects random "noise" and anomalies (battery drops, temp spikes) to test system resilience.
*   **AI Anomaly Detection (`src/ai/anomaly_detector.py`)**:
    *   **Algorithm**: Uses an **Isolation Forest** model (trained on "normal" orbital data) to identify outliers.
    *   **Training**: If you want to know how the models were created, check out the [model training tool](https://github.com/your-username/model-training-tool).
    *   **Inference**: Every incoming telemetry point is scored in real-time. If the model detects a deviation from the learned pattern, it flags it as an anomaly (`iso_flag`).
*   **API Server (`src/api/server.py`)**:
    *   Exposes endpoints to stream telemetry and control the simulation.
    *   Handles the logic for "Inject Anomaly" requests from the frontend.

### 2. Frontend (React/Vite)
The frontend is a mission control dashboard built with modern web technologies.

*   **Real-time Visualization**: Polls the backend API every second to update charts.
*   **Health Status**:
    *   **Normal**: All parameters within nominal ranges.
    *   **Warning**: Small deviations or AI-flagged anomalies.
    *   **Critical**: Rule-based violations (e.g., Battery < 3.2V, Temp > 70°C).
*   **Interactive Controls**: Allows operators to inject specific faults (Battery Failure, Thermal Runaway, Comm Loss) to verify the AI's response.

## Directory Structure Details

*   **/backend/model**: Contains the pre-trained `.joblib` models.
*   **/backend/data**: Stores raw `.bin` telemetry logs (as per requirements).
*   **/frontend/src/lib**: Contains the API client logic.


## Prerequisites

*   Python 3.10+
*   Node.js & npm

## How to Run

### 1. Start the Backend

Open a terminal in the `backend` folder:

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
pip install fastapi uvicorn pydantic

# Run the server
python -m src.api.server
```

The server will start on `http://localhost:8000`.

### 2. Start the Frontend

Open a new terminal in the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

The UI will typically be available at `http://localhost:8080`.

## Features

*   **Real-time Telemetry**: Battery, Solar, Temp, CPU.
*   **AI Anomaly Detection**: Isolation Forest model running in Python detects anomalies in real-time.
*   **Interactive Control**: Inject anomalies from the UI to test the system's response.
