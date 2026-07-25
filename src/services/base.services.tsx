import axios from "axios";

export default class BaseService {

    debug = process.env.NODE_ENV === 'development';
    dateOptions: any = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
    }
    dateFormat: any = 'YYYY-MM-DD HH:mm:ss'
    host = this.debug ? "" : "https://backend.farajayangutv.co.tz";
    socketHost: any = this.debug ? "" : "wss://backend.farajayangutv.co.tz";
    controller: AbortController;
    axiosInstance = axios.create({
        baseURL: this.host,
        withCredentials: true,
    });
    axios = axios;
    cancelToken: any;

    headers: any = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }



    constructor(controller?: AbortController | null | undefined) {

        this.controller = controller ?? new AbortController();
        axios.defaults.withCredentials = true;
        this.axiosInstance.defaults.withCredentials = true;
    }

    // /////////////////////////////////////////////////////////////////////////////////////////////////////// //

    async login(formData: FormData) {
        let response: any = await axios.post(`${this.host}/authentication/login/`, formData,
            {
                headers: this.headers,
            })
        if (response?.data?.success) {
            return response?.data;
        }
        return response?.data;
    }


    async logout() {
        let response: any = await this.axiosInstance.post(`/authentication/logout/`, {},
            {
                headers: this.headers,
            }).then((value: any) => {
                sessionStorage.clear();
                localStorage.clear();
                return value;
            })

        return response.data;
    }

    async refresh() {
        let response: any = await axios.post(`${this.host}/authentication/refresh/`, {},
            {
                headers: this.headers,
            }).then((value: any) => {
                return value;
            })

        return response.data;
    }

    // /////////////////////////////////////////////////////////////////////////////////////////////////////// //

    async requestPasswordReset(data: FormData) {
        let response = await axios.post(`${this.host}/authentication/request-password-reset/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // /////////////////////////////////////////////////////////////////////////////////////////////////////// //

    async resetPassword(data: FormData) {
        let response = await axios.post(`${this.host}/authentication/reset-password/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // /////////////////////////////////////////////////////////////////////////////////////////////////////// //

    async finalizeAccountSetup(data: FormData) {
        let response = await axios.post(`${this.host}/authentication/finalize-account-setup/`, data,
            {
                headers: this.headers,
            })

        return response.data;
    }

    // /////////////////////////////////////////////////////////////////////////////////////////////////////// //

    commaSeparateNumber(input: number) {
        return input.toLocaleString();
    }

    capitalizeString(string: string) {
        return string?.replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
    };

    // /////////////////////////////////////////////////////////////////////////////////////////////////////// //

    abortRequest() {
        this.controller.abort();
    }

}