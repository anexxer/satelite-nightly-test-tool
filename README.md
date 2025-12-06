# Hex20 Satellite Telemetry Dashboard (Full Stack)


This project contains a full-stack application for monitoring satellite telemetry with real-time anomaly detection.

## Demo & Screenshots

![Dashboard Overview](./Screenshot%20(135).png)
![Anomaly Detection](./Screenshot%20(136).png)

**[Watch the Demo Video](./demo.mp4)**


## Structure

*   **/backend**: Python FastAPI server with AI Models (Isolation Forest) and Telemetry Simulation.
*   **/frontend**: React (Vite) application for the dashboard UI.

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
