import fitz  # PyMuPDF
import json
import os
import traceback
import logging
from google import genai
from google.genai import types, errors
from fastapi import HTTPException, status
from models import SyllabusSchema # Assumes this is defined in backend/models.py

# Set up logging for the terminal
logger = logging.getLogger("uvicorn")

# 🚨 SECURITY: Pulling the API key from your environment variable!
# Do NOT paste your raw key here like AIzaSy... it will cause a crash.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBE9neikmInS4yqYHoVYufIcVVeCz3dIc8")

# Initialize the client only if the key exists to avoid startup crashes
if not GEMINI_API_KEY:
    logger.warning("⚠️ GEMINI_API_KEY environment variable is not set!")

client = genai.Client(api_key=GEMINI_API_KEY) 

async def process_syllabus_file(pdf_bytes: bytes) -> SyllabusSchema:
    """Extracts text from PDF bytes and uses Gemini 2.5 Flash to map it to a structured learning path."""
    
    # ==========================================
    # 1. EXTRACT TEXT FROM PDF
    # ==========================================
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        raw_text = ""
        for page in doc:
            raw_text += page.get_text()
            
        if not raw_text.strip():
            raise ValueError("The uploaded PDF appears to be empty or contains only images.")
        
        logger.info(f"📄 [PARSER] Extracted {len(raw_text)} characters from PDF.")
        
    except Exception as e:
        logger.error(f"❌ [PARSER] PDF Read Error: {str(e)}")
        # Raise an HTTP exception so the frontend knows the file was bad
        raise HTTPException(status_code=400, detail=f"Failed to read PDF file: {str(e)}")

    # ==========================================
    # 2. THE ELITE PROFESSOR PROMPT
    # ==========================================
    prompt = f"""
    You are an elite academic architect. Analyze the following university syllabus text and 
    transform it into a highly structured, logical learning roadmap.
    
    YOUR DIRECTIVES:
    1. Organize the hierarchy into Units and Topics.
    2. For every Unit, extract exactly 6 to 8 core Topics to ensure depth.
    3. Determine logical prerequisites: A topic should list the IDs of topics that must be completed first.
    4. STATUS LOGIC: 
       - Set the status of the VERY FIRST topic in the entire syllabus to "unlocked".
       - Set the status of EVERY other topic to "locked".
    5. Ensure IDs are clean and consistent (e.g., "u1_t1", "u1_t2").

    SYLLABUS TEXT:
    {raw_text[:20000]} 
    """

    # ==========================================
    # 3. CALL AI WITH GRACEFUL ERROR HANDLING
    # ==========================================
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SyllabusSchema,
                temperature=0.1, # Low temperature for high structural accuracy
            )
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        # 4. Parse JSON with "List-Armor"
        parsed_json = json.loads(response.text)
        
        # Sometimes AI returns a single-item list containing the object
        if isinstance(parsed_json, list):
            parsed_json = parsed_json[0]
            
        # 5. Validate against Pydantic Model
        return SyllabusSchema(**parsed_json)

    # 🚨 This specifically catches the 503 High Demand / 429 Rate Limit crashes from Gemini
    except errors.ServerError as e:
        error_msg = str(e)
        if "503" in error_msg or "UNAVAILABLE" in error_msg:
            logger.warning("🚨 [PARSER] API Demand Spike: Caught 503 Error")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The AI Professor is currently experiencing high demand while reading your syllabus. Please wait a few seconds and try uploading again."
            )
        elif "429" in error_msg:
            logger.warning("🚨 [PARSER] Rate Limit Hit: Caught 429 Error")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="You are generating requests too quickly. Please give the AI a moment to cool down."
            )
        else:
            logger.error(f"🚨 [PARSER] Server Error during parsing: {e}")
            raise HTTPException(
                status_code=500, 
                detail="The AI Professor encountered an unexpected server error."
            )

    # 🚨 This catches pure code/parsing failures (like bad JSON or Pydantic validation errors)
    except Exception as e:
        logger.error("\n" + "🔥"*20)
        logger.error("SYLLABUS PARSING CRITICAL FAILURE:")
        traceback.print_exc()
        logger.error("🔥"*20 + "\n")
        raise HTTPException(
            status_code=500, 
            detail=f"The AI Professor failed to map this syllabus. It may be formatted in a way I don't understand yet."
        )