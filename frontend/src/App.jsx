import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Cargando...')
  const BASE_URL = import.meta.env.VITE_API_URL

  useEffect(() => {
    fetch(`${BASE_URL}/`)
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

