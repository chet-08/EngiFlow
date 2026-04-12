from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from services.auth import verify_firebase_token
from services.vector_store import search_knowledge_base
from services.ai_tutor import generate_study_note
from pydantic import BaseModel
from typing import Dict, List, Optional
from google import genai
import traceback
import os

# Configuration
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "AIzaSyBE9neikmInS4yqYHoVYufIcVVeCz3dIc8"))

router = APIRouter(prefix="/tutor", tags=["Tutor"])

# ==========================================
# SCHEMA DEFINITIONS
# ==========================================

class TopicRequest(BaseModel):
    subject_name: str  
    topic_title: str
    semester: str

class ChatMessage(BaseModel):
    role: str      # 'user' or 'assistant'
    content: str   # The actual text

class ChatRequest(BaseModel):
    topic: str     
    message: str   
    history: List[ChatMessage] 

class StreamRequest(BaseModel):
    subject_name: str
    topic_title: str
    subtopic_title: str

# ==========================================
# ENDPOINTS
# ==========================================

@router.post("/chat")
async def chat_with_professor(request: ChatRequest, uid: str = Depends(verify_firebase_token)):
    """
    Handles follow-up questions from the Deep Dive Chat sidebar.
    """
    try:
        history_text = ""
        for msg in request.history:
            role_label = "Student" if msg.role == "user" else "Professor"
            history_text += f"{role_label}: {msg.content}\n"

        prompt = f"""
        You are EngiFlow's brilliant, encouraging engineering professor. 
        Your goal is to help a student from IGDTUW understand complex concepts.
        
        CURRENT CONTEXT: The student is studying "{request.topic}".
        
        CONVERSATION HISTORY:
        {history_text}
        
        STUDENT'S NEW QUESTION: 
        {request.message}
        
        INSTRUCTIONS:
        - Provide a concise, clear, and highly educational response (under 2 paragraphs).
        - Use relatable engineering analogies.
        - Speak directly to the student (use "you").
        - DO NOT use markdown like bolding or bullet points. Use standard readable text.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash", # 🚨 FIXED: Use 2.5-flash for high rate limits
            contents=prompt,
        )
        
        if not response.text:
            raise ValueError("Empty response from AI")

        return {"reply": response.text}

    except Exception as e:
        print("\n🚨 CHAT CRASH 🚨")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="The Professor is a bit overwhelmed right now. Please try your question again."
        )


@router.post("/generate-note")
async def get_note(request: TopicRequest, uid: str = Depends(verify_firebase_token)):
    """
    Generates the initial structured study note (The Skeleton + Quizzes).
    """
    try:
        note = await generate_study_note(
                subject_name=request.subject_name, 
                topic_title=request.topic_title, 
                semester=request.semester,
                uid=uid
            )
        return note
        
    except Exception as e:
        error_msg = str(e)
        if "503" in error_msg or "UNAVAILABLE" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The AI Professor is experiencing high demand. Please try again in 5 seconds."
            )
        elif "429" in error_msg:
             raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Easy there! You're learning faster than the AI can keep up. Wait a moment."
            )
        else:
            print(f"CRITICAL AI ERROR: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate lesson notes. Please try a different topic."
            )


@router.post("/stream-subtopic")
async def stream_subtopic_content(request: StreamRequest, uid: str = Depends(verify_firebase_token)):
    """
    Streams the beautifully formatted Markdown textbook content word-by-word.
    Handles dynamic fallback if Vector DB misses.
    """
    try:
        # 1. Fetch the PDF data for THIS specific user
        # 🚨 FIXED: Added 'user_id=uid' to ensure user isolation
        context = search_knowledge_base(f"{request.topic_title} {request.subtopic_title}", user_id=uid)
        
        # DYNAMIC FALLBACK LOGIC
        if context and context.strip():
            context_prompt = f"SOURCE MATERIAL FROM UPLOADED PDF:\n{context}\n\n"
            source_instruction = "Base your explanation strictly on the SOURCE MATERIAL provided above."
        else:
            context_prompt = ""
            source_instruction = "Rely on your elite, comprehensive internal knowledge base of Engineering and AI to write the section."

        # 🚨 FINAL POLISHED PROMPT
        prompt = f"""
        {context_prompt}
        
        You are an elite Engineering Professor writing the official textbook section for '{request.subtopic_title}' (Part of: {request.topic_title}).
        {source_instruction}

        CRITICAL FORMATTING RULES:
        1. EXTREME SPACING: You MUST use DOUBLE line breaks (\\n\\n) between EVERY single paragraph.
        2. HEADERS: Break the text into logical sections using Markdown headers (### and ####).
        3. STYLING: **Bold** all key definitions and core concepts.
        4. LISTS: Heavily utilize bullet points for features, differences, or rules.
        5. VISUALS: You MUST include exactly ONE image trigger in the middle of the text. Format it EXACTLY like this: [IMAGE: <Short 1-2 word Wikipedia search term, e.g., Turing, Chess, Robot>]. DO NOT use long sentences in the brackets.
        6. OUTPUT: Return pure Markdown text only. Do not wrap in JSON or code blocks.

        CRITICAL INSTRUCTION: You MUST format your entire response using the EXACT template below. Do not deviate.

        ### [Insert Main Concept Heading Here]

        [Write a clear, engaging paragraph explaining the concept. Minimum 3 sentences.]

        [Write a second paragraph going deeper into the technical details or rationale.]

        [IMAGE: Short_Noun_Here]

        #### Key Components & Features
        * **[Key Term 1]:** [Detailed definition or explanation]
        * **[Key Term 2]:** [Detailed definition or explanation]
        * **[Key Term 3]:** [Detailed definition or explanation]

        ### [Insert Next Main Concept Heading Here]

        [Write explanation paragraph...]
        
        [Provide a real-world example paragraph...]
        """
        
        def generate():
            # 🚨 FIXED: Switched to 2.5-flash for high rate limits
            response = client.models.generate_content_stream(
                model="gemini-2.5-flash", 
                contents=prompt
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        print(f"Streaming Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to stream content")