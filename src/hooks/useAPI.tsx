import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useRefreshToken from "./useRefresh";
import useAuth from "./useAuth";
import API from "../services/api.services";
import { useSetRecoilState } from "recoil";
import { systemGlobalLoadingIndicator, systemGlobalToastMessage } from "../context/global.states";

const useApiServices = () => {
    const navigate = useNavigate();
    const refresh = useRefreshToken();
    const { auth, setAuth }: any = useAuth();
    const setGlobalLoadingIndicator = useSetRecoilState(systemGlobalLoadingIndicator);
    const setGlobalToastMessage = useSetRecoilState(systemGlobalToastMessage);

    // Create a fresh API instance per hook invocation to avoid singleton race conditions
    const apiServices = useMemo(() => new API(), []);

    useEffect(() => {
        const requestIntercept = apiServices.axiosInstance.interceptors.request.use(
            (config: any) => {
                if (auth?.access_token) {
                    config.headers['Authorization'] = `Bearer ${auth.access_token}`;
                }
                setGlobalLoadingIndicator(true);
                return config;
            },
            (error: any) => {
                setGlobalLoadingIndicator(false);
                setGlobalToastMessage({
                    success: false,
                    message: error?.message
                });
                return Promise.reject(error);
            }
        );

        const responseIntercept = apiServices.axiosInstance.interceptors.response.use(
            (response: any) => {
                setGlobalLoadingIndicator(false);
                const method = response?.config?.method?.toUpperCase();
                if (method && method !== 'GET') {
                    setGlobalToastMessage({
                        success: response?.data?.success ?? false,
                        message: response?.data?.message || "Done"
                    });
                }
                return response;
            },
            async (error: any) => {
                const previous = error?.config;
                if ((error?.response?.status === 403 || error?.response?.status === 401) && !previous?.sent) {
                    previous.sent = true;
                    const newAccessToken = await refresh();

                    if (!newAccessToken) {
                        setAuth(null);
                        setGlobalLoadingIndicator(false);
                        navigate('/login');
                        return Promise.reject(error);
                    }

                    previous.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return apiServices.axiosInstance(previous);
                }

                if (error?.name === "CanceledError") {
                    setGlobalToastMessage({
                        success: false,
                        message: "Switching routes...."
                    });
                    return Promise.reject(error);
                }

                setGlobalLoadingIndicator(false);
                setGlobalToastMessage({
                    success: false,
                    message: error?.response?.data?.message || error?.message || 'Request failed'
                });
                return Promise.reject(error);
            }
        );

        return () => {
            apiServices.axiosInstance.interceptors.request.eject(requestIntercept);
            apiServices.axiosInstance.interceptors.response.eject(responseIntercept);
        };
    }, [auth, refresh, apiServices, setAuth, navigate, setGlobalLoadingIndicator, setGlobalToastMessage]);

    return apiServices;
};

export default useApiServices;