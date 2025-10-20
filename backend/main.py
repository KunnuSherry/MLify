# backend/main.py
from __future__ import annotations

import io
import os
import uuid
from typing import Any, Dict

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sklearn.preprocessing import LabelEncoder

from utils.supabase import upload_bytes  # bytes-only helper to Supabase

load_dotenv()
app = FastAPI()

# --- CORS (helpful for local dev) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Small helpers --------------------
def _supa_key(prefix: str, filename: str) -> str:
    """Consistent key like 'uploads/abcd1234__file.csv'."""
    uid = uuid.uuid4().hex[:8]
    return f"{prefix.rstrip('/')}/{uid}__{filename}"

def _save_plot_to_supabase(fig, name_hint: str) -> str:
    """Render a Matplotlib figure to PNG bytes and upload to Supabase; return public URL."""
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png", dpi=150)
    plt.close(fig)
    buf.seek(0)
    key = _supa_key("graphs", name_hint if name_hint.endswith(".png") else f"{name_hint}.png")
    return upload_bytes(buf.getvalue(), key=key, content_type="image/png")

# -------------------- Routes --------------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # CSV only
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    # Read CSV → DataFrame
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {str(e)}")

    # Normalize + upload to Supabase (no local disk)
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    storage_key = _supa_key("uploads", file.filename)
    file_url = upload_bytes(csv_bytes, key=storage_key, content_type="text/csv")
    file_url = str(file_url)  # ensure plain string

    preview_html = df.head(5).to_html(classes="table table-striped", index=False)
    columns = df.columns.tolist()
    missing_counts = df.isnull().sum().to_dict()

    return {
        "file_url": file_url,
        "columns": columns,
        "preview": preview_html,
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1]),
        "missing_counts": missing_counts,
    }

@app.post("/process")
async def process_data(request: Request):
    """
    Read raw JSON body to avoid validation-time 422s.
    """
    # -------- Parse JSON safely --------
    try:
        payload: Dict[str, Any] = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON body: {e}")

    target = payload.get("target")
    mode = payload.get("mode")
    file_url = payload.get("file_url") or payload.get("filename")  # fallback for legacy clients

    # Coerce file_url to plain string if an object slipped through
    if isinstance(file_url, dict):
        file_url = (
            file_url.get("publicURL")
            or file_url.get("publicUrl")
            or file_url.get("url")
            or str(file_url)
        )

    # -------- Manual validation (clear 400s, no 422) --------
    if not isinstance(target, str) or not target:
        raise HTTPException(status_code=400, detail="Missing or invalid 'target'")
    if not isinstance(mode, str) or not mode:
        raise HTTPException(status_code=400, detail="Missing or invalid 'mode'")
    if not isinstance(file_url, str) or not file_url:
        raise HTTPException(status_code=400, detail="Missing or invalid 'file_url'")

    # -------- Load CSV from Supabase URL --------
    try:
        r = requests.get(file_url, timeout=30)
        r.raise_for_status()
        df = pd.read_csv(io.StringIO(r.text))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch/read CSV from URL: {e}")

    if target not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{target}' not found in dataset.")

    steps: list[dict[str, Any]] = []

    # -------------------- Missing Values --------------------
    missing_before = df.isnull().sum()
    total_missing = int(missing_before.sum())
    steps.append({
        "step": "missing_detected",
        "message": f"Found {total_missing} missing values across {len(missing_before[missing_before>0])} columns.",
        "status": "done",
        "details": missing_before[missing_before>0].to_dict()
    })

    for col in df.columns:
        if df[col].isnull().sum() > 0:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].median())
            else:
                try:
                    df[col] = df[col].fillna(df[col].mode().iloc[0])
                except Exception:
                    df[col] = df[col].fillna("Unknown")

    missing_after = int(df.isnull().sum().sum())
    steps.append({
        "step": "missing_handled",
        "message": f"Missing values handled. Remaining missing values: {missing_after}.",
        "status": "done"
    })

    # -------------------- Feature Types --------------------
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    features = [c for c in df.columns if c != target]
    steps.append({
        "step": "separate_types",
        "message": f"Separated columns into {len(numeric_cols)} numeric and {len(categorical_cols)} categorical.",
        "status": "done",
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols
    })

    target_numeric = pd.api.types.is_numeric_dtype(df[target])

    # -------------------- Branch on mode --------------------
    numeric_analysis: Dict[str, Any] = {}
    cat_analysis: Dict[str, Any] = {}
    insights: list[Dict[str, Any]] = []
    model_info: Dict[str, Any] = {}
    ai_insights: list[str] = []
    ai_model: str | None = None
    ai_error: str | None = None  # <- for debugging visibility

    # ===== BUSINESS INSIGHTS =====
    if mode == "business_insights":
        try:
            target_encoded = df[target] if target_numeric else pd.factorize(df[target])[0]

            # Numeric correlations + heatmap
            if numeric_cols:
                corr_series = (
                    df[numeric_cols]
                    .assign(_target=target_encoded)
                    .corr()["_target"]
                    .drop("_target")
                    .sort_values(key=abs, ascending=False)
                )
                numeric_analysis["correlations"] = corr_series.to_dict()

                fig = plt.figure(figsize=(6, 5))
                corrmat = df[numeric_cols + ([target] if target_numeric else [])].corr()
                plt.imshow(corrmat, interpolation='nearest', cmap='coolwarm')
                plt.xticks(range(len(corrmat.columns)), corrmat.columns, rotation=45, ha='right')
                plt.yticks(range(len(corrmat.index)), corrmat.index)
                plt.colorbar()
                numeric_analysis["corr_heatmap"] = _save_plot_to_supabase(fig, "num_corr_heatmap")
            else:
                numeric_analysis["note"] = "No numeric columns found."

            steps.append({"step": "numeric_analysis", "message": "Numeric correlations computed.", "status": "done"})

        except Exception as e:
            steps.append({"step": "numeric_analysis_error", "message": str(e), "status": "error"})

        # Categorical side
        if categorical_cols:
            df_encoded = df.copy()
            le_map: Dict[str, list[str]] = {}
            for col in categorical_cols:
                try:
                    le = LabelEncoder()
                    df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                    le_map[col] = list(le.classes_)
                except Exception:
                    df_encoded[col], uniques = pd.factorize(df_encoded[col].astype(str))
                    le_map[col] = [str(u) for u in uniques]

            target_enc = df[target] if target_numeric else pd.factorize(df[target])[0]
            corr_cat = (
                df_encoded[categorical_cols]
                .assign(_target=target_enc)
                .corr()["_target"]
                .drop("_target")
                .sort_values(key=abs, ascending=False)
            )
            cat_analysis["correlations"] = corr_cat.to_dict()
            cat_analysis["label_encoding_map"] = le_map

            # Top 3 category plots
            cat_plots: list[str] = []
            for col in list(corr_cat.abs().sort_values(ascending=False).index)[:3]:
                fig, ax = plt.subplots(figsize=(6, 4))
                if target_numeric:
                    vals = df.groupby(col)[target].mean()
                else:
                    vals = df.groupby(col)[target].apply(lambda x: x.value_counts(normalize=True).max())
                vals.plot(kind='bar', ax=ax)
                ax.set_title(f"{col} vs {target}")
                url = _save_plot_to_supabase(fig, f"cat_{col}_vs_{target}")
                cat_plots.append(url)
            cat_analysis["plots"] = cat_plots
            steps.append({"step": "cat_analysis", "message": "Categorical correlations computed.", "status": "done"})
        else:
            cat_analysis["note"] = "No categorical columns found."
            steps.append({"step": "cat_analysis_skipped", "message": "No categorical columns found.", "status": "done"})

        # Insights (top/low features)
        combined_corr = {
            **(numeric_analysis.get("correlations") or {}),
            **(cat_analysis.get("correlations") or {}),
        }
        if combined_corr:
            sorted_corr = sorted(combined_corr.items(), key=lambda kv: abs(kv[1]), reverse=True)
            top_features = sorted_corr[1:4]
            low_features = sorted_corr[-5:] if len(sorted_corr) >= 5 else sorted_corr[-len(sorted_corr):]
            insights = [
                {"top_features": [{k: v} for k, v in top_features]},
                {"low_features": [{k: v} for k, v in low_features]},
            ]
        else:
            insights = [{"note": "No correlations available."}]

        # ----------------------------- AI (Gemini) -----------------------------
        def _top_k(d, k=10):
            if not isinstance(d, dict):
                return []
            sorted_items = sorted(d.items(), key=lambda kv: abs(kv[1]), reverse=True)[:k]
            return [
                {
                    "feature": kk,
                    "corr": float(vv),
                    "direction": "positive" if vv > 0 else "negative",
                    "strength": "strong" if abs(vv) >= 0.5 else "moderate" if abs(vv) >= 0.3 else "weak",
                }
                for kk, vv in sorted_items
            ]

        numeric_corrs = (numeric_analysis.get("correlations") or {}).copy()
        numeric_corrs.pop(target, None)
        numeric_top = _top_k(numeric_corrs, 10)

        cat_corrs = (cat_analysis.get("correlations") or {}).copy()
        cat_corrs.pop(target, None)
        cat_top = _top_k(cat_corrs, 10)

        def _fallback_points() -> list[str]:
            pts: list[str] = []
            if numeric_top:
                f, c = numeric_top[0]["feature"], numeric_top[0]["corr"]
                pts.append(f"{f} strongly {'lifts' if c > 0 else 'suppresses'} {target}; prioritize levers here to move topline.")
            if cat_top:
                f, c = cat_top[0]["feature"], cat_top[0]["corr"]
                pts.append(f"Segments by '{f}' show performance spread—target interventions at underperforming levels.")
            if len(pts) < 3:
                pts.append("Concentrate testing on top drivers; validate causality before scaling investment.")
            return pts[:3]

        try:
            GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
            if not GEMINI_API_KEY:
                ai_error = "GEMINI_API_KEY not set"
                ai_insights = _fallback_points()
                ai_model = None
            else:
                try:
                    import google.generativeai as genai
                except Exception as ie:
                    ai_error = f"google-generativeai not installed: {ie}"
                    ai_insights = _fallback_points()
                    ai_model = None
                else:
                    import textwrap, json

                    genai.configure(api_key=GEMINI_API_KEY)
                    ai_model = "gemini-1.5-flash"

                    system_instructions = textwrap.dedent("""
                        You are a senior data strategist advising executives.

                        You receive:
                          • A dataset summary (rows, columns, target column name)
                          • Top correlations between numeric and categorical features and the target

                        Your audience:
                          • Senior executives, strategy heads, and decision-makers with limited time but deep business acumen
                          • They seek forward-looking insights, not surface-level observations

                        TASK:
                          • Write exactly 3 concise, high-impact, decision-oriented one-liners (max 25 words each).
                          • Interpret correlations in context — focus on why these relationships might exist and what decisions they imply.
                          • Highlight potential causal mechanisms, business drivers, or strategic opportunities — not descriptive trivia.
                          • If patterns suggest risks, inefficiencies, or leverage points, articulate them clearly.
                          • Avoid obvious statements (“X correlates with Y”) — instead explain significance (“Faster onboarding drives retention—optimize training.”)
                          • Prefer insights that imply action or resource allocation.
                          • Avoid statistical jargon.
                          • Be specific and directional; use verbs that show causality or enablement.
                          • Be bold but credible — it’s fine to hypothesize causes if phrased as “suggests” or “indicates”.

                        FORMAT:
                          • Return a pure JSON array of 3 strings.
                          • No numbering, no bullets, no markdown.
                    """)

                    payload_for_ai = {
                        "target": target,
                        "dataset_profile": {"rows": int(df.shape[0]), "cols": int(df.shape[1])},
                        "numeric_correlations_top": numeric_top,
                        "categorical_correlations_top": cat_top,
                    }
                    prompt = f"DATA (JSON):\n{payload_for_ai}\n\nOUTPUT:\nReturn exactly 3 insights as a JSON list of strings."

                    try:
                        model = genai.GenerativeModel(ai_model)
                        resp = model.generate_content(system_instructions + "\n\n" + prompt)

                        def _resp_to_text(r):
                            try:
                                t = getattr(r, "text", None)
                                if t:
                                    return t
                                cands = getattr(r, "candidates", None)
                                if cands:
                                    parts = getattr(cands[0].content, "parts", [])
                                    return "".join(getattr(p, "text", "") for p in parts if getattr(p, "text", None))
                            except Exception:
                                pass
                            return ""

                        text = _resp_to_text(resp).strip()

                        try:
                            parsed = json.loads(text)
                            if isinstance(parsed, list) and parsed:
                                ai_insights = [str(x) for x in parsed][:3]
                            else:
                                ai_error = "AI returned non-JSON or empty"
                                ai_insights = _fallback_points()
                        except Exception as je:
                            ai_error = f"JSON parse error: {je}"
                            # Fallback: pick first 3 non-empty lines
                            fallback = []
                            for line in text.splitlines():
                                line = line.strip("-• ").strip()
                                if line:
                                    fallback.append(line)
                                if len(fallback) >= 3:
                                    break
                            ai_insights = fallback or _fallback_points()

                        ai_insights = [s[:220] for s in ai_insights][:3]
                    except Exception as ge:
                        ai_error = f"Generation error: {ge}"
                        ai_insights = _fallback_points()
                        ai_model = None
        except Exception as outer:
            ai_error = f"Unexpected AI block error: {outer}"
            ai_insights = _fallback_points()
            ai_model = None

    # ===== MODEL TRAINER =====
    elif mode == "model_trainer":
        try:
            # Lazy imports so the other path doesn't pay the cost
            import joblib
            from sklearn.compose import ColumnTransformer
            from sklearn.preprocessing import OneHotEncoder
            from sklearn.pipeline import Pipeline
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import mean_squared_error, r2_score, accuracy_score
            from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

            X = df[[c for c in df.columns if c != target]].copy()
            y = df[target].copy()

            cat_cols = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()

            preprocessor = ColumnTransformer(
                transformers=[
                    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
                ],
                remainder='passthrough'
            )

            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

            if target_numeric:
                model = Pipeline([
                    ('preprocessor', preprocessor),
                    ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
                ])
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                r2 = float(r2_score(y_test, y_pred))
                rmse = float(mean_squared_error(y_test, y_pred) ** 0.5)

                # Save PKL entirely in memory and upload to Supabase
                pkl_buf = io.BytesIO()
                joblib.dump(model, pkl_buf)
                pkl_buf.seek(0)
                model_key = _supa_key("models", f"{uuid.uuid4().hex}.pkl")
                model_url = upload_bytes(pkl_buf.getvalue(), key=model_key, content_type="application/octet-stream")

                model_info = {
                    "model_type": "RandomForestRegressor",
                    "r2_score": r2,
                    "rmse": rmse,
                    "download_url": model_url,
                }
            else:
                model = Pipeline([
                    ('preprocessor', preprocessor),
                    ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
                ])
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                acc = float(accuracy_score(y_test, y_pred))

                pkl_buf = io.BytesIO()
                joblib.dump(model, pkl_buf)
                pkl_buf.seek(0)
                model_key = _supa_key("models", f"{uuid.uuid4().hex}.pkl")
                model_url = upload_bytes(pkl_buf.getvalue(), key=model_key, content_type="application/octet-stream")

                model_info = {
                    "model_type": "RandomForestClassifier",
                    "accuracy": acc,
                    "download_url": model_url,
                }

            steps.append({
                "step": "model_training",
                "message": f"Model trained successfully: {model_info.get('model_type')}",
                "status": "done"
            })
        except Exception as e:
            steps.append({"step": "model_training_error", "message": str(e), "status": "error"})

    else:
        # Unknown mode
        raise HTTPException(status_code=400, detail="mode must be 'business_insights' or 'model_trainer'")

    # -------------------- Return --------------------
    return {
        "status": "success",
        "mode": mode,
        "target": target,
        "steps": steps,
        "numeric_analysis": numeric_analysis,
        "categorical_analysis": cat_analysis,
        "insights": insights,
        "ai_insights": ai_insights,    # <- will never be empty now; fallback kicks in
        "ai_model": ai_model,
        "ai_error": ai_error,          # <- optional, helpful during setup; remove later if you want
        "model_info": model_info,
    }
