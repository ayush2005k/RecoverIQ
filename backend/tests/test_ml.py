import pytest
from app.ml.features import extract_features_from_models, ALL_FEATURE_COLUMNS
from app.ml.predictor import predict_base_recovery_probability
from app.ml.train import train_recovery_model

def test_feature_extraction(sample_customer_and_payment):
    cust, pay = sample_customer_and_payment
    feats = extract_features_from_models(pay, cust)

    for col in ALL_FEATURE_COLUMNS:
        assert col in feats, f"Expected column {col} in extracted features"

    assert feats["amount"] == 125000.0
    assert feats["payment_method"] == "card"
    assert feats["failure_reason"] == "insufficient_funds"
    assert feats["customer_segment"] == "Enterprise"
    assert feats["customer_success_rate"] == 0.946

def test_model_training_and_metrics():
    metrics = train_recovery_model(num_records=500, seed=42)

    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "roc_auc" in metrics
    assert "brier_score_loss" in metrics

    # Accuracy and AUC should be realistic
    assert metrics["accuracy"] >= 0.55
    assert metrics["roc_auc"] >= 0.65
    assert 0.0 <= metrics["brier_score_loss"] <= 0.35

def test_predict_base_probability(sample_customer_and_payment, trained_model):
    cust, pay = sample_customer_and_payment
    prob, conf, feats = predict_base_recovery_probability(pay, cust)

    assert 0.01 <= prob <= 0.99
    assert 0.70 <= conf <= 1.0
    assert isinstance(feats, dict)
