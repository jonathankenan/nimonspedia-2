import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import Chat from './chat/pages/Chat.jsx'
import './index.css'

// Entry point untuk standalone chat (embedded di PHP)
const rootElement = document.getElementById('chat-root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter basename="/">
        <Chat />
      </BrowserRouter>
    </StrictMode>,
  )
}
