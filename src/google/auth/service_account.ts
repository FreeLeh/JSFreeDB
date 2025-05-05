import * as google from 'googleapis';

import { AuthClient } from './base';

export class ServiceAccountGoogleAuthClient implements AuthClient {
    private auth!: google.Auth.GoogleAuth;

    private constructor(auth: google.Auth.GoogleAuth) {
        this.auth = auth;
    }

    public static fromServiceAccountInfo(serviceAccountInfo: google.Auth.JWTInput, scopes: string[]): ServiceAccountGoogleAuthClient {
        const authClient = new google.Auth.GoogleAuth({
            credentials: serviceAccountInfo,
            scopes: scopes,
        });
        return new ServiceAccountGoogleAuthClient(authClient);
    }

    public static fromServiceAccountFile(serviceAccountFile: string, scopes: string[]): ServiceAccountGoogleAuthClient {
        const authClient = new google.Auth.GoogleAuth({
            keyFile: serviceAccountFile,
            scopes: scopes,
        });
        return new ServiceAccountGoogleAuthClient(authClient);
    }

    public getAuthHeadersClient(): google.Auth.GoogleAuth | google.Auth.OAuth2Client {
        return this.auth!;
    }
}