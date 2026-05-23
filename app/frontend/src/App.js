import React, { useState, useEffect } from 'react';

function App() {
  // Stan dla wszystkich danych wejściowych modelu
  const [formData, setFormData] = useState({
    Carrier: '',
    Origin: '',
    Dest: '',
    Month: 1,
    Hour: 12,
    Temperature: 70,
    Wind_Speed: 10,
    Wind_Gust: 0,
    Precipitation: 0.0,
    Ice_Accretion_3hr: 0.0
  });
  
  const [metadata, setMetadata] = useState({ origins: [], dests: [], carriers: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pobierz listy rozwijane z API po załadowaniu strony
  useEffect(() => {
    fetch('http://localhost:8000/metadata')
      .then(res => res.json())
      .then(data => {
        if (data.origins && data.origins.length > 0) {
          setMetadata(data);
          // Ustawienie domyślnych wartości na pierwsze z listy
          setFormData(prev => ({
            ...prev,
            Origin: data.origins[0],
            Dest: data.dests[0],
            Carrier: data.carriers[0]
          }));
        }
      })
      .catch(err => console.error("Błąd pobierania metadanych:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      alert("Błąd połączenia z serwerem Spark.");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#1a73e8' }}>Predykcja Opóźnień Lotów</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
          
          {/* SEKCJA 1: TRASA I LINIA */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 10px 0' }}>Informacje o locie</h4>
            <label>Linia lotnicza:
              <select name="Carrier" value={formData.Carrier} onChange={handleChange} style={inputStyle}>
                {metadata.carriers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <label style={{ flex: 1 }}>Z lotniska (Origin):
                <select name="Origin" value={formData.Origin} onChange={handleChange} style={inputStyle}>
                  {metadata.origins.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label style={{ flex: 1 }}>Do lotniska (Dest):
                <select name="Dest" value={formData.Dest} onChange={handleChange} style={inputStyle}>
                  {metadata.dests.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* SEKCJA 2: CZAS I POGODA */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 10px 0' }}>Czas i Warunki Atmosferyczne</h4>
            <div style={gridStyle}>
              <label>Miesiąc (1-12): <input type="number" name="Month" value={formData.Month} onChange={handleChange} style={inputStyle} /></label>
              <label>Godzina (0-23): <input type="number" name="Hour" value={formData.Hour} onChange={handleChange} style={inputStyle} /></label>
              <label>Temp (°F): <input type="number" name="Temperature" value={formData.Temperature} onChange={handleChange} style={inputStyle} /></label>
              <label>Wiatr (mph): <input type="number" name="Wind_Speed" value={formData.Wind_Speed} onChange={handleChange} style={inputStyle} /></label>
              <label>Porywy (mph): <input type="number" name="Wind_Gust" value={formData.Wind_Gust} onChange={handleChange} style={inputStyle} /></label>
              <label>Opady (in): <input type="number" step="0.01" name="Precipitation" value={formData.Precipitation} onChange={handleChange} style={inputStyle} /></label>
              <label>Oblodzenie (in): <input type="number" step="0.01" name="Ice_Accretion_3hr" value={formData.Ice_Accretion_3hr} onChange={handleChange} style={inputStyle} /></label>
            </div>
          </div>

          <button type="submit" disabled={loading} style={loading ? disabledButtonStyle : buttonStyle}>
            {loading ? 'Przetwarzanie w klastrze Spark...' : 'Analizuj ryzyko opóźnienia'}
          </button>
        </form>

        {/* WYNIK */}
        {result && (
          <div style={{ ...resultContainer, backgroundColor: result.risk === 'High' ? '#fdecea' : '#edf7ed' }}>
            <h3 style={{ margin: '0 0 5px 0' }}>Ryzyko: {result.risk === 'High' ? 'WYSOKIE ⚠️' : 'NISKIE ✅'}</h3>
            <p>Prawdopodobieństwo opóźnienia: <strong>{(result.probability * 100).toFixed(2)}%</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}

// STYLE CSS-in-JS
const sectionStyle = { border: '1px solid #e0e0e0', padding: '15px', borderRadius: '8px' };
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
const inputStyle = { width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const buttonStyle = { padding: '15px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' };
const disabledButtonStyle = { ...buttonStyle, background: '#ccc', cursor: 'not-allowed' };
const resultContainer = { marginTop: '20px', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #ddd' };

export default App;