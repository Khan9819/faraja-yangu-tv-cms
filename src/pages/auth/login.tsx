import { Alert, CircularProgress, IconButton } from "@mui/material";
import CustomTextField from "../../components/text-field";
import { useRef, useState } from "react";
import { RiEyeCloseFill } from "react-icons/ri";
import { RiEyeFill } from "react-icons/ri";
import { Link } from "react-router-dom";
import useApiServices from "../../hooks/useAPI";
import API from "../../services/api.services";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Login() {

    const navigate = useNavigate();
    const api: API = useApiServices();
    const { setAuth } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Remove this and replace with loading state from auth provider
    const [error, setError] = useState<{ email: string | null, password: string | null, response: { message: string | null, success: boolean } }>({
        email: null,
        password: null,
        response: {
            message: null,
            success: false
        }
    });

    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // formRef.current?.requestSubmit();
        // get form validation error messages
        const error = formRef.current?.reportValidity();

        if (!error) return;

        setError((prev: any) => {
            return {
                ...prev,
                response: {
                    message: null,
                    success: false
                }
            }
        })

        setIsLoading(true);

        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.login(formData).catch((error: any) => {
            console.log(error)
            setError((prev: any) => {
                return {
                    ...prev,
                    response: {
                        message: error?.response?.data?.message,
                        success: false
                    }
                }
            })
        });

        if(response?.success){
            setAuth(response?.data);
            sessionStorage.setItem('auth', JSON.stringify(response?.data));
            navigate('/');
        }
        
        setIsLoading(false);
    }

    const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }

    const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }

    return (
        <div>
            <h4>Login</h4>
            <small>Enter your credentials to login</small>
            {error.response?.message && <Alert severity="error">{error.response?.message}</Alert>}
            <form ref={formRef} action="" className="d-flex flex-column gap-4 my-4">
                <CustomTextField required disabled={isLoading} label="Username" name="username" type="email" value={email} onChange={onEmailChange} onError={onEmailChange} error={error.email !== null} helperText={error.email ?? ''} />
                <div className="w-100 d-flex justify-content-between align-items-center">
                    <CustomTextField
                        required
                        disabled={isLoading}
                        className="w-100"
                        label="Password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={onPasswordChange}
                        onError={onPasswordChange}
                        error={error.password !== null}
                        helperText={error.password ?? ''}
                    />
                    <IconButton size="small" onClick={() => { setShowPassword(!showPassword) }}>
                        {showPassword ? <RiEyeFill /> : <RiEyeCloseFill />}
                    </IconButton>
                </div>
                <button type="submit" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? <CircularProgress size={20} /> : 'Login'}
                </button>
                <small>Forgot your password? <Link to={isLoading ? "#" : "/request-password-reset"}>Request Password Reset</Link></small>
            </form>
        </div>
    );
}
