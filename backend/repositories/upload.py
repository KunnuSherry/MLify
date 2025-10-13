# backend/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io, os, uuid
import matplotlib.pyplot as plt
from sklearn.preprocessing import LabelEncoder

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../uploads")
GRAPH_DIR = os.path.join(os.path.dirname(__file__), "../static/graphs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GRAPH_DIR, exist_ok=True)


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
    return out_path

def process_data(req):
    if not req.target or not req.mode:
        raise HTTPException(status_code=400, detail="Target or mode is missing")
    # Steps messages will be returned so frontend can show them step-by-step
    steps = []

    csv_path = os.path.join(UPLOAD_DIR, req.filename)
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=400, detail="Uploaded file not found on server. Re-upload and try again.")

    # Step 1: Save the dataset (already saved), load it
    steps.append({"step": "load_dataset", "message": "Loading dataset from server...", "status": "done"})
    df = pd.read_csv(csv_path)

    target = req.target
    if target not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{target}' not found in dataset.")

    # Step 2: Missing values report and handling
    missing_before = df.isnull().sum()
    total_missing = int(missing_before.sum())
    steps.append({"step": "missing_detected", "message": f"Found {total_missing} missing values across {len(missing_before[missing_before>0])} columns.", "status": "done", "details": missing_before[missing_before>0].to_dict()})

    # Auto-fill missing values (simple policy)
    # numerical -> median, categorical -> mode or 'Unknown'
    for col in df.columns:
        if df[col].isnull().sum() > 0:
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].median())
            else:
                # try mode, else fill 'Unknown'
                try:
                    df[col] = df[col].fillna(df[col].mode().iloc[0])
                except Exception:
                    df[col] = df[col].fillna("Unknown")

    missing_after = int(df.isnull().sum().sum())
    steps.append({"step": "missing_handled", "message": f"Missing values handled. Remaining missing values: {missing_after}.", "status": "done"})

    # Step 3: Separate numeric & categorical
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    # Exclude target from features lists if present
    if target in numeric_cols:
        pass
    features = [c for c in df.columns if c != target]
    steps.append({"step": "separate_types", "message": f"Separated columns into {len(numeric_cols)} numeric and {len(categorical_cols)} categorical.", "status": "done", "numeric_cols": numeric_cols, "categorical_cols": categorical_cols})

    # Step 4: Directly compare numeric columns with target
    # We'll compute correlation if target is numeric; if target is categorical, compute group-wise means
    numeric_analysis = {}
    try:
        if pd.api.types.is_numeric_dtype(df[target]):
            # Pearson correlation for numeric features vs numeric target
            corr_series = df[numeric_cols + [target]].corr()[target].drop(index=[target]).sort_values(key=abs, ascending=False)
            numeric_analysis["type"] = "numeric_target"
            numeric_analysis["correlations"] = corr_series.to_dict()
            steps.append({"step": "numeric_target_corr", "message": "Computed Pearson correlation between numeric features and numeric target.", "status": "done"})
            # Save heatmap for numeric correlations (including target)
            fig = plt.figure(figsize=(6,5))
            corrmat = df[numeric_cols + [target]].corr()
            plt.imshow(corrmat, interpolation='nearest', cmap='coolwarm')
            plt.xticks(range(len(corrmat.columns)), corrmat.columns, rotation=45, ha='right')
            plt.yticks(range(len(corrmat.index)), corrmat.index)
            plt.colorbar()
            save_plot(fig, f"{req.filename}_num_corr.png")
            numeric_analysis["corr_heatmap"] = f"/static/graphs/{req.filename}_num_corr.png"
        else:
            # target is categorical -> compute means of numeric features per class and an ANOVA-like score (F value approximate)
            numeric_analysis["type"] = "categorical_target"
            group_means = df.groupby(target)[numeric_cols].mean().T
            numeric_analysis["group_means"] = group_means.to_dict()
            steps.append({"step": "numeric_group_stats", "message": "Computed group-wise means of numeric features per class.", "status": "done"})
            # Plot top numeric features distributions per class for top 3 features by variance
            var_scores = df[numeric_cols].var().sort_values(ascending=False)
            top3 = var_scores.head(3).index.tolist()
            plots = []
            for col in top3:
                fig = plt.figure(figsize=(6,4))
                for cls in df[target].unique():
                    subset = df[df[target]==cls]
                    plt.hist(subset[col].dropna(), alpha=0.5, bins=20, label=str(cls))
                plt.legend()
                plt.title(f"{col} distribution by {target}")
                fname = f"{req.filename}_group_{col}.png"
                save_plot(fig, fname)
                plots.append(f"/static/graphs/{fname}")
            numeric_analysis["top_feature_plots"] = plots

    except Exception as e:
        steps.append({"step": "numeric_analysis_error", "message": f"Error analyzing numeric features: {str(e)}", "status": "error"})

    # Step 5: Convert categorical columns to numeric and compare
    cat_analysis = {}
    if len(categorical_cols) > 0:
        df_encoded = df.copy()
        le_map = {}
        for col in categorical_cols:
            # Label encode (safe fallback) - convert to string to avoid issues
            try:
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                le_map[col] = list(le.classes_)
            except Exception:
                # fallback: factorize
                df_encoded[col], uniques = pd.factorize(df_encoded[col].astype(str))
                le_map[col] = list(uniques)

        # compute correlation of encoded cat features with target (if target numeric) or with encoded target
        try:
            if not pd.api.types.is_numeric_dtype(df[target]):
                # encode target too for correlation purposes
                le_t = LabelEncoder()
                df_encoded[target] = le_t.fit_transform(df_encoded[target].astype(str))
            corr_cat = df_encoded[categorical_cols + [target]].corr()[target].drop(index=[target]).sort_values(key=abs, ascending=False)
            cat_analysis["correlations"] = corr_cat.to_dict()
            cat_analysis["label_encoding_map"] = le_map
            steps.append({"step": "cat_encoded_corr", "message": "Encoded categorical features and computed correlations with target.", "status": "done"})
            # Plot top 3 categorical correlations as bar charts
            top_cat = corr_cat.abs().sort_values(ascending=False).head(3).index.tolist()
            cat_plots = []
            for col in top_cat:
                fig = plt.figure(figsize=(6,4))
                # plot average numeric-target (or encoded target) per category
                df_tmp = df.groupby(col)[target].apply(lambda x: x.astype(str).mode()[0] if x.dtype == 'object' else x.mean())
                # fallback: if target numeric, plot mean target by category
                if pd.api.types.is_numeric_dtype(df[target]):
                    vals = df.groupby(col)[target].mean()
                    vals.plot(kind='bar')
                else:
                    vals = df.groupby(col)[target].apply(lambda x: x.value_counts(normalize=True).max())
                    vals.plot(kind='bar')
                plt.title(f"{col} vs {target}")
                fname = f"{req.filename}_cat_{col}.png"
                save_plot(fig, fname)
                cat_plots.append(f"/static/graphs/{fname}")
            cat_analysis["plots"] = cat_plots
        except Exception as e:
            steps.append({"step": "cat_analysis_error", "message": f"Error in categorical analysis: {str(e)}", "status": "error"})
    else:
        steps.append({"step": "cat_analysis_skipped", "message": "No categorical columns found to analyze.", "status": "done"})
        cat_analysis["note"] = "no categorical columns"

    # Build quick textual insights (top correlated features / low correlated)
    insights = []
    try:
        # combine numeric and categorical correlation dicts if present
        combined_corr = {}
        if "correlations" in numeric_analysis and isinstance(numeric_analysis["correlations"], dict):
            combined_corr.update(numeric_analysis["correlations"])
        if "correlations" in cat_analysis and isinstance(cat_analysis["correlations"], dict):
            combined_corr.update(cat_analysis["correlations"])
        # If combined_corr not empty, sort by absolute corr
        if combined_corr:
            # keys -> feature: value
            sorted_feat = sorted(combined_corr.items(), key=lambda kv: abs(kv[1]), reverse=True)
            top_feats = sorted_feat[:5]
            low_feats = sorted_feat[-5:]
            insights.append({"top_features": [{k: v} for k, v in top_feats]})
            insights.append({"low_features": [{k: v} for k, v in low_feats]})
        else:
            insights.append({"note": "No correlation values computed (target maybe non-numeric and encoding couldn't compute correlation)."})
    except Exception as e:
        insights.append({"error": f"Could not create textual insights: {str(e)}"})

    # Step final: Prepare response with steps array, graphs and insights
    response = {
        "status": "success",
        "mode": req.mode,
        "target": target,
        "steps": steps,
        "numeric_analysis": numeric_analysis,
        "categorical_analysis": cat_analysis,
        "insights": insights
    }

    return (response)

