# Real-Time Flight Delay Prediction System

Kompleksowy projekt klasy Big Data przewidujący ryzyko opóźnienia startu samolotów w oparciu o historyczne dane lotnicze oraz warunki meteorologiczne. Zbiór danych ([Flight Ontime Reporting with Weather](https://www.kaggle.com/datasets/williamparker20/flight-ontime-reporting-with-weather)) obejmuje ponad 14 milionów rekordów.

Projekt obrazuje pełen cykl życia modelu uczenia maszynowego: od analityki i fazy badawczej (Jupyter Notebooks), aż po wdrożenie wybranego algorytmu do lokalnego, kontenerowego środowiska strumieniowego (Proof of Concept) opartego na Apache Spark i Apache Kafka.

---

## 📊 Faza Badawcza (Eksperymenty i Uczenie Maszynowe)

W folderze `/notebooks` znajduje się zapis ścieżki badawczej, w której krok po kroku optymalizowano podejście do problemu. Pełny opis metodologii i szczegółowe wykresy znajdują się w dokumencie `docs/sprawozdanie_finalne.pdf`.

Rozwój modelu podzielono na 4 iteracje:
1. **Model Bazowy (Random Forest):** Analiza wpływu samej pogody i czasu. Wyniki wskazały, że pogoda to za mało do skutecznej predykcji.
2. **Dodanie Danych Operacyjnych:** Włączenie do modelu linii lotniczej (Carrier). Znacząca poprawa jakości detekcji.
3. **Gradient Boosted Trees (GBT) [WYBRANY MODEL]:** Zmiana algorytmu na GBT i uwzględnienie lotnisk docelowych. Skuteczność (AUC) przekroczyła 0.70. 
4. **Ważenie Klas (Class Weighting):** Ze względu na niezbalansowanie zbioru (ok. 21% lotów opóźnionych) wprowadzono wagi dla klas, minimalizując ryzyko "przeoczenia" opóźnień.

### 💡 Kluczowe wnioski z analizy
* **Czas (Miesiąc/Godzina) ma kluczowe znaczenie:** Największe ryzyko generuje tzw. "efekt kuli śnieżnej", kumulujący opóźnienia w godzinach wieczornych.
* **Czynnik Operacyjny > Umiarkowana Pogoda:** Wybór przewoźnika i trasy wpływa na opóźnienie w znacznie większym stopniu niż zwykły deszcz czy wiatr.
* **Zjawiska Ekstremalne:** Dopiero bardzo silne zjawiska, jak porywy wiatru (Wind Gust) czy oblodzenie (Ice Accretion), stanowią drastyczny sygnał opóźnienia.

---

## 🏗 Architektura Systemu (Aplikacja Lokalna)

Po opracowaniu optymalnego modelu (Iteracja 4 - GBT), został on wdrożony do architektury symulującej przetwarzanie w czasie zbliżonym do rzeczywistego. Kod aplikacji znajduje się w folderze `/app`.

System składa się z następujących komponentów (uruchamianych w Dockerze):
* **Warstwa Prezentacji (React):** Interfejs pobierający metadane (listy lotnisk/linii) bezpośrednio z modelu.
* **Warstwa API (FastAPI):** Pośrednik przyjmujący żądania od użytkownika i przekazujący je do brokera wiadomości.
* **Szyna Danych (Apache Kafka + Zookeeper):** Asynchroniczna komunikacja separująca API od klastra obliczeniowego (topiki: `predict_requests`, `predict_responses`).
* **Apache Spark MLlib:**
  * `Trainer`: Moduł automatyzujący inżynierię cech (StringIndexer, VectorAssembler) i trening modelu GBT.
  * `Spark-ML Service`: Konsument wykonujący predykcje i zwracający wyniki do API.

*Uwaga: W prezentowanym rozwiązaniu PoC endpoint API blokuje zapytanie do czasu otrzymania odpowiedzi z Kafki w celu ułatwienia prezentacji.*

---

## 🚀 Uruchomienie Środowiska (Docker Compose)

Wymagania: Zainstalowany Docker oraz Docker Compose.

1. Sklonuj repozytorium: `git clone https://github.com/szymon-muszynski/flight-delay-predictor`
2. Przejdź do tego folderu: `cd flight-delay-predictor/app`
3. Uruchom architekturę w tle:
   `docker-compose up --build -d`
4. Poczekaj na pełne uruchomienie usług (szczególnie Klastra Spark i Kafki).
5. Przejdź do przeglądarki:
   * Frontend: http://localhost:3000
   * API (Swagger UI): http://localhost:8000/docs

Jeśli uruchamiasz system po raz pierwszy (tryb treningowy z modułem trainer), skrypt train.py może wymagać konfiguracji Kaggle API do pobrania pełnego zbioru z KaggleHub. Repo zawiera jednak wstępnie wygenerowane metadane.
