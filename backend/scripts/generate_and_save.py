
from src.telemetry.generator import generate_synthetic, save_to_bin
if __name__ == "__main__":
    df = generate_synthetic(n_minutes=1440, inject_anoms=True)
    save_to_bin(df, "data/telemetry.bin")
    print("Saved synthetic telemetry to data/telemetry.bin")
