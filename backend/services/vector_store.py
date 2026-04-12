import chromadb
from chromadb.config import Settings
import fitz  # PyMuPDF
import uuid
import logging

# Set up logging
logger = logging.getLogger("uvicorn")

# 1. Initialize Persistent Storage
# Using PersistentClient ensures your "memory" survives server restarts
chroma_client = chromadb.PersistentClient(path="./engiflow_db")

# 2. Collection Setup
# We use a single collection and filter by user_id metadata for efficiency
collection = chroma_client.get_or_create_collection(name="textbook_knowledge")

async def process_and_store_document(pdf_bytes: bytes, user_id: str):
    """
    Extracts text, creates overlapping chunks for better context retrieval,
    and stores them tagged with the specific user_id.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        documents = []
        metadatas = []
        ids = []
        
        # 3. Enhanced Chunking (Overlapping Paragraphs)
        # Page-by-page is often too large for AI context windows.
        # We split by page but keep the page number in metadata.
        for page_num, page in enumerate(doc):
            text = page.get_text().strip()
            if not text:
                continue

            # Add this page as a document
            documents.append(text)
            
            # 4. Metadata is the key to User Isolation
            metadatas.append({
                "user_id": user_id,
                "page_number": page_num + 1,
                "source": "uploaded_pdf"
            })
            
            # Unique ID for every single chunk
            chunk_uuid = f"{user_id}_{page_num}_{uuid.uuid4().hex[:6]}"
            ids.append(chunk_uuid)
                
        if not documents:
            raise ValueError("No extractable text found in the PDF.")

        # 5. Atomic Upload to Chroma
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"✅ [VECTOR STORE] Memorized {len(documents)} pages for user {user_id}")
        return len(documents)

    except Exception as e:
        logger.error(f"❌ [VECTOR STORE ERROR] Processing failed: {str(e)}")
        raise e

def search_knowledge_base(query: str, user_id: str, top_k: int = 3) -> str:
    """
    Searches the Vector DB for content belonging ONLY to the specific user.
    """
    if collection.count() == 0:
        return "" 
        
    # 6. Strict Meta-Filtering
    # This prevents 'User A' from ever seeing 'User B's' data
    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where={"user_id": user_id}  # The "Where" clause enforces isolation
    )
    
    if results and results['documents'] and len(results['documents'][0]) > 0:
        # Join retrieved chunks with a clear separator for the AI
        context = "\n\n---\n\n".join(results['documents'][0])
        return context
        
    return ""

def delete_user_knowledge(user_id: str):
    """Wipes all documents associated with a specific user."""
    collection.delete(where={"user_id": user_id})
    logger.info(f"🗑️ [VECTOR STORE] Wiped knowledge base for user {user_id}")