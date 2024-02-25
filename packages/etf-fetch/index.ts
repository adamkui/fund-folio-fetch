import { createModuleLogger } from '@fund-folio-fetch/logger';
import { asyncForEach } from '@fund-folio-fetch/utils';
import axios from 'axios';
import { load } from 'cheerio';
import dotenv from 'dotenv';
import { once } from 'events';
import fs from 'fs';
import { homedir } from 'os';

dotenv.config();
const logger = createModuleLogger('ETF-FETCH');

const ETF_ARR_BY_ISIN = process.env.ETF_ARR_BY_ISIN.split(',');
const ETF_ARR_LENGTH = ETF_ARR_BY_ISIN.length;
const ETF_DB_SEARCH_BASE_URL = 'https://www.justetf.com/en/etf-profile.html?isin=';
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.toLocaleString('default', { month: 'short' });
const FACT_SHEETS_FOLDER_PATH = `${homedir}/documents/fact-sheets`;
const ETF_FOLDER_PATH = `${FACT_SHEETS_FOLDER_PATH}/etf`;
const CURRENT_YEAR_FOLDER = `${ETF_FOLDER_PATH}/${CURRENT_YEAR}`;
const CURRENT_MONTH_FOLDER = `${CURRENT_YEAR_FOLDER}/${CURRENT_MONTH}`;
const FOLDERS_TO_CHECK = [FACT_SHEETS_FOLDER_PATH, ETF_FOLDER_PATH, CURRENT_YEAR_FOLDER, CURRENT_MONTH_FOLDER];
const FACTSHEET_ANCHOR_QUERY = `div.documentslist a:contains('Factsheet')`;

(async () => {
  logger.info('ETF collector started!');

  FOLDERS_TO_CHECK.forEach((folderPath) => {
    if (!fs.existsSync(folderPath)) {
      logger.info(`Creating folder: ${folderPath}`);
      fs.mkdirSync(folderPath);
    }
  });

  logger.info(`Found ${ETF_ARR_LENGTH} ETF to process: ${ETF_ARR_BY_ISIN}`);

  asyncForEach(ETF_ARR_BY_ISIN, async (etfByIsin, index) => {
    const loggerIndex = `${index + 1}/${ETF_ARR_LENGTH}`;
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
      const fileStream = fs.createWriteStream(filePath);
      const downloadedDocument = await axios.get(documentURL, { responseType: 'stream' });

      downloadedDocument.data.pipe(fileStream);

      const finishPromise = once(fileStream, 'finish');

      await finishPromise.then(() => {
        fileStream.close();
        logger.info(`${loggerProcessing}: Document succesfully downloaded to: ${filePath}`);
        logger.info(`${loggerProcessing}: ${etfByIsin} finished`);
        return 1;
      });
    } catch (error) {
      logger.error(`An error has occured processing ${loggerIndex}, skipping document`, error);
    } finally {
      if (index === ETF_ARR_LENGTH - 1) {
        logger.info(`Completed processing ${ETF_ARR_LENGTH} ETFs`);
        logger.info('ETF collector finished!');
      }
    }
  });
})();
