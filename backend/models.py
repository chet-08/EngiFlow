from pydantic import BaseModel, Field
from typing import List, Optional, Literal

# ==========================================
# 1. SYLLABUS TREE SCHEMA (Roadmap Map)
# ==========================================
class Topic(BaseModel):
    id: str = Field(description="Unique ID, e.g., 'u1_t1'")
    title: str = Field(description="The name of the topic")
    status: Literal["locked", "unlocked", "completed"] = Field(description="Initial state of the topic")
    content_ref: Optional[str] = Field(None, description="Reference to PDF section if applicable")
    prerequisites: List[str] = Field(default_factory=list, description="IDs of topics that must be completed first")

class Unit(BaseModel):
    id: str = Field(description="Unique ID for the unit, e.g., 'u1'")
    title: str = Field(description="Title of the unit")
    topics: List[Topic] = Field(description="List of 6 to 8 core topics for this unit")

class SyllabusSchema(BaseModel):
    subject: str = Field(description="Name of the subject or course")
    units: List[Unit] = Field(description="The full breakdown of the course syllabus")
    

# ==========================================
# 2. AI TUTOR "STUDY NOTE" SCHEMA (Lesson Skeleton)
# ==========================================
class QuizQuestion(BaseModel):
    question: str
    options: List[str] = Field(description="Exactly 4 options")
    correct_answer: str = Field(description="Must exactly match one of the options")
    explanation: str = Field(description="Detailed explanation of the correct logic")
    reference_header: str = Field(description="The Markdown header title where this answer is discussed")
    
class SubTopic(BaseModel):
    id: str = Field(description="Sequential ID, e.g., '1.1'")
    title: str = Field(description="The name of this sub-concept")
    content: str = Field("", description="Leave this empty! Content is handled by the streaming API.")
    quizzes: List[QuizQuestion] = Field(description="Exactly 5 rigorous MCQs for this specific subtopic")

class StudyNote(BaseModel):
    topic: str = Field(description="The overarching topic title")
    week_summary: str = Field(description="A high-level pedagogical overview of the lesson goals")
    key_formula: Optional[str] = Field(None, description="The primary equation in LaTeX ($...$ or $$...$$)")
    real_world_application: str = Field(description="How this engineering concept is applied in industry")
    subtopics: List[SubTopic] = Field(description="Exactly 6 to 8 sequential sub-chunks to ensure depth")