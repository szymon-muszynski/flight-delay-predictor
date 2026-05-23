import json
from pyspark.sql import SparkSession, Row
from pyspark.ml import PipelineModel
from kafka import KafkaConsumer, KafkaProducer
import os
spark = SparkSession.builder.appName("SparkPredictionService").getOrCreate()

# Czekaj na model
import time
while not os.path.exists("/app/model/flight_gbt_model"):
    print("Oczekiwanie na model...")
    time.sleep(10)

model = PipelineModel.load("/app/model/flight_gbt_model")

metadata = {
    "origins": sorted(model.stages[0].labels),
    "dests": sorted(model.stages[1].labels),
    "carriers": sorted(model.stages[2].labels)
}

with open("/app/model/metadata.json", "w") as f:
    json.dump(metadata, f)
print("Metadata (lotniska i linie) zapisane!")

producer = KafkaProducer(bootstrap_servers='kafka:9092', value_serializer=lambda v: json.dumps(v).encode('utf-8'))
consumer = KafkaConsumer('predict_requests', bootstrap_servers='kafka:9092', value_deserializer=lambda v: json.loads(v.decode('utf-8')))

print("Serwis predykcji Spark gotowy...")

for message in consumer:
    data = message.value
    request_id = data['request_id']
    
    # Tworzenie DataFrame z jednego wiersza
    row = Row(Carrier=data['Carrier'], Origin=data['Origin'], Dest=data['Dest'],
              Month=int(data['Month']), Hour=int(data['Hour']), Temperature=float(data['Temperature']),
              Wind_Speed=float(data['Wind_Speed']), Wind_Gust=float(data['Wind_Gust']),
              Precipitation=float(data['Precipitation']), Ice_Accretion_3hr=float(data['Ice_Accretion_3hr']))
    
    df_input = spark.createDataFrame([row])
    prediction = model.transform(df_input)
    
    prob = prediction.select("probability").collect()[0][0][1]
    result = {"request_id": request_id, "probability": prob, "risk": "High" if prob > 0.5 else "Low"}
    
    producer.send('predict_responses', result)