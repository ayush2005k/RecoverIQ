import json
import os
from pathlib import Path
from typing import Dict, Any
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    brier_score_loss,
)

from ..core.config import settings
from .features import NUMERICAL_FEATURES, CATEGORICAL_FEATURES, ALL_FEATURE_COLUMNS
from .synthetic_generator import generate_synthetic_dataset

def train_recovery_model(num_records: int = 3000, seed: int = 42) -> Dict[str, Any]:
    """
    Trains a clean Logistic Regression model on synthetic failure recovery data.
    Evaluates on a held-out test split, prints metrics, and persists the artifact.
    """
    # 1. Generate data
    customers, payments, df = generate_synthetic_dataset(num_records=num_records, seed=seed)

    X = df[ALL_FEATURE_COLUMNS]
    y = df["recovered"]

    # 2. Train/Test split (80/20) with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=seed, stratify=y
    )

    # 3. Construct preprocessing & model pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )

    model_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000, random_state=seed, solver="lbfgs")),
        ]
    )

    # 4. Train model
    model_pipeline.fit(X_train, y_train)

    # 5. Evaluate on held-out test set
    y_pred = model_pipeline.predict(X_test)
    y_prob = model_pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        "model_type": "LogisticRegression",
        "model_version": "RecoverIQ-LogReg-v1.0.0",
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "brier_score_loss": round(float(brier_score_loss(y_test, y_prob)), 4),
        "base_recovery_rate_in_test": round(float(np.mean(y_test)), 4),
        "mean_predicted_probability": round(float(np.mean(y_prob)), 4),
    }

    # 6. Ensure artifact directory exists and persist artifact
    settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_pipeline, settings.MODEL_PATH)

    with open(settings.MODEL_METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    return metrics

if __name__ == "__main__":
    result = train_recovery_model()
    print("Model Training Complete:")
    print(json.dumps(result, indent=2))
