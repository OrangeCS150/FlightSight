import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor
import joblib

# ================= CONFIG =================
INPUT_FILE = "backend/data/flights_engineered.csv"
MODEL_FILE = "backend/data/price_model2.pkl"

# ================= LOAD =================
print("Loading dataset...")
df = pd.read_csv(INPUT_FILE, low_memory=False)
df = df.sample(n=100000, random_state=42)

# ================= FEATURE ENGINEERING =================
print("Creating route feature...")
df["route"] = df["startingAirport"] + "_" + df["destinationAirport"]

# ================= TARGET =================
# Log transform improves performance
y = np.log1p(df["totalFare"])

# ================= FEATURES =================
# BEST SET (keep both route + airports)
features = [
    "startingAirport",
    "destinationAirport",
    "route",
    "main_airline",
    "num_stops",
    "departure_hour",
    "month",
    "day_of_week",
    "is_weekend",
    "total_duration_min",
    "travel_duration_min"
]

X = df[features]

# ================= CLEAN =================
print("Cleaning data...")
X = X.dropna()
y = y[X.index]

# ================= SPLIT =================
print("Splitting dataset...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

# ================= ENCODING =================
categorical_cols = [
    "startingAirport",
    "destinationAirport",
    "route",
    "main_airline"
]

numerical_cols = [
    "num_stops",
    "departure_hour",
    "month",
    "day_of_week",
    "is_weekend",
    "total_duration_min",
    "travel_duration_min"
]

preprocessor = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
    ("num", "passthrough", numerical_cols)
])

# ================= MODEL =================
print("Building model...")

model = RandomForestRegressor(
    n_estimators=30,
    max_depth=8,
    random_state=42,
    n_jobs=-1
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", model)
])

# ================= TRAIN =================
print("Training model...")
pipeline.fit(X_train, y_train)

# ================= EVALUATE =================
print("Evaluating model...")

y_pred_log = pipeline.predict(X_test)

# Convert back to real price
y_pred = np.expm1(y_pred_log)
y_test_actual = np.expm1(y_test)

mae = mean_absolute_error(y_test_actual, y_pred)
rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred))
r2 = r2_score(y_test_actual, y_pred)

print("\nModel Performance:")
print(f"MAE  (avg error): ${mae:.2f}")
print(f"RMSE (std error): ${rmse:.2f}")
print(f"R²   (fit score): {r2:.4f}")

# ================= SAVE =================
print("Saving model...")
joblib.dump(pipeline, MODEL_FILE)

print(f"Model saved as: {MODEL_FILE}")