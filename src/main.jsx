import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // 也就是你的 ReaderApp 代码
import './index.css'        // 必须有这一行！

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

