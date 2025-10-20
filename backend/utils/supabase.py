# utils/supabase.py
from __future__ import annotations
import os, mimetypes
from typing import Optional, Union
from supabase import create_client, Client
import dotenv

dotenv.load_dotenv()

SUPABASE_URL: Optional[str] = os.getenv("PROJECT_URL")
SUPABASE_KEY: Optional[str] = os.getenv("SERVICE_KEY")
DEFAULT_BUCKET: str = os.getenv("SUPABASE_BUCKET", "mlify-storage")
PUBLIC_READ_DEFAULT: bool = os.getenv("SUPABASE_PUBLIC_READ", "true").lower() == "true"

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase credentials. Set PROJECT_URL and SERVICE_KEY.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def _guess_content_type(name: str, fallback: str = "application/octet-stream") -> str:
    overrides = {
        ".csv": "text/csv", ".json": "application/json", ".txt": "text/plain; charset=utf-8",
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf",
        ".pkl": "application/octet-stream", ".pickle": "application/octet-stream",
    }
    ext = os.path.splitext(name)[1].lower()
    if ext in overrides: return overrides[ext]
    guessed, _ = mimetypes.guess_type(name)
    return guessed or fallback

def public_url(key: str, bucket_name: str = DEFAULT_BUCKET) -> str:
    res = supabase.storage.from_(bucket_name).get_public_url(key)
    if isinstance(res, str):
        return res
    if isinstance(res, dict):
        return (
            res.get("publicURL")
            or res.get("publicUrl")
            or (res.get("data") or {}).get("publicURL")
            or (res.get("data") or {}).get("publicUrl")
            or str(res)
        )
    try:
        get = getattr(res, "get", None)
        if callable(get):
            cand = (
                get("publicURL") or get("publicUrl")
                or (get("data") or {}).get("publicURL")
                or (get("data") or {}).get("publicUrl")
            )
            if cand: return str(cand)
    except Exception:
        pass
    return str(res)

def signed_url(key: str, expires_in: int = 3600, bucket_name: str = DEFAULT_BUCKET) -> str:
    res = supabase.storage.from_(bucket_name).create_signed_url(key, expires_in)
    if isinstance(res, str): return res
    if isinstance(res, dict): return res.get("signedURL") or res.get("signedUrl") or str(res)
    try:
        get = getattr(res, "get", None)
        if callable(get):
            cand = get("signedURL") or get("signedUrl")
            if cand: return str(cand)
    except Exception:
        pass
    return str(res)

def upload_bytes(
    data: Union[bytes, bytearray],
    key: str,
    *,
    bucket_name: str = DEFAULT_BUCKET,
    content_type: Optional[str] = None,
    upsert: bool = True,
    make_public: Optional[bool] = None,
) -> str:
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("upload_bytes expects raw bytes or bytearray")
    ct = content_type or _guess_content_type(key)
    file_opts = {"contentType": str(ct), "upsert": "true" if upsert else "false"}
    res = supabase.storage.from_(bucket_name).upload(key, bytes(data), file_opts)
    if getattr(res, "status_code", 200) not in (200, 201):
        raise RuntimeError(f"Supabase upload failed: {res}")
    public = PUBLIC_READ_DEFAULT if make_public is None else make_public
    return public_url(key, bucket_name) if public else signed_url(key, bucket_name=bucket_name)
