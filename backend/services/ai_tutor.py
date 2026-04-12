from google import genai
from google.genai import types 
import json
from pydantic import BaseModel
from typing import List
from services.vector_store import search_knowledge_base
import os

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "AIzaSyBE9neikmInS4yqYHoVYufIcVVeCz3dIc8"))

# ==========================================
# LIGHTWEIGHT SCHEMAS 
# ==========================================
class QuizItem(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class SubtopicQuizSet(BaseModel):
    id: str
    title: str
    content: str  
    quizzes: List[QuizItem]

class QuizGenerationResult(BaseModel):
    subtopics: List[SubtopicQuizSet]


# ==========================================
# 1. THE SKELETON & QUIZ GENERATOR
# ==========================================
async def generate_study_note(subject_name: str, topic_title: str, semester: str, uid: str) -> dict:
    """Generates the structured textbook outline AND the Gatekeeper quizzes."""
    
    context = search_knowledge_base(topic_title, user_id=uid)
    
    context_prompt = ""
    if context:
        context_prompt = f"""
        USE THE FOLLOWING TEXTBOOK EXCERPTS TO BASE YOUR OUTLINE AND QUIZZES ON:
        {context}
        """

    # 🚨 THE STRICT JSON PROMPT (Fixes Nodes, Quizzes, and IDs)
    prompt = rf"""
{context_prompt}

You are an elite Professor evaluating an advanced undergraduate engineering student. 
The current subject is: '{subject_name}'. 
The specific topic is: '{topic_title}'.

YOUR DIRECTIVE:
Generate the structural outline (subtopics) and highly rigorous multiple-choice questions for this topic.
- DO NOT generate the actual lesson content. Leave the "content" field completely empty.

OUTPUT SCHEMA:
Return a valid JSON object matching the exact structure below. 
CRITICAL RULES:
1. You MUST generate between 6 to 8 subtopics. 
2. You MUST generate exactly 5 quizzes per subtopic.
3. The 'id' field MUST be a simple number (e.g., "1", "2", "3") or decimal ("1.1", "1.2"). DO NOT use text words like "intelligent_agents".

{{
  "subtopics": [
    {{
      "id": "1",
      "title": "[Name of the sub-concept]",
      "content": "", 
      "quizzes": [
        {{
          "question": "A deeply technical or highly conceptual MCQ.",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Option A",
          "explanation": "A rigorous explanation proving why the answer is correct."
        }}
      ]
    }}
  ]
}}
"""
    
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=prompt,          
        config=types.GenerateContentConfig( 
            response_mime_type="application/json",
            response_schema=QuizGenerationResult, 
            temperature=0.2, 
        )
    )

    parsed_json = json.loads(response.text)
    
    if isinstance(parsed_json, list):
        if len(parsed_json) == 0:
            raise ValueError("Gemini returned an empty list.")
        parsed_json = parsed_json[0]

    return parsed_json


# ==========================================
# 2. THE CHAT ENDPOINT
# ==========================================
async def chat_with_tutor(subject_name: str, topic_title: str, message: str, history: list):
    """Handles the sliding DeepDiveChat sidebar."""
    
    prompt = f"""
    You are an elite Professor. The student is an advanced undergraduate.
    The current subject is '{subject_name}' and the topic is '{topic_title}'.
    Their question is: "{message}"
    
    CRITICAL INSTRUCTION: If the subject is analytical/engineering, explain using 'First Principles Thinking', math, and physics. If the subject is soft/theoretical, explain using frameworks, examples, and logic.
    Keep your answer concise, highly accurate, and fundamentally understandable.
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=prompt,
        config=types.GenerateContentConfig( 
            temperature=0.2 
        )
    )
    
    return {"reply": response.text}