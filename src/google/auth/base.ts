import * as google from 'googleapis'

export interface AuthClient {
    getAuthHeadersClient(): google.Auth.GoogleAuth | google.Auth.OAuth2Client
}
