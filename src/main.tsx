import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import { RecoilRoot } from 'recoil'
import { AuthProvider } from './context/authProvider.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RecoilRoot>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </RecoilRoot>
)
