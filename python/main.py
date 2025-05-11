from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import face_recognition
import numpy as np
import faiss
import os
import pickle
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import cv2
import io
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# Configuration
METADATA_FILE = "metadata.pkl"
INDEX_FILE = "face_index.faiss"

# Load existing data (same as your original functions)
def load_index_and_metadata():
    if os.path.exists(INDEX_FILE):
        index = faiss.read_index(INDEX_FILE)
    else:
        index = faiss.IndexFlatL2(128)

    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, 'rb') as f:
            metadata = pickle.load(f)
    else:
        metadata = []

    return index, metadata

def save_index_and_metadata(index, metadata):
    faiss.write_index(index, INDEX_FILE)
    with open(METADATA_FILE, 'wb') as f:
        pickle.dump(metadata, f)

@app.get("/")
def home():
    return {"message": "Face Recognition API is running!"}

# API Endpoints
@app.post("/add_face/")
async def add_face(name: str = Form(...), file: UploadFile = File(...)):
    try:
        # Load existing index and metadata
        index, metadata = load_index_and_metadata()

        # Check for duplicate name
        if name in metadata:
            raise HTTPException(status_code=400, detail="Name must be unique.")

        # Save uploaded file temporarily
        with open("temp.jpg", "wb") as buffer:
            buffer.write(await file.read())

        # Process the image
        image = face_recognition.load_image_file("temp.jpg")
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            raise HTTPException(status_code=400, detail="No face detected.")
        
        encodings = face_recognition.face_encodings(image, face_locations)
        embedding = encodings[0]

        # Update database
        index.add(np.array([embedding], dtype='float32'))
        metadata.append(name)
        save_index_and_metadata(index, metadata)

        os.remove("temp.jpg")  # Cleanup
        return {"status": "success", "name": name}
    
    except HTTPException as http_exc:
        raise http_exc  # re-raise known HTTPExceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/identify_face/")
async def identify_face(file: UploadFile = File(...)):
    try:
        # Read the uploaded file
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)

        # Detect faces
        face_locations = face_recognition.face_locations(image_np)
        if not face_locations:
            return []

        # Get encodings for each face
        encodings = face_recognition.face_encodings(image_np, face_locations)

        # Load index and metadata
        index, metadata = load_index_and_metadata()

        results = []
        for encoding, location in zip(encodings, face_locations):
            name = "Unknown"
            status = "unknown"

            if index.ntotal > 0:
                # Search in FAISS
                D, I = index.search(np.array([encoding], dtype='float32'), k=1)
                if D[0][0] < 0.6:  # You can tweak the threshold
                    name = metadata[I[0][0]]
                    status = "match"

            # Convert (top, right, bottom, left) format
            results.append({
                "bounding_box": list(location),
                "name": name,
                "status": status
            })

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/list_faces/")
async def list_faces():
    index, metadata = load_index_and_metadata()
    return {"faces": metadata}

@app.delete("/delete_all_faces/")
async def delete_all_faces():
    try:
        # Delete FAISS index file
        if os.path.exists(INDEX_FILE):
            os.remove(INDEX_FILE)
        
        # Delete metadata file
        if os.path.exists(METADATA_FILE):
            os.remove(METADATA_FILE)
        
        return {"status": "success", "message": "All face entries have been deleted"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Start the server (run with `uvicorn app:app --reload`)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
  