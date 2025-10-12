from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel
from repositories import upload

router = APIRouter(
    tags=['upload'],
)

class ProcessRequest(BaseModel):
    target: str
    mode: str

@router.post('/upload')
async def upload_file(file: UploadFile = File(...)):
    return upload.upload_file(file)

@router.post('/process')
async def process_data(request: ProcessRequest):
    return {
        "message": f"Processing data with target '{request.target}' in '{request.mode}' mode",
        "target": request.target,
        "mode": request.mode,
        "status": "processing"
    }