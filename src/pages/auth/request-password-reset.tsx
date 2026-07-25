import CustomTextField from "../../components/text-field";
import { useState } from "react";

export default function RequestPasswordReset() {

    const [email, setEmail] = useState('');
    const [isLoading, _setIsLoading] = useState(false);
    const [error, _setError] = useState<{ email: string | null, response: { message: string | null, success: boolean } }>({
        email: null,
        response: {
            message: null,
            success: false
        }
    });

    const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    }

    return (
        <div>
            <h4>Request Password Reset</h4>
            <small>Enter your email address and we will send you a link to reset your password</small>
            <form onSubmit={handleSubmit}>
                <CustomTextField
                    required
                    disabled={isLoading}
                    className="w-100"
                    label="Email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={onEmailChange}
                    onError={onEmailChange}
                    error={error.email !== null}
                    helperText={error.email ?? ''}
                />
                <button type="submit">Request Password Reset</button>
            </form>
        </div>
    );
}
