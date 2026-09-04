from typing import Tuple, Dict, Any
import os
import joblib
import pandas as pd
from ..core.config import settings
from .features import extract_features_from_models, ALL_FEATURE_COLUMNS, features_to_dataframe
from ..models.payment import Payment
from ..models.customer import Customer

_model_cache = None

def get_model():
    """Load cached model or read from disk."""
    global _model_cache
    if _model_cache is None:
        if not os.path.exists(settings.MODEL_PATH):
            from .train import train_recovery_model
            train_recovery_model(num_records=settings.SYNTHETIC_DATA_SIZE, seed=settings.SEED)
        _model_cache = joblib.load(settings.MODEL_PATH)
    return _model_cache

def predict_base_recovery_probability(payment: Payment, customer: Customer) -> Tuple[float, float, Dict[str, Any]]:
    """
    Predicts the base recovery probability P(recovered | context) before action intervention.
    Returns:
      - base_probability: float (0.0 to 1.0)
      - confidence: float (0.0 to 1.0)
      - raw_features: dict
    """
    model = get_model()
    raw_features = extract_features_from_models(payment, customer)
    df = features_to_dataframe([raw_features])
    
    # Predict probability
    prob_array = model.predict_proba(df)[0]
    base_prob = float(prob_array[1])
    
    # Bound to reasonable fintech probabilities [0.01, 0.99]
    base_prob = max(0.01, min(0.99, round(base_prob, 4)))
    
    # Confidence reflects how decisively the model classifies: higher near extremes
    margin = abs(base_prob - 0.5) * 2.0  # 0 to 1
    confidence = round(0.75 + 0.20 * margin, 2)
    
    return base_prob, confidence, raw_features
