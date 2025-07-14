import { axios } from "@pipedream/platform"
import googleSheets from "@pipedream/google_sheets"

export default defineComponent({
  name: "Store Stock Recommendations in Google Sheets",
  description: "Store multiple Indian stock trading recommendations in Google Sheets with timestamp, technical indicators, and analysis",
  type: "action",
  props: {
    googleSheets,
    drive: {
      type: "string",
      label: "Drive",
      description: "Defaults to `My Drive`. To select a Shared Drive instead, select it from this list.",
      optional: true,
      default: "My Drive"
    },
    sheetId: {
      type: "string",
      label: "Spreadsheet ID",
      description: "Select a spreadsheet or provide a spreadsheet ID"
    },
    worksheetId: {
      type: "string",
      label: "Worksheet ID", 
      description: "Select a worksheet or provide a worksheet ID"
    }
  },
  async run({ steps, $ }) {
    // Get recommendations from previous step
    const recommendations = steps.generate_multiple_recommendations.$return_value.recommendations;
    
    if (!recommendations || !Array.isArray(recommendations)) {
      throw new Error("No recommendations data provided from previous step");
    }

    // Define headers for the spreadsheet
    const headers = [
      "Timestamp",
      "Symbol",
      "Current Price",
      "RSI Value",
      "RSI Signal",
      "SMA Data",
      "Support Level",
      "Resistance Level",
      "AI Analysis",
      "Trading Metrics"
    ];

    // Format data for Google Sheets
    const rows = recommendations.map(rec => [
      rec.timestamp || new Date().toISOString(),
      rec.symbol,
      rec.currentPrice?.toString() || "",
      rec.technicalIndicators?.rsi?.value?.toString() || "",
      rec.technicalIndicators?.rsi?.signal || "",
      JSON.stringify(rec.technicalIndicators?.sma || {}),
      rec.technicalIndicators?.supportLevel?.toString() || "",
      rec.technicalIndicators?.resistanceLevel?.toString() || "",
      rec.aiAnalysis || "",
      JSON.stringify(rec.tradingMetrics || {})
    ]);

    // Insert headers if sheet is empty
    const sheetData = await googleSheets.getSpreadsheetValues({
      $,
      spreadsheetId: this.sheetId,
      range: this.worksheetId,
    });

    let allRows = [];
    if (!sheetData?.values?.length) {
      allRows = [headers, ...rows];
    } else {
      allRows = rows;
    }

    // Update Google Sheet
    const response = await googleSheets.updateSpreadsheetValues({
      $,
      spreadsheetId: this.sheetId,
      range: this.worksheetId,
      values: allRows,
      valueInputOption: "USER_ENTERED",
    });

    $.export("$summary", `Stored ${rows.length} stock recommendations in Google Sheets`);

    return {
      totalRecommendations: rows.length,
      updatedRange: response.updatedRange,
      updatedRows: response.updatedRows,
      processedAt: new Date().toISOString()
    };
  }
});
