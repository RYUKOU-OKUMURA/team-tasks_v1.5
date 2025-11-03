/**
 * Serves the main HTML page
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('dist/index-inline')
    .setTitle('Team Tasks')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
