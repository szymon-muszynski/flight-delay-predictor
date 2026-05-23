from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaProducer, KafkaConsumer
import json
import uuid
import os

app = FastAPI()

# DODAJ TO: Pozwól frontendowi na kontakt z API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

producer = KafkaProducer(
    bootstrap_servers='kafka:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

@app.post("/predict")
async def predict(data: dict):
    request_id = str(uuid.uuid4())
    data['request_id'] = request_id
    
    producer.send('predict_requests', data)
    
    # Konsument z timeoutem 
    consumer = KafkaConsumer(
        'predict_responses',
        bootstrap_servers='kafka:9092',
        auto_offset_reset='latest',
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        consumer_timeout_ms=10000 
    )
    
    for msg in consumer:
        if msg.value['request_id'] == request_id:
            return msg.value
            
    return {"error": "Timeout - Spark nie odpowiedział na czas"}

@app.get("/metadata")
async def get_metadata():
    path = "/app/model/metadata.json"
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {"origins": [], "dests": [], "carriers": []}