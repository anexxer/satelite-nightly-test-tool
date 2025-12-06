
import joblib
import numpy as np

class AnomalyDetector:
    def __init__(self, model_path=None, scaler_path=None, lr_path=None):
        self.iso = joblib.load(model_path) if model_path else None
        self.scaler = joblib.load(scaler_path) if scaler_path else None
        self.lr = joblib.load(lr_path) if lr_path else None

    def predict_iso(self, X):
        # X: 2D numpy array of features (same order used in training)
        if self.scaler is not None:
            Xs = self.scaler.transform(X)
        else:
            Xs = X
        pred = self.iso.predict(Xs)  # 1 normal, -1 anomaly
        scores = -self.iso.decision_function(Xs)  # higher = more anomalous
        return (pred == -1).astype(int), scores

    def predict_lr_residual(self, windows):
        # windows: array of shape (n, window_size) for battery windows
        if self.lr is None:
            return np.zeros(len(windows)), None
        preds = self.lr.predict(windows)
        return preds

