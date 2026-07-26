import { useContext } from 'react';
import AuthContext from '../context/authProvider';

const useAuth = (): any => {

    return useContext(AuthContext);
}
 
export default useAuth;