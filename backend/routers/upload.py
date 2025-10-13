from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from repositories.upload import upload_file, process_data

router = APIRouter(
    tags=['upload'],
)

class ProcessRequest(BaseModel):
    filename: str
    target: str
    mode: str

@router.post("/upload")
async def upload_endpoint(file: UploadFile = File(...)):
    return await upload_file(file)

@router.post("/process")
async def process_endpoint(req: ProcessRequest):
    return process_data(req)