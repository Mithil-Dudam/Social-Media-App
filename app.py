from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Annotated, Optional
from datetime import datetime, timedelta

from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker

from sqlalchemy import Column, Integer, String, ForeignKey, ARRAY

from sqlalchemy.orm import Session,declarative_base

from passlib.context import CryptContext

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random
import shutil

from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

template = """
You are an AI chatbot that can engage in friendly, thoughtful, and helpful conversations with users.

You adapt to the user's tone and intent — whether they want to chat casually, ask for advice, learn something, or just talk.

Your personality is kind, intelligent, and respectful. You respond in a natural, conversational tone, with empathy when appropriate, and always aim to be engaging and clear.

Here is the conversation history so far:
{context}

Here is the user's message:
{user_input}

Your response:
"""

model = OllamaLLM(model='llama3.2')
prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

URL_db = 'postgresql://postgres:password@localhost:5432/Social-Media-App' 

engine = create_engine(URL_db)
sessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base=declarative_base()

class Users(Base):
    __tablename__ = 'Users'
    id = Column(Integer,primary_key=True,index=True)
    email = Column(String,index=True)
    password = Column(String,index=True)
    username = Column(String,index=True)
    bio = Column(String,index=True)
    follows = Column(ARRAY(Integer),default=[])

class Chats(Base):
    __tablename__ = 'Chats'
    id = Column(Integer,primary_key=True,index=True)
    user1 = Column(Integer,ForeignKey("Users.id"),index=True)
    user2 = Column(Integer,ForeignKey("Users.id"),index=True)

class Posts(Base):
    __tablename__ = 'Posts'
    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("Users.id"),index=True)
    post = Column(String,index=True)
    username = Column(String,index=True)
    image_url = Column(String,index=True)

class Texts(Base):
    __tablename__ = 'Texts'
    id = Column(Integer,primary_key=True,index=True)
    chat_id = Column(Integer,ForeignKey("Chats.id"),index=True)
    text = Column(String,index=True)
    sent_by = Column(Integer,ForeignKey("Users.id"),index=True)
    image_url = Column(String,index=True)

class Chatbot(Base):
    __tablename__ = 'Chatbot'
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String,index=True)
    sent_by = Column(String,index=True)

class Login(BaseModel):
    email:str
    password:str

class UserInfo(BaseModel):
    email:str
    password:str
    username:str
    bio:str

class EditInfo(BaseModel):
    email:str
    username:str
    bio:str

class Post(BaseModel):
    text:str
    username:str

class TextSent(BaseModel):
    text:str

Base.metadata.create_all(bind=engine)

def get_db():
    db=sessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency=Annotated[Session,Depends(get_db)]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@app.post("/login",status_code=status.HTTP_200_OK)
async def login(user:Login,db:db_dependency):
    db_user = db.query(Users).filter(Users.email==user.email).first()
    if db_user:
        if pwd_context.verify(user.password,db_user.password):
            return {"message":"Login Success", "user_id":db_user.id,"username":db_user.username}
        raise HTTPException(status_code=404,detail="Invalid Email or Password!")
    else:
        raise HTTPException(status_code=404,detail="Invalid Email or Password!")
    
@app.post("/register",status_code=status.HTTP_201_CREATED)
async def register(user:UserInfo,db:db_dependency):
    db_user = db.query(Users).filter(Users.email==user.email).first()
    if db_user:
        raise HTTPException(status_code=302,detail="Account Already Exists with this Email!")
    db_user_password = pwd_context.hash(user.password)
    db_user = Users(email=user.email,password=db_user_password,username=user.username,bio=user.bio)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message":"User Created Successfully"}

all_otp = {}

@app.post("/code",status_code=status.HTTP_200_OK)
async def code(email:str,db:db_dependency):
    db_user = db.query(Users).filter(Users.email==email).first()
    if not db_user:
        raise HTTPException(status_code=404,detail="Email doesnt exist")
    code = f"{random.randint(0, 999999):06}"
    all_otp[email] = {"code":code,"expires":datetime.now()+timedelta(minutes=2)}
    service = Service(executable_path="chromedriver.exe")
    driver = webdriver.Chrome(service=service)
    driver.get("https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0%2F&emr=1&followup=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0%2F&ifkv=AXH0vVt86mt7i6bhv8EZvXuyaR7kWN4K4-u8q61I6qnUga4y-0zTJljpaLm3qOEfkFS8TLm4BwzwFQ&osid=1&passive=1209600&service=mail&flowName=GlifWebSignIn&flowEntry=ServiceLogin&dsh=S68860218%3A1742620308666354")
    WebDriverWait(driver,10).until(EC.presence_of_element_located((By.ID,"identifierId")))
    input_email = driver.find_element(By.ID,"identifierId")
    input_email.send_keys("emailid"+Keys.ENTER)
    WebDriverWait(driver,30).until(EC.presence_of_element_located((By.NAME,"Passwd")))
    input_password = driver.find_element(By.NAME,"Passwd")
    input_password.send_keys("emailpassword"+Keys.ENTER)
    WebDriverWait(driver,10).until(EC.presence_of_element_located((By.XPATH, "//div[text()='Compose']")))
    compose_button = driver.find_element(By.XPATH, "//div[text()='Compose']")
    compose_button.click()
    WebDriverWait(driver,10).until(EC.element_to_be_clickable((By.CLASS_NAME,"agP")))
    input_to = driver.find_element(By.CLASS_NAME,"agP")
    input_to.send_keys(email)
    input_subject = driver.find_element(By.NAME,"subjectbox")
    input_subject.send_keys("Code for Password Reset")
    input_text = driver.find_element(By.XPATH, "//div[@aria-label='Message Body']")
    input_text.send_keys(code+Keys.CONTROL+Keys.ENTER)
    time.sleep(2)
    driver.quit()
    return {"message":"Code sent"}

@app.post("/verify",status_code=status.HTTP_200_OK)
async def verify(email:str,code:str):
    current_otp = all_otp.get(email)
    if not current_otp:
        raise HTTPException(status_code=404,detail="couldnt get code")
    if datetime.now()>current_otp["expires"]:
        del all_otp[email]
        raise HTTPException(status_code=404,detail="The time has expired")
    if current_otp["code"]==code:
        del all_otp[email]
        return {"message":"Success"}
    raise HTTPException(status_code=400, detail="Invalid code")

@app.post("/new-password",status_code=status.HTTP_200_OK)
async def new_password(user:Login,db:db_dependency):
    db_user = db.query(Users).filter(Users.email==user.email).first()
    db_user_password = pwd_context.hash(user.password)
    db_user.password=db_user_password
    db.commit()
    db.refresh(db_user)
    return {"message":"Password reset successfully"}
    
@app.get("/all-users-broadcast",status_code=status.HTTP_200_OK)
async def all_users_broadcast(id:int,db:db_dependency):
    users = db.query(Users.follows).filter(Users.id == id).first()

    if not users:
        return []
    
    user_list = []
    for i in users[0]:
        try:
            username = db.query(Users.username).filter(Users.id==i).first()
            user_list.append({"username":username[0],"id":i})
        except:
            pass
    return user_list

@app.get("/online-users")
def get_online_users():
    return JSONResponse(content={"online_users": manager.get_all_online()})
    
@app.get("/all-users-chats",status_code=status.HTTP_200_OK)
async def all_users_chats(id:int,db:db_dependency):
    user = db.query(Users).filter(Users.id == id).first()
    chats = db.query(Chats).filter(or_((Chats.user1==id),(Chats.user2==id))).all()

    if not user or user.follows is None:
        return []
    
    follows = set(user.follows)
    chat_set = set()
    for chat in chats:
        if chat.user1 != id:
            chat_set.add(chat.user1)
        if chat.user2 != id:
            chat_set.add(chat.user2)
    user_list = []
    follows.update(chat_set)
    for i in follows:
        try:
            username = db.query(Users.username).filter(Users.id==i).first()
            user_list.append({"username":username[0],"id":i})
        except:
            pass
    return user_list

app.mount("/pics", StaticFiles(directory="pics"), name="pics")

@app.post("/post",status_code=status.HTTP_201_CREATED)
async def post(user_id:int,db:db_dependency, text:Optional[str] = Form(None),username: Optional[str] = Form(None), image:Optional[UploadFile] = File(None)):
    if image:
        file_location = f"pics/{image.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        post = Posts(user_id=user_id,image_url=file_location,username=username)
        db.add(post)
        db.commit()
        db.refresh(post)
        return {"image_url":file_location}
    if text and username:
        post = Posts(user_id=user_id,post=text,username=username)
        db.add(post)
        db.commit()
        db.refresh(post)

@app.post("/text",status_code=status.HTTP_201_CREATED)
async def text(db:db_dependency,chat_id: Optional[int] = Form(None),sent_by:Optional[int] = Form(None),    text:Optional[str] = Form(None), image:Optional[UploadFile] = File(None)):
    if image:
        file_location = f"pics/{image.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        texts = Texts(chat_id=chat_id,sent_by=sent_by,image_url=file_location)
        db.add(texts)
        db.commit()
        db.refresh(texts)
        return {"image_url": file_location}
    if text:
        texts = Texts(chat_id=chat_id,text=text,sent_by=sent_by)
        db.add(texts)
        db.commit()
        db.refresh(texts)

@app.get("/all-posts",status_code=status.HTTP_200_OK)
async def all_posts(db:db_dependency):
    posts = db.query(Posts).order_by(Posts.id.asc()).all()
    return [{"user_id":post.user_id,"post":post.post,"username":post.username,"image_url":post.image_url} for post in posts]
    
@app.post("/follow",status_code=status.HTTP_202_ACCEPTED)
async def follow(id:int,user_id:int,db:db_dependency):
    user = db.query(Users).filter(Users.id==id).first()
    if user.follows is None:
        user.follows=[]
    if user_id not in user.follows:
        user.follows = user.follows + [user_id]
    db.commit()
    db.refresh(user)
    return {"all_followed":user.follows}

@app.post("/unfollow",status_code=status.HTTP_200_OK)
async def unfollow(id:int,user_id:int,db:db_dependency):
    user = db.query(Users).filter(Users.id==id).first()
    user.follows = [u for u in user.follows if u != user_id]
    if user.follows is None:
        user.follows=[]
    db.commit()
    db.refresh(user)
    return {"all_followed":user.follows}

@app.post("/chat",status_code=status.HTTP_200_OK)
async def chat(id:int,user_id:int,db:db_dependency):
    chat = db.query(Chats).filter(or_((Chats.user1==id)&(Chats.user2==user_id),(Chats.user1==user_id)&(Chats.user2==id))).first()
    if chat:
        return {"chat_id":chat.id}
    else:
        chat = Chats(user1=id,user2=user_id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        return {"chat_id":chat.id}

@app.get("/all-texts",status_code=status.HTTP_200_OK)
async def all_texts(chat_id:int,db:db_dependency):
    texts = db.query(Texts).filter(Texts.chat_id==chat_id).order_by(Texts.id.asc()).all()
    return [{"sent_by":text.sent_by,"text":text.text, "image_url":text.image_url} for text in texts]

@app.get("/profile",status_code=status.HTTP_200_OK)
async def profile(id:int,db:db_dependency):
    user = db.query(Users).filter(Users.id==id).first()
    follows_count = len(user.follows or [])
    total_posts = db.query(Posts).filter(Posts.user_id==id).count()
    return {"username":user.username,"bio":user.bio,"email":user.email,"total_posts":total_posts,"follows_count":follows_count}

@app.post("/edit",status_code=status.HTTP_202_ACCEPTED)
async def edit(id:int,editInfo:EditInfo,db:db_dependency):
    user = db.query(Users).filter(Users.id==id).first()
    user.email=editInfo.email
    user.username=editInfo.username
    user.bio=editInfo.bio
    posts = db.query(Posts).filter(Posts.user_id==id).all()
    for post in posts:
        post.username=editInfo.username
    db.commit()
    db.refresh(user)
    return {"message":"Profile Edited Successfully"}

@app.delete("/delete-chatbot-chats",status_code=status.HTTP_200_OK)
async def delete_chatbot_chats(db:db_dependency):
    db.query(Chatbot).delete()
    db.commit()
    return {"message":"Chats Deleted"}

@app.get("/chatbot-texts",status_code=status.HTTP_200_OK)
async def chatbot_texts(db:db_dependency):
    chatbot_chats = db.query(Chatbot).order_by(Chatbot.id.asc()).all()
    return [{"text":chatbot_chat.text,"sent_by":chatbot_chat.sent_by} for chatbot_chat in chatbot_chats]

@app.post("/to-chatbot",status_code=status.HTTP_200_OK)
async def to_chatbot(db:db_dependency,text:str=Form(...)):
    db_text = Chatbot(text=text,sent_by="user")
    db.add(db_text)
    db.commit()
    db.refresh(db_text)

    chatbot_chats = db.query(Chatbot).order_by(Chatbot.id.asc()).all()
    context=""
    for chat in chatbot_chats:
        if chat.sent_by=="user":
            sender = "User"
        else:
            sender = "AI"
        context += f"\n{sender}: {chat.text}"

    result = chain.invoke({"context":context,"user_input":text})
    db_reply = Chatbot(text=result,sent_by="AI")
    db.add(db_reply)
    db.commit()
    db.refresh(db_reply)
    return {"reply":result}

class ConnectionManager():
    def __init__(self):
        self.chat_connections: dict[int,list[WebSocket]] = {}
        self.broadcast_connections: list[WebSocket] = []
        self.online_users: set[int] = set()

    async def connect_chat(self,websocket:WebSocket,chat_id:int):
        await websocket.accept()
        if chat_id not in self.chat_connections:
            self.chat_connections[chat_id] = []
        self.chat_connections[chat_id].append(websocket)

    async def connect_broadcast(self, websocket:WebSocket):
        await websocket.accept()
        self.broadcast_connections.append(websocket)

    async def connect_user(self,websocket:WebSocket,user_id:int):
        await websocket.accept()
        self.online_users.add(user_id)

    def disconnect_chat(self,websocket:WebSocket,chat_id:int):
        if chat_id in self.chat_connections:
            self.chat_connections[chat_id].remove(websocket)
            if not self.chat_connections[chat_id]:
                del self.chat_connections[chat_id]

    def disconnect_broadcast(self,websocket:WebSocket):
        self.broadcast_connections.remove(websocket)

    def disconnect_user(self,websocket:WebSocket,user_id:int):
        self.online_users.discard(user_id)

    async def send_to_chat(self,chat_id:int,message:str):
        if chat_id in self.chat_connections:
            for connection in self.chat_connections[chat_id]:
                await connection.send_text(message)
        
    async def broadcast(self,message:str):
        for connection in self.broadcast_connections:
            await connection.send_text(message)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.online_users

    def get_all_online(self) -> list[int]:
        return list(self.online_users)

manager = ConnectionManager()

@app.websocket("/ws/chat/{chat_id}")
async def websocket_chat(websocket:WebSocket,chat_id:int):
    await manager.connect_chat(websocket,chat_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_to_chat(chat_id,data)
    except WebSocketDisconnect:
        manager.disconnect_chat(websocket,chat_id)

@app.websocket("/ws")
async def websocket_broadcast(websocket:WebSocket):
    await manager.connect_broadcast(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect_broadcast(websocket)

@app.websocket("/ws/user/{user_id}")
async def websocket_user_status(websocket:WebSocket, user_id:int):
    await manager.connect_user(websocket,user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_user(websocket,user_id)