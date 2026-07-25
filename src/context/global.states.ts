import { atom } from "recoil";

export const theme = atom({
    key: 'theme',
    default: 'dark'
})

export const systemGlobalLoadingIndicator = atom({
    key: 'systemGlobalLoadingIndicator',
    default: false,
})

export const systemGlobalToastMessage = atom({
    key: 'systemGlobalToastMessage',
    default: {
        'success': false,
        'message': ''
    },
})