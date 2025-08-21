function SimpleTest() {
  const handleClick = () => {
    alert('Button clicked successfully! The app is working.');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#dbeafe', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#1e3a8a', 
          marginBottom: '1rem' 
        }}>
          UYP Basketball App
        </h1>
        <p style={{ color: '#1d4ed8', marginBottom: '2rem' }}>
          App is now working properly!
        </p>
        <button 
          onClick={handleClick}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return <SimpleTest />;
}