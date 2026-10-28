export async function exportToGoogleSheets(
  accessToken: string,
  reportName: string,
  rows: any[][],
) {
  const { google } = await import("googleapis");
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const fileMetadata = {
      name: reportName,
      mimeType: "application/vnd.google-apps.spreadsheet",
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, webViewLink",
    });

    const spreadsheetId = file.data.id;
    const webViewLink = file.data.webViewLink;

    if (!spreadsheetId) {
      throw new Error("Gagal membuat Spreadsheet di Google Drive");
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });

    return { spreadsheetId, webViewLink };
  } catch (error) {
    console.error("Google Drive API Error:", error);
    throw new Error("Terjadi kesalahan saat mengekspor ke Google Drive.");
  }
}
