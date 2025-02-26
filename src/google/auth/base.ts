import * as google from 'googleapis';

export interface AuthClient {
    getAuth(): google.Auth.GoogleAuth
}
