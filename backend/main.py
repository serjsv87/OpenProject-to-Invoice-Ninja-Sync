import os
import re
from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from dotenv import load_dotenv
from clients.openproject import OpenProjectClient
from clients.invoiceninja import InvoiceNinjaClient
from auth import create_access_token, get_current_user, verify_password, get_password_hash, decode_token, SECRET_KEY
from websocket_manager import manager
from google import genai
from google.genai import types
import json

from typing import List, Optional, Dict
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="OpenProject to Invoice Ninja Sync")

@app.on_event("startup")
async def startup_event():
    if SECRET_KEY == "supersecret":
        print("WARNING: JWT_SECRET is using default value! Change it in .env for production.")

# Request Models
class SearchRequest(BaseModel):
    project_ids: List[int]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    user_id: Optional[int] = None

class LineItem(BaseModel):
    wp_id: Optional[int] = 0
    product_key: Optional[str] = ""
    notes: str
    quantity: float
    cost: float

class GenerateRequest(BaseModel):
    client_id: str
    line_items: List[LineItem]
    issue_date: str
    due_date: str
    ws_client_id: str
    footer: Optional[str] = ""
    ai_description: Optional[bool] = False
    ai_improve_title: Optional[bool] = False
    ai_model: Optional[str] = "gemini-3.1-flash-lite-preview"

# Setup hardcoded user from ENV
APP_USER = os.getenv("APP_LOGIN", "admin")
APP_PASS_PLAIN = os.getenv("APP_PASSWORD", "password")
# Hash it once at startup for comparison
APP_PASS_HASH = get_password_hash(APP_PASS_PLAIN)

# Initialize Clients
op_client = OpenProjectClient(
    os.getenv("OP_API_URL"), 
    os.getenv("OP_API_TOKEN")
)
in_client = InvoiceNinjaClient(
    os.getenv("IN_API_URL"), 
    os.getenv("IN_API_TOKEN")
)

# Initialize Gemini
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
gen_client = None
if GEMINI_KEY:
    gen_client = genai.Client(api_key=GEMINI_KEY)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "https://billing.uw-t.com").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Endpoint
@app.post("/api/v1/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != APP_USER or not verify_password(form_data.password, APP_PASS_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Protected API Endpoints
@app.get("/api/v1/projects")
async def get_projects(current_user: str = Depends(get_current_user)):
    try:
        return op_client.get_projects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/users")
async def get_users(current_user: str = Depends(get_current_user)):
    try:
        return op_client.get_users()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/in/clients")
async def get_in_clients(current_user: str = Depends(get_current_user)):
    try:
        return in_client.get_clients()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/op/search")
async def search_entries(req: SearchRequest, current_user: str = Depends(get_current_user)):
    try:
        entries = op_client.get_time_entries(
            project_ids=req.project_ids,
            start_date=req.start_date,
            end_date=req.end_date,
            user_id=req.user_id
        )
        
        # Grouping and enrichment logic
        wp_cache = {0: "General / Project Level"}
        grouped = {}
        
        for entry in entries:
            wp_link = entry["_links"].get("workPackage", {}).get("href")
            
            if wp_link:
                wp_id = int(wp_link.split("/")[-1])
                if wp_id not in wp_cache:
                    try:
                        wp_data = op_client.get_work_package(wp_id)
                        wp_cache[wp_id] = wp_data.get("subject", f"Task #{wp_id}")
                    except Exception:
                        wp_cache[wp_id] = f"Task #{wp_id} (Private?)"
            else:
                wp_id = 0 # Project level
            
            wp_title = wp_cache[wp_id]
            
            # Parse hours
            hours_raw = entry.get("hours", 0)
            if isinstance(hours_raw, str) and hours_raw.startswith("PT"):
                hours = 0.0
                h_match = re.search(r'(\d+(?:\.\d+)?)H', hours_raw)
                if h_match: hours += float(h_match.group(1))
                m_match = re.search(r'(\d+(?:\.\d+)?)M', hours_raw)
                if m_match: hours += float(m_match.group(1)) / 60.0
                s_match = re.search(r'(\d+(?:\.\d+)?)S', hours_raw)
                if s_match: hours += float(s_match.group(1)) / 3600.0
            else:
                try:
                    hours = float(hours_raw)
                except (ValueError, TypeError):
                    hours = 0.0
            
            if wp_id not in grouped:
                grouped[wp_id] = {"id": wp_id, "title": wp_title, "hours": 0.0, "details": []}
            
            grouped[wp_id]["hours"] += hours
            grouped[wp_id]["details"].append({
                "date": entry.get("spentOn"),
                "comment": entry.get("comment", {}).get("raw", ""),
                "hours": hours
            })
            
        return {"data": grouped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/in/generate")
async def generate_invoice(req: GenerateRequest, current_user: str = Depends(get_current_user)):
    try:
        # Progress Start
        await manager.send_personal_message(
            {"status": "processing", "message": "Preparing invoice data...", "progress": 20},
            req.ws_client_id
        )
        
        litems = []
        total_items = len(req.line_items)
        
        for i, item in enumerate(req.line_items):
            current_progress = 20 + (60 * i / total_items)
            
            p_key = item.product_key
            notes = item.notes
            
            # AI Enrichment
            if GEMINI_KEY and item.wp_id and item.wp_id > 0 and (req.ai_description or req.ai_improve_title):
                await manager.send_personal_message(
                    {"status": "processing", "message": f"AI analyzing Task #{item.wp_id}...", "progress": current_progress},
                    req.ws_client_id
                )
                
                try:
                    # Fetch extra context
                    wp_data = op_client.get_work_package(item.wp_id)
                    activities = op_client.get_work_package_activities(item.wp_id)
                    
                    # Metadata for AI
                    status_name = wp_data.get("_links", {}).get("status", {}).get("title", "Unknown")
                    priority_name = wp_data.get("_links", {}).get("priority", {}).get("title", "Normal")
                    type_name = wp_data.get("_links", {}).get("type", {}).get("title", "Task")
                    
                    # Last 15 comments with authors
                    comments = []
                    for act in activities[-15:]:
                        comment_text = act.get("comment", {}).get("raw")
                        if comment_text:
                            author = act.get("_links", {}).get("author", {}).get("title", "System")
                            comments.append(f"[{author}]: {comment_text}")
                    
                    prompt = f"""
                    ROLE: Senior Billing & Project Specialist.
                    TASK: Create professional invoice entries for a high-end agency.
                    
                    TASK CONTEXT:
                    - ID: #{item.wp_id}
                    - Subject: {wp_data.get('subject')}
                    - Type: {type_name} | Status: {status_name} | Priority: {priority_name}
                    - Project Body: {wp_data.get('description', {}).get('raw', 'N/A')}
                    - Activity Log: {json.dumps(comments, indent=2)}
                    
                    GOAL:
                    1. improved_title: A concise, executive-level title for the service (e.g., "Architecture Design & Consultation" instead of "draw house"). DO NOT include the task ID in this field.
                    2. professional_description: A 1-3 sentence narrative describing the VALUE delivered. 
                       - DO NOT repeat the title. 
                       - Use the activity log to find SPECIFIC accomplishments (e.g., "Resolved critical navigation bugs..." or "Finalized API integration for...").
                       - If the task is ongoing, frame it as "Progress on..." or "Continued development of...".
                       - If data is scarce, use your expertise to expand the title into a professional service description.
                    
                    OUTPUT: Return ONLY a raw JSON object.
                    {{
                        "improved_title": "string",
                        "professional_description": "string"
                    }}
                    """
                    
                    # Log for debugging
                    selected_model = req.ai_model or "gemini-3.1-flash-lite-preview"
                    print(f"ENRICHING Task #{item.wp_id}: Model={selected_model}, Title={req.ai_improve_title}, Desc={req.ai_description}")

                    if not gen_client:
                         raise ValueError("Gemini API Client not initialized. Check your GEMINI_API_KEY.")

                    # Configure thinking budget based on model
                    thinking_config = None
                    if selected_model == "gemini-3.1-flash-lite-preview":
                        thinking_config = types.ThinkingConfig(thinking_level="MINIMAL")
                    elif selected_model == "gemini-flash-latest":
                        thinking_config = types.ThinkingConfig(thinking_budget=-1)
                    elif selected_model == "gemini-flash-lite-latest":
                        thinking_config = types.ThinkingConfig(thinking_budget=0)

                    generate_content_config = types.GenerateContentConfig(
                        thinking_config=thinking_config
                    )

                    response = gen_client.models.generate_content(
                        model=selected_model,
                        contents=prompt,
                        config=generate_content_config
                    )
                    
                    # Robust JSON extraction via regex
                    json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                    if not json_match:
                         raise ValueError(f"AI Response did not contain JSON: {response.text}")
                    
                    raw_text = json_match.group(0)
                    print(f"DEBUG: AI Response for #{item.wp_id}: {raw_text}")
                    ai_data = json.loads(raw_text)
                    
                    if req.ai_improve_title:
                        p_key = f"#{item.wp_id}: {ai_data.get('improved_title', wp_data.get('subject'))}"
                    
                    if req.ai_description:
                        # Ensure we don't fall back to title if AI returned a valid object
                        ai_desc = ai_data.get('professional_description')
                        if ai_desc:
                            notes = ai_desc
                        
                except Exception as ai_err:
                    print(f"AI ERROR for task #{item.wp_id}: {str(ai_err)}")
                    # Fallback to standard ID prefix if AI fails
                    if not p_key.startswith('#'):
                         p_key = f"#{item.wp_id}: {wp_data.get('subject')}"

            litems.append({
                "product_key": p_key,
                "notes": notes,
                "quantity": item.quantity,
                "cost": item.cost
            })
            
            await manager.send_personal_message(
                {"status": "processing", "message": f"Prepared item {i+1} of {total_items}...", "progress": 20 + (60 * (i+1) / total_items)},
                req.ws_client_id
            )

        invoice = in_client.create_invoice(
            client_id=req.client_id,
            line_items=litems,
            issue_date=req.issue_date,
            due_date=req.due_date,
            footer=req.footer
        )
        
        # Final status - use hashed_id for the UI link
        await manager.send_personal_message(
            {
                "status": "completed", 
                "message": "Invoice created successfully!", 
                "progress": 100, 
                "invoice_id": invoice.get("hashed_id") or invoice.get("id")
            },
            req.ws_client_id
        )
        
        return invoice
    except Exception as e:
        print(f"GENERATE ERROR: {str(e)}")
        await manager.send_personal_message(
            {"status": "error", "message": str(e)},
            req.ws_client_id
        )
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket Endpoint
@app.websocket("/api/v1/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, token: Optional[str] = None):
    # Security: Verify JWT token passed as query param
    if not token or not decode_token(token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(client_id, websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)

@app.get("/")
async def root():
    return {"message": "Invoice Generator API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}
