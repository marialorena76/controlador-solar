import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Cargando...')

  useEffect(() => {
    fetch('http://localhost:5000/')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Error al conectar con el backend'))
  }, [])

  return (
    <div className="p-10 text-xl">
      <h1>{message}</h1>
    </div>
  )
}

export default App
