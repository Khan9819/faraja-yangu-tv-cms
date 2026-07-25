import API from '../services/api.services';
import useAuth from './useAuth';

const useRefreshToken = () => {
    const { setAuth }: any = useAuth();

    const refresh = async () => {
        const apiServices = new API();
        try {
            const response: any = await apiServices.refresh();
            if (response?.data?.access_token) {
                setAuth((prev: any) => ({
                    ...prev,
                    access_token: response.data.access_token,
                }));
                return response.data.access_token;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    return refresh;
};

export default useRefreshToken;