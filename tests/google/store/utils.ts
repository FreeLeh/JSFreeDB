import { Wrapper } from '../../../src/google/sheets/wrapper'

export function getIntegrationTestInfo(): {
    spreadsheetId: string;
    authJson: string;
    runIntegration: boolean;
} {
    const spreadsheetId = process.env.INTEGRATION_TEST_SPREADSHEET_ID || '';
    const authJson = process.env.INTEGRATION_TEST_AUTH_JSON || '';
    const isGithubActions = !!process.env.GITHUB_ACTIONS;
    const runIntegration = isGithubActions && Boolean(spreadsheetId) && Boolean(authJson);

    return { spreadsheetId, authJson, runIntegration };
}

export async function deleteSheets(
    wrapper: Wrapper,
    spreadsheetId: string,
    sheetNames: string[]
): Promise<void> {
    const sheetNameToId = await wrapper.getSheetNameToID(spreadsheetId);

    const sheetIds = sheetNames.map(name => {
        const id = sheetNameToId[name];
        if (id === undefined) {
            throw new Error(`Sheet ID for name "${name}" not found`);
        }
        return id;
    });

    try {
        await wrapper.deleteSheets(spreadsheetId, sheetIds);
    } catch (err: any) {
        console.warn(`Failed deleting sheets: ${err.message || err}`);
    }
}