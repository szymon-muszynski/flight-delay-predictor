import os
from pyspark.sql import SparkSession
import kagglehub
from pyspark.sql.functions import col, when, month, hour
from pyspark.ml.feature import StringIndexer, VectorAssembler
from pyspark.ml import Pipeline
from pyspark.ml.classification import GBTClassifier

spark = SparkSession.builder.appName("FlightDelay_Training").getOrCreate()

print("Pobieranie danych...")
path = kagglehub.dataset_download("williamparker20/flight-ontime-reporting-with-weather")
df = spark.read.option("recursiveFileLookup", "true").csv(path, header=True, inferSchema=True)

cols_needed = ["DepDelayMinutes", "Time", "Origin", "Dest", "Carrier",
               "Temperature", "Wind_Speed", "Precipitation",
               "Wind_Gust", "Ice_Accretion_3hr"]

df_clean = df.select(cols_needed).na.fill(0.0, ["Wind_Gust", "Ice_Accretion_3hr"]).dropna()

df_prepared = df_clean.withColumn("Label", when(col("DepDelayMinutes") > 15, 1.0).otherwise(0.0)) \
                      .withColumn("Month", month(col("Time"))) \
                      .withColumn("Hour", hour(col("Time")))

indexer_origin = StringIndexer(inputCol="Origin", outputCol="OriginIndex", handleInvalid="keep")
indexer_dest = StringIndexer(inputCol="Dest", outputCol="DestIndex", handleInvalid="keep")
indexer_carrier = StringIndexer(inputCol="Carrier", outputCol="CarrierIndex", handleInvalid="keep")

assembler = VectorAssembler(
    inputCols=["OriginIndex", "DestIndex", "CarrierIndex", "Month", "Hour",
               "Temperature", "Wind_Speed", "Wind_Gust", "Precipitation", "Ice_Accretion_3hr"],
    outputCol="features"
)

gbt = GBTClassifier(labelCol="Label", featuresCol="features", maxIter=20, maxDepth=5, maxBins=500)
pipeline = Pipeline(stages=[indexer_origin, indexer_dest, indexer_carrier, assembler, gbt])

print("Trenowanie modelu...")
model = pipeline.fit(df_prepared)

# ZAPIS MODELU
model.write().overwrite().save("/app/model/flight_gbt_model")
print("Model zapisany pomyślnie!")