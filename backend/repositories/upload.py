from fastapi import File, UploadFile, HTTPException, status
import pandas as pd
import io


def upload_file(file: UploadFile):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a CSV file")
    
    try:
        # Read the file content
        contents = file.file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        columns = list(df.columns)
        preview = df.head(5).to_html(classes='table table-striped', index=False)
        
        return {
            'columns': columns,
            'preview': preview
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error processing file: {str(e)}")
