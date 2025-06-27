import crypto from 'crypto';

interface LoginResponse {
    isok: boolean;
    data?: {
        code: string;
    };
    errors?: {
        wrong_credentials?: string;
    };
}

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export async function loginShelly(email: string, passwordPlain: string): Promise<string> {
    // Generar SHA1 de la contraseña
    const sha1 = crypto
        .createHash('sha1')
        .update(passwordPlain)
        .digest('hex');

    const formData = new URLSearchParams({
        email,
        password: sha1,
        client_id: 'shelly-diy'
    });

    const response = await fetch('https://api.shelly.cloud/oauth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
    });

    const data: LoginResponse = await response.json();

    if (!data.isok || !data.data?.code) {
        throw new Error(data.errors?.wrong_credentials || 'Error al autenticar con Shelly');
    }

    return data.data.code;
}

export function decodeUserApiUrl(code: string): string {
    // El código JWT tiene 3 partes separadas por puntos
    const parts = code.split('.');
    if (parts.length !== 3) {
        throw new Error('Código de autorización inválido');
    }

    // Decodificar la segunda parte (payload)
    const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    // Agregar padding si es necesario
    const paddedPayload = payload + '=='.substring(0, (4 - payload.length % 4) % 4);
    
    const decodedPayload = JSON.parse(
        Buffer.from(paddedPayload, 'base64').toString('utf-8')
    );

    if (!decodedPayload.user_api_url) {
        throw new Error('No se encontró user_api_url en el código');
    }

    return decodedPayload.user_api_url;
}

export async function getShellyTokens(apiHost: string, code: string): Promise<TokenResponse> {
    const formData = new URLSearchParams({
        client_id: 'shelly-diy',
        grant_type: 'code',
        code
    });

    const response = await fetch(`${apiHost}/oauth/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
    });

    if (!response.ok) {
        throw new Error(`Error al obtener tokens: ${response.status}`);
    }

    const data: TokenResponse = await response.json();

    if (!data.access_token || !data.refresh_token) {
        throw new Error('Respuesta de tokens incompleta');
    }

    return data;
}

export async function refreshShellyToken(apiHost: string, refreshToken: string): Promise<TokenResponse> {
    const formData = new URLSearchParams({
        client_id: 'shelly-diy',
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });

    const response = await fetch(`${apiHost}/oauth/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
    });

    if (!response.ok) {
        throw new Error(`Error al refrescar token: ${response.status}`);
    }

    return response.json();
} 