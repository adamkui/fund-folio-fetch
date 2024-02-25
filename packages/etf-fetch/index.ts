import { createModuleLogger } from '@fund-folio-fetch/logger';
import axios from 'axios';
import { load } from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import { homedir } from 'os';

dotenv.config();
const logger = createModuleLogger('ETF-FETCH');

const ETF_LIST_BY_ISIN = process.env.ETF_LIST_BY_ISIN.split(',');
const ETF_LIST_LENGTH = ETF_LIST_BY_ISIN.length;
const ETF_DB_SEARCH_BASE_URL = 'https://www.justetf.com/en/etf-profile.html?isin=';
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.toLocaleString('default', { month: 'short' });
const TEMP_FOLDER_PATH = `${homedir}/documents/etf-fact-sheets-output`;
const CURRENT_YEAR_FOLDER = `${TEMP_FOLDER_PATH}/${CURRENT_YEAR}`;
const CURRENT_MONTH_FOLDER = `${CURRENT_YEAR_FOLDER}/${CURRENT_MONTH}`;
const FOLDERS_TO_CHECK = [TEMP_FOLDER_PATH, CURRENT_YEAR_FOLDER, CURRENT_MONTH_FOLDER];
const FACTSHEET_ANCHOR_QUERY = `div.documentslist a:contains('Factsheet')`;

(async () => {
  logger.info('Hello there, ETF collector started!');

  FOLDERS_TO_CHECK.forEach((folderPath) => {
    if (!fs.existsSync(folderPath)) {
      logger.info(`Creating folder: ${folderPath}`);
      fs.mkdirSync(folderPath);
    }
  });

  logger.info(`Found ${ETF_LIST_LENGTH} ETF to process: ${ETF_LIST_BY_ISIN}`);

  ETF_LIST_BY_ISIN.forEach(async (etfByIsin, index) => {
    const loggerIndex = `${index + 1}/${ETF_LIST_LENGTH}`;
    const loggerProcessing = `Processing ${loggerIndex}`;
    const etfDbSearchUrl = `${ETF_DB_SEARCH_BASE_URL}${etfByIsin}`;

    logger.info(`${loggerProcessing}: ${etfByIsin} started`);

    try {
      logger.info(`${loggerProcessing}: gathering data from ${etfDbSearchUrl}`);

      const overviewWebsite = await axios.get(etfDbSearchUrl);
      const $ = load(overviewWebsite.data);
      const documentTitle = $('h1#etf-title').text();
      const documentURL = $(FACTSHEET_ANCHOR_QUERY).attr().href;

      logger.info(`${loggerProcessing}: found document title ${documentTitle} and document URL: ${documentURL}`);
      logger.info(`${loggerProcessing}: downloading document from ${documentURL}`);
      const filePath = `${CURRENT_MONTH_FOLDER}/${documentTitle}.pdf`;

      const file = fs.createWriteStream(filePath);
      const downloadedDocument = await axios.get(documentURL, { responseType: 'stream' });

      downloadedDocument.data.pipe(file);

      file.on('finish', () => {
        file.close();
        logger.info(`${loggerProcessing}: Document succesfully downloaded to: ${filePath}`);
      });
    } catch (error) {
      logger.error(`An error has occured processing ${loggerIndex}, skipping document`, error);
    }
  });

  logger.info(`Completed processing ${ETF_LIST_LENGTH} ETF`);
  logger.info('Have a nice day, ETF collector finished!');
})();
