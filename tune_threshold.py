import json

CONFIG_PATH = "zeroday_config.json"

with open(CONFIG_PATH, "r") as f:
    cfg = json.load(f)

mean_mse = cfg["mean_mse"]      # 0.000310
std_mse = cfg["std_mse"]        # 0.001554

# Calibrate from 3.0-sigma down to 1.5-sigma
new_theta = float(mean_mse + 1.5 * std_mse)

cfg["anomaly_threshold"] = new_theta
cfg["sigma_multiplier"] = 1.5

with open(CONFIG_PATH, "w") as f:
    json.dump(cfg, f, indent=4)

print(f"Updated Threshold (theta): {new_theta:.6f} (using mu + 1.5*sigma)")