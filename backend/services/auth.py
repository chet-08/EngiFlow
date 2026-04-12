import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Security, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Initialize Firebase using the JSON file
try:
    cred = credentials.Certificate("firebase-credentials.json")
    firebase_admin.initialize_app(cred)
except ValueError:
    pass

security = HTTPBearer()

# RENAME THIS TO MATCH YOUR ROUTERS
async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """
    Verifies the Firebase token sent by the frontend.
    Returns the user's unique UID.
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )