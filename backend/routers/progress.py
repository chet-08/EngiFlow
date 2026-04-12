from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from services.progress_engine import unlock_next_topics
from services.auth import verify_firebase_token
from database import users_db
import logging

# Set up logging to track student progress in the console
logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/progress", tags=["Progress"])

class QuizSubmission(BaseModel):
    topic_id: str = Field(..., description="The ID of the topic, e.g., 'u1_t1'")
    passed_quiz: bool = Field(..., description="True if they got the quiz right, False otherwise")

@router.post("/submit-quiz")
async def submit_quiz(
    submission: QuizSubmission, 
    uid: str = Depends(verify_firebase_token)
):
    """
    Handles quiz results. If passed, it triggers the engine to 
    mark the topic as 'completed' and 'unlocked' the next logical step.
    """
    # 1. Verification: Ensure user exists and has a syllabus
    user_data = users_db.get(uid)
    if not user_data or "syllabus" not in user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No syllabus found. Please upload one before attempting quizzes."
        )

    logger.info(f"📊 [PROGRESS] User {uid} submitted quiz for {submission.topic_id}. Success: {submission.passed_quiz}")

    # 2. Handling Failure
    if not submission.passed_quiz:
        return {
            "status": "retry",
            "message": "Not quite there yet! Review the notes and try the quiz again to unlock the next level.", 
            "syllabus": user_data.get("syllabus")
        }

    # 3. Handling Success (Unlock Logic)
    try:
        # The engine should return the full updated syllabus object
        updated_syllabus = await unlock_next_topics(uid, submission.topic_id)
        
        if not updated_syllabus:
            raise ValueError("Progress engine returned empty syllabus.")

        # CRITICAL: Persist the changes back to your database
        users_db[uid]["syllabus"] = updated_syllabus
        
        return {
            "status": "success",
            "message": f"🌟 Great job! Topic {submission.topic_id} is complete. Next topic unlocked!", 
            "syllabus": updated_syllabus
        }

    except Exception as e:
        logger.error(f"❌ [PROGRESS ERROR] Failed to unlock topics for {uid}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="We couldn't update your progress. Please try submitting again."
        )

@router.get("/status")
async def get_progress_summary(uid: str = Depends(verify_firebase_token)):
    """
    Returns a quick overview of how many topics are completed vs total.
    Useful for a progress bar in the frontend.
    """
    user_data = users_db.get(uid)
    if not user_data or "syllabus" not in user_data:
        return {"completed": 0, "total": 0, "percentage": 0}

    syllabus = user_data["syllabus"]
    all_topics = []
    
    # Flattening the nested units/topics to count them
    for unit in syllabus.get("units", []):
        all_topics.extend(unit.get("topics", []))
    
    total = len(all_topics)
    completed = len([t for t in all_topics if t.get("status") == "completed"])
    
    return {
        "completed": completed,
        "total": total,
        "percentage": round((completed / total) * 100) if total > 0 else 0
    }