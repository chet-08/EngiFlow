from database import users_db
import logging

logger = logging.getLogger("uvicorn")

async def unlock_next_topics(uid: str, topic_id: str):
    """
    Marks a topic as completed and unlocks any newly available topics.
    Handles data as standard Python dictionaries to match your DB storage.
    """
    user_data = users_db.get(uid)
    
    if not user_data or "syllabus" not in user_data:
        logger.error(f"❌ [ENGINE] No syllabus found for user {uid}")
        return None

    # Working with the dictionary directly
    syllabus = user_data["syllabus"]
    units = syllabus.get("units", [])
    
    # 1. Update the target topic to 'completed'
    topic_found = False
    for unit in units:
        for topic in unit.get("topics", []):
            if topic.get("id") == topic_id:
                topic["status"] = "completed"
                topic_found = True
                break
        if topic_found: break

    if not topic_found:
        logger.warning(f"⚠️ [ENGINE] Topic {topic_id} not found in syllabus for {uid}")
        return syllabus

    # 2. Collect ALL completed topic IDs for the 'Gatekeeper' check
    completed_topics = set()
    for unit in units:
        for topic in unit.get("topics", []):
            if topic.get("status") == "completed":
                completed_topics.add(topic.get("id"))

    # 3. Gatekeeper Logic: Check prerequisites for 'locked' topics
    newly_unlocked_count = 0
    for unit in units:
        for topic in unit.get("topics", []):
            # Only check topics that are currently locked
            if topic.get("status") == "locked":
                prereqs = topic.get("prerequisites", [])
                
                # Logic: If prerequisites list is empty OR all prereqs are completed
                if not prereqs or all(p in completed_topics for p in prereqs):
                    topic["status"] = "unlocked"
                    newly_unlocked_count += 1
                    logger.info(f"🔓 [ENGINE] Unlocked: {topic.get('title')} for {uid}")

    return syllabus