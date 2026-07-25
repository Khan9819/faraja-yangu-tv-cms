import { useRecoilValue } from 'recoil'
import './index.css'
import './App.css'
import { theme as themeAtom } from './context/global.states'
import { Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { SplashScreen } from './utils/splashscreen'
import { ThemeProvider, createTheme } from '@mui/material'
import { AuthLayout } from './layouts/auth.layout'
import { ProtectedLayout } from './layouts/protected.layout'
import useApiServices from './hooks/useAPI'
import type API from './services/api.services'
import useAuth from './hooks/useAuth'

import { auth_routes, flat_protected_routes } from './utils/navigation'
import type { AppRoute } from './interfaces/route'

function App() {

  const api: API = useApiServices();
  const auth: any = useAuth();

  const [isProcessed, setIsProcessed] = useState(true)
  const [queryClient] = useState(() => new QueryClient())
  const theme = useRecoilValue<string>(themeAtom)

  const sync = async () => {
    setIsProcessed(true);
    const stored = sessionStorage.getItem('auth');
    if (stored) {
      auth.setAuth(JSON.parse(stored));
      setIsProcessed(false);
      return;
    }
    const response = await api.refresh().catch((error: any) => {
      console.log(error)
      return error;
    });

    console.log(response)

    if (response?.success === true) {
      auth.setAuth(response?.data);
    } else {
      auth.setAuth(null);
    }
    setIsProcessed(false);
  }

  const muiTheme = useMemo(() =>
    createTheme({
      palette: {
        "mode": theme == "dark" ? "dark" : "light",
      },
    }),
    [theme],
  );

  useEffect(() => {
    sync();
  }, []);

  return (
    <div className={`App ${theme == "dark" ? "dark" : "light"}`}>
      {
        isProcessed === true ? (
          <SplashScreen />
        ) : (
          <QueryClientProvider client={queryClient}>

            <ThemeProvider theme={muiTheme}>

              <Suspense fallback={<SplashScreen />}>
                <Routes>
                  {
                    (auth?.auth) ? (
                      <Route element={<ProtectedLayout />}>
                        {
                          flat_protected_routes.map((route: AppRoute, index) => {
                            console.log(route.path)
                            const Component = route.element;
                            return <Route key={index} path={route.path} element={<Component route={route}/>} />
                          })
                        }
                      </Route>
                    ) : (
                      <Route path="/" element={<AuthLayout />}>
                        {
                          auth_routes.map((route, index) => {
                            const Component = route.element;
                            return <Route key={index} path={route.path} element={<Component />} />
                          })
                        }
                      </Route>
                    )
                  }
                </Routes>
              </Suspense>

            </ThemeProvider>

          </QueryClientProvider>
        )
      }
    </div>
  )
}

export default App
