import * as google from 'googleapis';

import { AuthClient } from './base';

export default class ServiceAccountGoogleAuthClient implements AuthClient {
    private auth!: google.Auth.GoogleAuth;

    private constructor(auth: google.Auth.GoogleAuth) {
        this.auth = auth;
    }

    public static fromServiceAccountInfo(serviceAccountInfo: google.Auth.JWTInput, scopes: string[]): ServiceAccountGoogleAuthClient {
        const jsonAuthClient = new google.Auth.GoogleAuth().fromJSON(serviceAccountInfo);
        const authClient = new google.Auth.GoogleAuth({
            authClient: jsonAuthClient,
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

    public getAuth(): google.Auth.GoogleAuth {
        return this.auth!;
    }
}