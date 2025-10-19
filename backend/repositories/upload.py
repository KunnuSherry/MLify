# backend/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io, os, uuid
from dotenv import load_dotenv  # <-- Add this import

load_dotenv()  # <-- Add this line to load .env variables

import matplotlib.pyplot as plt
from sklearn.preprocessing import LabelEncoder

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../uploads")
GRAPH_DIR = os.path.join(os.path.dirname(__file__), "../static/graphs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GRAPH_DIR, exist_ok=True)

# Add this to your main FastAPI app (usually in main.py, but if this is your entrypoint, add here)
app = FastAPI()

# Mount static files for graph images
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "../static")), name="static")


async def upload_file(file: UploadFile = File(...)):
    # Accept only CSV
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {str(e)}")

    # Save csv to uploads with unique name
    uid = str(uuid.uuid4())[:8]
    filename = f"{uid}__{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)
    df.to_csv(path, index=False)

    # Prepare preview and columns and missing summary
    preview_html = df.head(5).to_html(classes="table table-striped", index=False)
    columns = df.columns.tolist()
    missing_counts = df.isnull().sum().to_dict()

    return {
        "filename": filename,
        "columns": columns,
        "preview": preview_html,
        "missing_counts": missing_counts,
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1])
    } 

def save_plot(fig, name):
    out_path = os.path.join(GRAPH_DIR, name)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    # Return the URL path for frontend use
    return f"/static/graphs/{name}"

def process_data(req):
    """
    Process uploaded CSV for either business insights or model training.
    Supports missing value handling, numeric/categorical analysis, 
    correlation heatmaps, and model training (LinearRegression / LogisticRegression).
    """
    try:
        import os, uuid, matplotlib.pyplot as plt
        import pandas as pd
        import numpy as np
        from fastapi import HTTPException
        from sklearn.preprocessing import LabelEncoder, OneHotEncoder
        from sklearn.model_selection import train_test_split
        from sklearn.linear_model import LinearRegression, LogisticRegression
        from sklearn.metrics import mean_squared_error, r2_score, accuracy_score
        from sklearn.compose import ColumnTransformer
        from sklearn.pipeline import Pipeline

        # -------------------- Helper Functions --------------------
        def get_attr(obj, key):
            if isinstance(obj, dict):
                return obj.get(key)
            return getattr(obj, key, None)

        def save_plot(fig, name):
            GRAPH_DIR = os.path.join(os.path.dirname(__file__), "../static/graphs")
            os.makedirs(GRAPH_DIR, exist_ok=True)
            out_path = os.path.join(GRAPH_DIR, name)
            fig.tight_layout()
            fig.savefig(out_path, dpi=150)
            plt.close(fig)
            return f"/static/graphs/{name}"

        # -------------------- Extract Request --------------------
        target = get_attr(req, "target")
        mode = get_attr(req, "mode")
        filename = get_attr(req, "filename")

        if not target or not mode or not filename:
            raise HTTPException(status_code=400, detail="Target, mode, or filename is missing")

        UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../uploads")
        csv_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=400, detail="Uploaded file not found. Re-upload and try again.")

        df = pd.read_csv(csv_path)
        if target not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target}' not found in dataset.")

        steps = []

        # -------------------- Step 1: Missing Values --------------------
        missing_before = df.isnull().sum()
        total_missing = int(missing_before.sum())
        steps.append({
            "step": "missing_detected",
            "message": f"Found {total_missing} missing values across {len(missing_before[missing_before>0])} columns.",
            "status": "done",
            "details": missing_before[missing_before>0].to_dict()
        })

        # Fill missing values
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

        # -------------------- Step 2: Feature Types --------------------
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

        # -------------------- BUSINESS INSIGHTS --------------------
        numeric_analysis, cat_analysis, insights, ai_insights, ai_model = {}, {}, [], [], None
        if mode == "business_insights":
            try:
                target_encoded = df[target] if target_numeric else pd.factorize(df[target])[0]
                corr_series = df[numeric_cols].assign(_target=target_encoded).corr()["_target"].drop("_target").sort_values(key=abs, ascending=False)
                numeric_analysis["correlations"] = corr_series.to_dict()

                # Numeric heatmap
                fig = plt.figure(figsize=(6,5))
                corrmat = df[numeric_cols + ([target] if target_numeric else [])].corr()
                plt.imshow(corrmat, interpolation='nearest', cmap='coolwarm')
                plt.xticks(range(len(corrmat.columns)), corrmat.columns, rotation=45, ha='right')
                plt.yticks(range(len(corrmat.index)), corrmat.index)
                plt.colorbar()
                numeric_analysis["corr_heatmap"] = save_plot(fig, f"{filename}_num_corr.png")

                steps.append({"step": "numeric_analysis", "message": "Numeric correlations computed.", "status": "done"})
            except Exception as e:
                steps.append({"step": "numeric_analysis_error", "message": str(e), "status": "error"})

            # Categorical analysis
            if categorical_cols:
                df_encoded = df.copy()
                le_map = {}
                for col in categorical_cols:
                    try:
                        le = LabelEncoder()
                        df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                        le_map[col] = list(le.classes_)
                    except Exception:
                        df_encoded[col], uniques = pd.factorize(df_encoded[col].astype(str))
                        le_map[col] = list(uniques)

                target_enc = df[target] if target_numeric else pd.factorize(df[target])[0]
                corr_cat = df_encoded[categorical_cols].assign(_target=target_enc).corr()["_target"].drop("_target").sort_values(key=abs, ascending=False)
                cat_analysis["correlations"] = corr_cat.to_dict()
                cat_analysis["label_encoding_map"] = le_map

                # Top 3 categorical plots
                cat_plots = []
                for col in corr_cat.abs().sort_values(ascending=False).head(3).index:
                    fig = plt.figure(figsize=(6,4))
                    if target_numeric:
                        vals = df.groupby(col)[target].mean()
                    else:
                        vals = df.groupby(col)[target].apply(lambda x: x.value_counts(normalize=True).max())
                    vals.plot(kind='bar')
                    plt.title(f"{col} vs {target}")
                    url = save_plot(fig, f"{filename}_cat_{col}.png")
                    cat_plots.append(url)
                cat_analysis["plots"] = cat_plots
                steps.append({"step": "cat_analysis", "message": "Categorical correlations computed.", "status": "done"})
            else:
                cat_analysis["note"] = "No categorical columns found."
                steps.append({"step": "cat_analysis_skipped", "message": "No categorical columns found.", "status": "done"})

            # Insights
            combined_corr = {**numeric_analysis.get("correlations", {}), **cat_analysis.get("correlations", {})}
            sorted_corr = sorted(combined_corr.items(), key=lambda kv: abs(kv[1]), reverse=True)
            top_features = sorted_corr[1:4]
            low_features = sorted_corr[-5:]
            insights = [{"top_features": [{k:v} for k,v in top_features]}, {"low_features": [{k:v} for k,v in low_features]}]

        # -------------------- MODEL TRAINER --------------------
        # -------------------- MODEL TRAINER --------------------
        # -------------------- MODEL TRAINER --------------------
        model_info = {}
        if mode == "model_trainer":
            try:
                import joblib  # for saving model
                from sklearn.compose import ColumnTransformer
                from sklearn.preprocessing import OneHotEncoder
                from sklearn.pipeline import Pipeline
                from sklearn.model_selection import train_test_split
                from sklearn.metrics import mean_squared_error, r2_score, accuracy_score
                from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

                X = df[features].copy()
                y = df[target].copy()

                # One-hot encode categorical columns
                cat_cols = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
                num_cols = X.select_dtypes(include=[np.number]).columns.tolist()

                preprocessor = ColumnTransformer(
                    transformers=[
                        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
                    ],
                    remainder='passthrough'
                )

                X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

                saved_model_dir = os.path.join(os.path.dirname(__file__), "../static/models")
                os.makedirs(saved_model_dir, exist_ok=True)
                model_filename = f"{uuid.uuid4().hex}_model.pkl"
                model_path = os.path.join(saved_model_dir, model_filename)

                if target_numeric:
                    model = Pipeline([
                        ('preprocessor', preprocessor),
                        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
                    ])
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_test)
                    # Save model
                    joblib.dump(model, model_path)
                    model_info = {
                        "model_type": "RandomForestRegressor",
                        "r2_score": r2_score(y_test, y_pred),
                        "rmse": mean_squared_error(y_test, y_pred)**0.5,
                        "download_url": f"/static/models/{model_filename}"
                    }
                else:
                    model = Pipeline([
                        ('preprocessor', preprocessor),
                        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
                    ])
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_test)
                    # Save model
                    joblib.dump(model, model_path)
                    model_info = {
                        "model_type": "RandomForestClassifier",
                        "accuracy": accuracy_score(y_test, y_pred),
                        "download_url": f"/static/models/{model_filename}"
                    }

                steps.append({
                    "step": "model_training",
                    "message": f"Model trained successfully: {model_info.get('model_type')}",
                    "status": "done"
                })

            except Exception as e:
                steps.append({"step": "model_training_error", "message": str(e), "status": "error"})


         # ----------------------------- AI (Gemini) -----------------------------
        ai_insights = []
        ai_model = None
        try:
            import json, textwrap
            GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

            # compact top-k for prompt (adds direction + strength)
            def _top_k(d, k=10):
                if not isinstance(d, dict):
                    return []
                sorted_items = sorted(d.items(), key=lambda kv: abs(kv[1]), reverse=True)[:k]
                return [
                    {
                        "feature": kk,
                        "corr": float(vv),
                        "direction": "positive" if vv > 0 else "negative",
                        "strength": "strong" if abs(vv) >= 0.5 else "moderate" if abs(vv) >= 0.3 else "weak"
                    }
                    for kk, vv in sorted_items
                ]

            # remove target-self correlation
            numeric_corrs = numeric_analysis.get("correlations") or {}
            numeric_corrs = {k: v for k, v in numeric_corrs.items() if k != target}
            numeric_top = _top_k(numeric_corrs, 10)

            cat_corrs = cat_analysis.get("correlations") or {}
            cat_corrs = {k: v for k, v in cat_corrs.items() if k != target}
            cat_top = _top_k(cat_corrs, 10)

            # Fallback bullets to ensure UI shows something even if AI fails
            def _fallback_points():
                pts = []
                if numeric_top:
                    f, c = numeric_top[0]["feature"], numeric_top[0]["corr"]
                    pts.append(f"{f} shows a {'positive' if c > 0 else 'negative'} impact on {target} (|corr|={abs(c):.2f}); may drive key outcomes.")
                if cat_top:
                    f, c = cat_top[0]["feature"], cat_top[0]["corr"]
                    pts.append(f"Category '{f}' has a {'strong' if abs(c) > 0.5 else 'moderate'} link with {target}; investigate level differences.")
                if len(pts) < 3:
                    pts.append("Correlations hint at underlying behavioral or process drivers worth exploring via regression or segmentation.")
                return pts[:3]

            if not GEMINI_API_KEY:
                print("Gemini API key not set. Skipping AI insights.")
                ai_insights = _fallback_points()
            else:
                import google.generativeai as genai
                genai.configure(api_key=GEMINI_API_KEY)

                ai_model = "gemini-1.5-flash"

                system_instructions = textwrap.dedent(f"""
                You are a senior data analyst writing executive insights.

                You receive:
                  • the target column name
                  • top correlations of numeric and categorical features with the target
                  • dataset shape (rows, columns)

                TASK:
                  • Write exactly 3 deep, decision-oriented one-liners (max 25 words each).
                  • Interpret correlations with possible reasons or implications.
                  • Avoid trivial statements (e.g., target correlating with itself) and generic advice.
                  • Prefer causal or actionable framing (e.g., “Higher engagement predicts retention gains.”).
                  • Return a pure JSON list of 3 strings—no bullets or markdown.
                """)

                user_payload = {
                    "target": target,
                    "dataset_profile": {"rows": int(df.shape[0]), "cols": int(df.shape[1])},
                    "numeric_correlations_top": numeric_top,
                    "categorical_correlations_top": cat_top,
                }

                prompt = (
                    "DATA (JSON):\n"
                    f"{user_payload}\n\n"
                    "OUTPUT:\n"
                    "Return exactly 3 insights as a JSON list of strings."
                )

                model = genai.GenerativeModel(ai_model)
                resp = model.generate_content(system_instructions + "\n\n" + prompt)

                # Robust extraction
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
                print("Gemini raw response:", text)

                # Parse JSON list; fallback to line split
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, list):
                        ai_insights = [str(x) for x in parsed][:3]
                except Exception as ex:
                    print("Gemini JSON parse error:", ex)
                    for line in text.splitlines():
                        line = line.strip("-• ").strip()
                        if line:
                            ai_insights.append(line)
                        if len(ai_insights) >= 3:
                            break

                if not ai_insights:
                    ai_insights = _fallback_points()

                ai_insights = [s[:220] for s in ai_insights][:3]

        except Exception as e:
            print("Gemini AI block error:", e)
            try:
                ai_insights = _fallback_points()
            except Exception:
                ai_insights = []

        print("AI Insights:", ai_insights)
        
        # -------------------- Return --------------------
        print({
            "status": "success",
            "mode": mode,
            "target": target,
            "steps": steps,
            "numeric_analysis": numeric_analysis,
            "categorical_analysis": cat_analysis,
            "insights": insights,
            "ai_insights": ai_insights,
            "ai_model": ai_model,
            "model_info": model_info
        })
        return {
            "status": "success",
            "mode": mode,
            "target": target,
            "steps": steps,
            "numeric_analysis": numeric_analysis,
            "categorical_analysis": cat_analysis,
            "insights": insights,
            "ai_insights": ai_insights,
            "ai_model": ai_model,
            "model_info": model_info
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
