import * as google from 'googleapis';
import { authenticate } from '@google-cloud/local-auth'

import * as fs from 'fs';
import { AuthClient } from './base';

export class Oauth2GoogleAuthClient implements AuthClient {
    private auth!: google.Auth.OAuth2Client;

    private constructor(auth: google.Auth.OAuth2Client) {
        this.auth = auth;
    }

    public static async fromFile(
        secretFilePath: string,
        credsFilePath: string,
        scopes: string[],
    ): Promise<Oauth2GoogleAuthClient> {
        const storedClient = await this.loadCredsIfExists(credsFilePath);
        if (storedClient) {
            return new Oauth2GoogleAuthClient(storedClient);
        }

        const newClient = await authenticate({
            scopes: scopes,
            keyfilePath: secretFilePath,
        });

        if (newClient.credentials) {
            await this.storeCredentials(secretFilePath, credsFilePath, newClient);
        }
        return new Oauth2GoogleAuthClient(newClient);
    }

    private static async loadCredsIfExists(credsFilePath: string): Promise<google.Auth.OAuth2Client | null> {
        try {
            const content = await fs.promises.readFile(credsFilePath);
            const credentials = JSON.parse(content.toString());
            return google.google.auth.fromJSON(credentials) as google.Auth.OAuth2Client;
        } catch (err) {
            return null;
        }
    }

    private static async storeCredentials(
        secretFilePath: string,
        credsFilePath: string,
        client: google.Auth.OAuth2Client,
    ) {
        const content = await fs.promises.readFile(secretFilePath);
        const keys = JSON.parse(content.toString());
        const key = keys.installed || keys.web;
        const payload = JSON.stringify({
            type: 'authorized_user',
            client_id: key.client_id,
            client_secret: key.client_secret,
            refresh_token: client.credentials.refresh_token,
        });
        await fs.promises.writeFile(credsFilePath, payload);
    }

    public getAuthHeadersClient(): google.Auth.GoogleAuth | google.Auth.OAuth2Client {
        return this.auth!;
    }
}