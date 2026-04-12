from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status
from models import SyllabusSchema
from services.ai_parser import process_syllabus_file
from services.auth import verify_firebase_token
from database import users_db
import traceback

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])

@router.post("/upload-syllabus") 
async def upload_syllabus(
    file: UploadFile = File(...),
    uid: str = Depends(verify_firebase_token)
):
    """
    Receives a PDF syllabus, parses it via Gemini AI, and stores it 
    as a structured tree in the user's database.
    """
    print(f"🚀 [SYLLABUS] Upload initiated by user: {uid}")
    
    # 1. Validation: Ensure it's actually a PDF
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid file type. Please upload a PDF syllabus."
        )

    try:
        # 2. Efficiently read file content
        pdf_bytes = await file.read()
        if len(pdf_bytes) == 0:
            raise ValueError("The uploaded file is empty.")

        print(f"📄 [SYLLABUS] PDF Read Success: {len(pdf_bytes)} bytes")
        
        # 3. Call Gemini AI Parser
        validated_schema = await process_syllabus_file(pdf_bytes)
        print("🧠 [SYLLABUS] Gemini Parsing Complete!")
        
        # 4. Structured Storage
        if uid not in users_db:
            users_db[uid] = {}
            
        syllabus_data = validated_schema.model_dump()
        users_db[uid]["syllabus"] = syllabus_data
        
        print(f"💾 [SYLLABUS] Data successfully persisted for {uid}")
        
        return syllabus_data

    # 🚨 THE FIX IS HERE 🚨
    # This intercepts the 503 from ai_parser and sends it directly to React
    except HTTPException as http_exc:
        print(f"⚠️ [SYLLABUS] Passing through specific HTTP Error: {http_exc.status_code}")
        raise http_exc
        
    except ValueError as ve:
        print(f"⚠️ [SYLLABUS] Validation Error: {str(ve)}")
        raise HTTPException(status_code=422, detail=f"Syllabus Content Error: {str(ve)}")

    except Exception as e:
        print("\n🚨🚨🚨 SYLLABUS CRITICAL CRASH 🚨🚨🚨")
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"The AI Professor failed to read this syllabus. Technical: {str(e)}"
        )
    finally:
        await file.close()

@router.get("/my-syllabus", response_model=SyllabusSchema)
async def get_my_syllabus(uid: str = Depends(verify_firebase_token)):
    """
    Fetches the saved syllabus tree for the logged-in user.
    """
    user_data = users_db.get(uid)
    if not user_data or "syllabus" not in user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No syllabus found. Time to upload your first one!"
        )
    
    return user_data["syllabus"]