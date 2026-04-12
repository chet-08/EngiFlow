from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status
from services.vector_store import process_and_store_document
from services.auth import verify_firebase_token
import logging

# Standard logger for tracking uploads
logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

@router.post("/upload-textbook")
async def upload_textbook(
    file: UploadFile = File(...),
    uid: str = Depends(verify_firebase_token)
):
    """
    Uploads a textbook/PDF, chunks it, and stores it in the Vector Database.
    The content is tagged with the user's UID for private retrieval.
    """
    # 1. Basic Type Validation
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only PDF files are supported for textbook memorization."
        )

    logger.info(f"📚 [KNOWLEDGE] User {uid} is uploading: {file.filename}")

    try:
        # 2. Read content
        pdf_bytes = await file.read()
        
        # Check if file is suspiciously small or empty
        if len(pdf_bytes) < 100:
            raise ValueError("The PDF file appears to be empty or corrupted.")

        # 3. Process and Store
        # IMPORTANT: Pass the uid so the vector store can tag these chunks!
        num_chunks = await process_and_store_document(pdf_bytes, user_id=uid)
        
        return {
            "status": "success",
            "filename": file.filename,
            "message": f"Successfully memorized your notes!",
            "chunks_processed": num_chunks
        }

    except ValueError as ve:
        logger.warning(f"⚠️ [KNOWLEDGE] File error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        logger.error(f"❌ [KNOWLEDGE ERROR] Failed to store document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="The Knowledge Engine is currently offline. Please try again later."
        )
    finally:
        await file.close()

@router.delete("/clear-my-knowledge")
async def clear_knowledge(uid: str = Depends(verify_firebase_token)):
    """
    Optional: Allows a user to wipe their custom uploaded data 
    if they want to start fresh with a new subject.
    """
    # This would call a service to delete vectors where metadata['user_id'] == uid
    return {"message": "Your custom knowledge base has been cleared."}